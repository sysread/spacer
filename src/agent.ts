import data from './data';
import Ship from './ship';
import { NavComp } from './navcomp';
import { TransitPlan, SavedTransitPlan } from './transitplan';
import { Person, SavedPerson } from './person';
import { watch, GameTurn } from "./events";
import * as t from './common';
import * as util from './util';


// Shims for global browser objects
declare var console: any;
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
  readonly profit:  number; // net profit per turn
  readonly transit: TransitPlan;
  count:            number; // might not be able to buy that amount
}

interface Job {
  readonly action:   'job';
  readonly location: t.body;
  readonly task:     t.Work;
  turns:             number;
  days:              number;
}

interface Docked {
  readonly action:   'docked';
  readonly location: t.body;
}

type action = Docked | Job | Route;


function isDocked(action: action): action is Docked {
  return (<Docked>action).action == 'docked';
}

function isJob(action: action): action is Job {
  return (<Job>action).action == 'job';
}

function isRoute(action: action): action is Route {
  return (<Route>action).action == 'route';
}


export class Agent extends Person {
  action: action;

  constructor(opt: SavedAgent) {
    super(opt);

    const action = opt.action;

    if (action != undefined) {
      if (isRoute(action)) {
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

    watch("turn", (ev: GameTurn) => {
      if (window.game.turns > data.initial_days * data.turns_per_day && ev.detail.isNewDay)
        this.turn()

      return {complete: false};
    });
  }

  turn() {
    if (isDocked(this.action)) {
      // Money to burn?
      if (this.money > data.max_agent_money) {
        this.buyLuxuries();
      }

      // fully refueled!
      if (this.refuel()) {
        if (this.here.hasTradeBan) {
          const transit = this.findAlternateMarket();

          if (transit != undefined) {
            this.action = {
              action:  'route',
              dest:    transit.dest,
              transit: new TransitPlan(transit),
              item:    'water', // doesn't matter since the count is 0
              count:   0,
              profit:  0,
            };

            return;
          }
        }
        else {
          // select a route
          const routes = this.profitableRoutes();

          if (routes.length > 0) {
            // buy the goods to transport
            const { item, count } = routes[0];
            const [bought, price] = this.here.buy(item, count, this);

            if (bought != routes[0].count) {
              throw new Error(`${bought} != ${count}`);
            }

            // switch to the new action
            this.action = routes[0];

            return;
          }
        }
      }

      // still here? then find a job and wait for profitability to happen
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

  // Returns a 'Docked' action for the given location
  dock(here: t.body): Docked {
    return {
      action:   'docked',
      location: here,
    };
  }

  get here() {
    if (isDocked(this.action) || isJob(this.action)) {
      return window.game.planets[this.action.location];
    } else {
      throw new Error('not docked');
    }
  }

  // Returns true if the ship was fully refueled
  refuel() {
    if (isDocked(this.action)) {
      const fuelNeeded = this.ship.refuelUnits();
      const price      = this.here.fuelPricePerTonne(this);

      if (fuelNeeded > 0 && this.money > (fuelNeeded * price)) {
        const [bought, paid] = this.here.buy('fuel', fuelNeeded);
        const need = fuelNeeded - bought;
        const total = paid + (need * price);

        this.debit(total);
        this.ship.refuel(fuelNeeded);
      }
    }

    return this.ship.refuelUnits() == 0;
  }

  findWork() {
    // If no job, attempt to find one
    // TODO what to do if there are no jobs?
    // TODO account for strikes
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

  buyLuxuries() {
    if (isDocked(this.action)) {
      const here = window.game.planets[this.action.location];
      const want = Math.ceil((this.money - 1000) / here.buyPrice('luxuries', this));
      const [bought, price] = here.buy('luxuries', want);
      this.debit(price);
      //console.debug(`agent: bought ${bought} luxuries for ${price} on ${this.here.name}`);
    }
  }

  // Returns true if any action was performed
  workTurn() {
    if (isJob(this.action)) {
      if (--this.action.turns == 0) {
        const result = this.here.work(this, this.action.task, this.action.days);

        // Credit agent for the word completed
        this.credit(result.pay);
        //console.debug(`agent: worked ${this.action.task.name} for ${result.pay} on ${this.here.name}`);

        // Sell any harvested resources to the market
        for (const item of result.items.keys()) {
          const [amount, price, standing] = this.here.sell(item, result.items.count(item));
          this.incStanding(this.here.faction.abbrev, standing);
          this.credit(price);
        }

        // Restore "Docked" action
        this.action = this.dock(this.action.location);
      }

      return true;
    }

    return false;
  }

  // Returns true if any action was performed
  transitTurn() {
    if (isRoute(this.action)) {
      this.action.transit.turn();
      this.ship.burn(this.action.transit.accel);

      if (this.action.transit.left == 0) {
        const action = this.action;

        // Arrive
        this.action = this.dock(action.dest);

        // Sell cargo
        if (action.count > 0) {
          const [amt, price, standing] = this.here.sell(action.item, action.count, this);
          //console.debug(`agent: sold ${action.count} units of ${action.item} for ${util.csn(price)} on ${action.dest}`);
        }
      }

      return true;
    }

    return false;
  }

  profitableRoutes() {
    const routes: Route[] = [];

    if (isDocked(this.action)) {
      const game = window.game;
      const here = this.here;
      const cargoSpace = this.ship.cargoLeft;

      const navComp = new NavComp(this, this.here.body);
      navComp.dt = 10;

      for (const item of t.resources) {
        const stock    = here.getStock(item);
        const buyPrice = here.buyPrice(item, this);
        const canBuy   = Math.min(stock, cargoSpace, Math.floor(this.money / buyPrice));

        if (canBuy == 0) {
          continue;
        }

        for (const dest of t.bodies) {
          if (game.planets[dest].hasTradeBan)
            continue;

          const sellPrice     = game.planets[dest].sellPrice(item);
          const profitPerUnit = sellPrice - buyPrice;

          if (profitPerUnit <= 0) {
            continue;
          }

          const transit = navComp.getFastestTransitTo(dest);

          if (transit == undefined) {
            continue;
          }

          const fuelPrice   = game.planets[dest].fuelPricePerTonne(this);
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
