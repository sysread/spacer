import data from './data';
import Ship from './ship';
import { NavComp } from './navcomp';
import { TransitPlan, SavedTransitPlan } from './transitplan';
import { Person, SavedPerson } from './person';
import * as t from './common';
import * as util from './util';


// Shims for global browser objects
declare var window: { game: any; }
declare var console: any;


interface SavedRoute {
  readonly dest: t.body;
  readonly item: t.resource;
  readonly profit: number;
  readonly transit: SavedTransitPlan;
  count: number;
}

interface Route {
  readonly dest: t.body;
  readonly item: t.resource;
  readonly profit: number; // net profit per turn
  readonly transit: TransitPlan;
  count: number; // might not be able to buy that amount
}

interface Job {
  readonly location: t.body;
  readonly task: t.Work;
  turns: number;
  days: number;
}

type docked = t.body;

type action = docked | Route | Job | SavedRoute;

function isDocked(action: action): action is docked {
  return typeof (<docked>action) == 'string';
}

function isJob(action: action): action is Job {
  return (<Job>action).task != undefined;
}

function isRoute(action: action): action is Route {
  return (<Route>action).transit != undefined;
}


export interface SavedAgent extends SavedPerson {
  readonly action?: action;
}


export class Agent extends Person {
  action: action;

  constructor(opt: SavedAgent) {
    super(opt);

    const action = opt.action;

    if (action != undefined) {
      if (isRoute(action)) {
        this.action = {
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
      this.action = this.home;
    }
  }

  turn() {
    if (isDocked(this.action)) {
      // fully refueled!
      if (this.refuel()) {
        // select a route
        const routes = this.profitableRoutes();

        if (routes.length > 0) {
          // buy the goods to transport
          const here = window.game.planets[this.action];
          const { item, count } = routes[0];
          const [bought, price] = here.buy(item, count, this);

          if (bought != routes[0].count) {
            throw new Error(`${bought} != ${count}`);
          }

          // switch to the new action
          this.action = routes[0];

          return;
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

  // Returns true if the ship was fully refueled
  refuel() {
    if (isDocked(this.action)) {
      const planet     = window.game.planets[this.action];
      const fuelNeeded = this.ship.refuelUnits();
      const price      = planet.buyPrice('fuel', this);

      if (fuelNeeded > 0 && this.money > (fuelNeeded * price)) {
        const [bought, paid] = planet.buy('fuel', fuelNeeded);
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
      const loc = window.game.planets[this.action];
      const job = util.oneOf(loc.work_tasks) as t.Work;

      if (job) {
        const days  = 3;
        const turns = days * data.turns_per_day;

        this.action = {
          location: this.action,
          task:     job,
          days:     days,
          turns:    turns,
        };
      }
    }
  }

  // Returns true if any action was performed
  // TODO sell acquired resources to market
  workTurn() {
    if (isJob(this.action)) {
      if (--this.action.turns == 0) {
        const planet = window.game.planets[this.action.location];
        const result = planet.work(this, this.action.task, this.action.days);

        // Credit agent for the word completed
        this.credit(result.pay);

        // Sell any harvested resources to the market
        for (const item of result.items.keys()) {
          const [amount, price, standing] = planet.sell(item, result.items.count(item));
          this.incStanding(planet.faction.abbrev, standing);
          this.credit(price);
        }

        // Restore "docked" action
        this.action = this.action.location;
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
        this.action = action.dest;

        // Sell cargo
        const planet = window.game.planets[this.action];
        const result = planet.sell(action.item, action.count, this);
        //console.log(`${this.name} sold ${action.count} units of ${action.item} to ${action.dest}; money now ${this.money}`);
      }

      return true;
    }

    return false;
  }

  profitableRoutes() {
    const routes: Route[] = [];

    if (isDocked(this.action)) {
      const game       = window.game;
      const here       = game.planets[this.action];
      const navComp    = new NavComp(this, here.body);
      const cargoSpace = this.ship.cargoLeft;

      for (const item of t.resources) {
        const stock    = here.getStock(item);
        const buyPrice = here.buyPrice(item, this);
        const canBuy   = Math.min(stock, cargoSpace, Math.floor(this.money / buyPrice));

        if (canBuy == 0) {
          continue;
        }

        for (const dest of t.bodies) {
          const sellPrice     = game.planets[dest].sellPrice(item);
          const fuelPrice     = game.planets[dest].buyPrice('fuel', this);
          const profitPerUnit = sellPrice - buyPrice;

          if (profitPerUnit <= 0) {
            continue;
          }

          const transit = navComp.getFastestTransitTo(dest);

          if (transit == undefined) {
            continue;
          }

          const fuelCost = transit.fuel * fuelPrice;
          const profit   = (profitPerUnit * canBuy - fuelCost) / transit.turns;

          if (profit > 0) {
            routes.push({
              dest:    dest,
              item:    item,
              count:   canBuy,
              profit:  profit,
              transit: transit,
            });
          }
        }
      }
    }

    return routes.sort((a, b) => a.profit < b.profit ? 1 : -1);
  }
}