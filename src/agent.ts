/**
 * agent - autonomous NPC merchant that trades between planets.
 *
 * Agents are background actors that simulate market activity. They buy goods
 * at cheap planets and sell them at expensive ones, taking jobs when no
 * profitable routes exist. They are driven by GameTurn events and act once
 * per game day (after the initial grace period).
 *
 * Action state machine:
 *   Docked  - at a planet; evaluates routes and buys goods, or finds a job
 *   Job     - working at the current planet for 3 days
 *   Route   - in transit; advances the TransitPlan each turn, sells on arrival
 *
 * Route selection (profitableRoutes):
 *   For every resource at the current planet, for every destination body:
 *   - Compute gross profit = (dest sell price - local buy price) * qty
 *   - Subtract estimated fuel cost at destination
 *   - Divide by transit turns -> net profit per turn
 *   - Only routes above data.min_agent_profit qualify
 *   - Sort descending by net profit; take the best one
 *
 * Blockade handling:
 *   If the current planet has a trade ban, the agent skips route selection
 *   and instead finds the closest unblockaded planet to relocate to.
 *
 * Money sink:
 *   When money exceeds data.max_agent_money, the agent buys luxuries to keep
 *   the economy from accumulating dead money.
 *
 * Agents are serialized with their current action so transit state survives
 * a save/load cycle.
 */

import data from './data';
import { NavComp } from './navcomp';
import { TransitPlan } from './transitplan';
import { Person, SavedPerson } from './person';
import { watch, GameTurn } from "./events";
import * as t from './common';
import * as util from './util';
import * as FastMath from './fastmath';


// Shims for global browser objects
declare var window: {
  game: any;
};


export interface SavedAgent extends SavedPerson {
  readonly action?: action;
}


interface Route {
  readonly action:  'route';
  readonly dest:    t.body;
  readonly item:    t.resource;
  readonly profit:  number;   // net profit per turn
  readonly transit: TransitPlan;
  count:            number;   // units purchased (may be less than planned)
}

interface Job {
  readonly action:   'job';
  readonly location: t.body;
  readonly task:     t.Work;
  turns:             number;  // turns remaining in current job
  days:              number;  // total days the job runs
}

interface Docked {
  readonly action:   'docked';
  readonly location: t.body;
}

type action = Docked | Job | Route;


function isDocked(action: action): action is Docked { return (<Docked>action).action == 'docked' }
function isJob(action: action):    action is Job    { return (<Job>action).action    == 'job' }
function isRoute(action: action):  action is Route  { return (<Route>action).action  == 'route' }


export class Agent extends Person {
  action: action;

  constructor(opt: SavedAgent) {
    super(opt);

    const action = opt.action;

    if (action != undefined) {
      if (isRoute(action)) {
        // Restore the TransitPlan object (was plain JSON in the save)
        this.action = {
          action:  'route',
          dest:    action.dest,
          item:    action.item,
          profit:  action.profit,
          transit: new TransitPlan(action.transit),
          count:   action.count,
        };
      }
      else {
        this.action = action;
      }
    }
    else {
      this.action = this.dock(this.home);
    }

    // Act once per day after the initial grace period (initial_days).
    watch("turn", (ev: GameTurn) => {
      if (window.game.turns > data.initial_days * data.turns_per_day && ev.detail.isNewDay)
        this.turn()

      return {complete: false};
    });
  }

  turn() {
    if (isDocked(this.action)) {
      if (this.money > data.max_agent_money) {
        this.buyLuxuries();
      }

      if (this.refuel()) {
        if (this.here.hasTradeBan) {
          const transit = this.findAlternateMarket();

          if (transit != undefined) {
            this.action = {
              action:  'route',
              dest:    transit.dest,
              transit: new TransitPlan(transit),
              item:    'water', // cargo doesn't matter since count is 0
              count:   0,
              profit:  0,
            };

            return;
          }
        }
        else {
          const routes = this.profitableRoutes();

          if (routes.length > 0) {
            const { item, count } = routes[0];
            const [bought] = this.here.buy(item, count, this);

            if (bought != routes[0].count) {
              throw new Error(`${bought} != ${count}`);
            }

            this.action = routes[0];
            return;
          }
        }
      }

      this.findWork();
    }

    if (isJob(this.action)) {
      this.workTurn();
      return;
    }

    if (isRoute(this.action)) {
      this.transitTurn();
      return;
    }
  }

  dock(here: t.body): Docked {
    return {
      action:   'docked',
      location: here,
    };
  }

  /** Returns the planet object for the agent's current docked location. */
  get here() {
    if (isDocked(this.action) || isJob(this.action)) {
      return window.game.planets[this.action.location];
    } else {
      throw new Error('not docked');
    }
  }

  /** Purchases fuel if affordable. Returns true when the tank is full. */
  refuel() {
    if (isDocked(this.action)) {
      const fuelNeeded = this.ship.refuelUnits();
      const price      = this.here.pricing.fuelPricePerTonne(this);

      if (fuelNeeded > 0 && this.money > (fuelNeeded * price)) {
        const [bought, paid] = this.here.buy('fuel', fuelNeeded);
        const need  = fuelNeeded - bought;
        const total = paid + (need * price);

        this.debit(total);
        this.ship.refuel(fuelNeeded);
      }
    }

    return this.ship.refuelUnits() == 0;
  }

  findWork() {
    // TODO: what to do if there are no jobs available?
    // TODO: account for labor strikes (a condition type)
    if (isDocked(this.action)) {
      const which = util.oneOf(this.here.work_tasks) as string;
      const job   = data.work.find(w => w.name == which);

      if (job) {
        const days  = 3;
        const turns = days * data.turns_per_day;

        this.action = {
          action:   'job',
          location: this.action.location,
          task:     job,
          days:     days,
          turns:    turns,
        };
      }
    }
  }

  /** Spends excess money on luxuries to prevent dead money accumulation. */
  buyLuxuries() {
    if (isDocked(this.action)) {
      const here = window.game.planets[this.action.location];
      const want = FastMath.ceil((this.money - 1000) / here.pricing.buyPrice('luxuries', this));
      const [, price] = here.buy('luxuries', want);
      this.debit(price);
    }
  }

  /** Advances the current job by one turn; completes and sells rewards on finish. */
  workTurn() {
    if (isJob(this.action)) {
      if (--this.action.turns == 0) {
        const result = this.here.work(this, this.action.task, this.action.days);

        this.credit(result.pay);

        for (const item of result.items.keys()) {
          const [, price, standing] = this.here.sell(item, result.items.count(item));
          this.incStanding(this.here.faction.abbrev, standing);
          this.credit(price);
        }

        this.action = this.dock(this.action.location);
      }

      return true;
    }

    return false;
  }

  /** Advances the in-progress transit by one turn; arrives and sells cargo on completion. */
  transitTurn() {
    if (isRoute(this.action)) {
      this.action.transit.turn();
      this.ship.burn(this.action.transit.accel);

      if (this.action.transit.left == 0) {
        const action = this.action;

        this.action = this.dock(action.dest);

        if (action.count > 0) {
          this.here.sell(action.item, action.count, this);
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Computes all routes that meet the minimum profit threshold.
   * Sorted descending by net profit per turn.
   */
  profitableRoutes() {
    const routes: Route[] = [];

    if (isDocked(this.action)) {
      const game       = window.game;
      const here       = this.here;
      const cargoSpace = this.ship.cargoLeft;

      const navComp = new NavComp(this, this.here.body);
      navComp.dt = 10;

      for (const item of t.resources) {
        const stock    = here.economy.getStock(item);
        const buyPrice = here.pricing.buyPrice(item, this);
        const canBuy   = Math.min(stock, cargoSpace, FastMath.floor(this.money / buyPrice));

        if (canBuy == 0) {
          continue;
        }

        for (const dest of t.bodies) {
          if (game.planets[dest].hasTradeBan)
            continue;

          const sellPrice     = game.planets[dest].pricing.sellPrice(item);
          const profitPerUnit = sellPrice - buyPrice;

          if (profitPerUnit <= 0) {
            continue;
          }

          const transit = navComp.getFastestTransitTo(dest);

          if (transit == undefined) {
            continue;
          }

          const fuelPrice   = game.planets[dest].pricing.fuelPricePerTonne(this);
          const fuelCost    = transit.fuel * fuelPrice;
          const grossProfit = profitPerUnit * canBuy;
          const netProfit   = (grossProfit - fuelCost) / transit.turns;

          if (netProfit >= data.min_agent_profit) {
            routes.push({
              action:  'route',
              dest:    dest,
              item:    item,
              count:   canBuy,
              profit:  netProfit,
              transit: transit,
            });
          }
        }
      }
    }

    return routes.sort((a, b) => a.profit < b.profit ? 1 : -1);
  }

  /**
   * When blocked by a trade ban, finds the nearest planet with no ban
   * and returns a transit plan to relocate there.
   */
  findAlternateMarket() {
    const navComp = new NavComp(this, this.here.body);
    navComp.dt = 10;

    let best: TransitPlan | undefined;

    for (const dest of t.bodies) {
      const transit = navComp.getFastestTransitTo(dest);

      if (transit == undefined)
        continue;

      if (best != undefined && best.turns > transit.turns) {
        best = transit;
      }
    }

    return best;
  }
}
