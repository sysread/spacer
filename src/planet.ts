/**
 * planet - the economic and social hub of each location in the solar system.
 *
 * Planet is the largest class in the game. It manages every aspect of a body's
 * economy and contract offerings, and is driven by the turn clock via watch("turn").
 *
 * ## Economy overview
 *
 * Each planet produces and consumes resources every turn. Production and consumption
 * rates are computed from three stacked sources, each scaled by planet size:
 *   1. Global market baseline (data.market.produces/consumes)
 *   2. Faction modifiers (faction.produces/consumes)
 *   3. Trait modifiers (trait.produces/consumes per active trait)
 *   4. Active Conditions (temporary modifiers added at runtime)
 *
 * Stock levels, supply history, and demand history are tracked per resource.
 * The `need` metric drives pricing and import/manufacturing decisions.
 *
 * ## Pricing
 *
 * price(item) computes a market price from:
 *   - Base resource value (from resource.ts)
 *   - Need factor: log(need) markup when demand exceeds supply, fractional when surplus
 *   - Trait adjustments (flat percentage off)
 *   - Scarcity markup for necessity goods (food, fuel, medicine)
 *   - Condition markup from active economic events
 *   - Clamped to [minPrice, maxPrice] from the resource definition
 *   - Availability markup based on distance to nearest net exporter
 *   - 5% fuzz for local variation
 *
 * Prices are cached per resource and invalidated on a random 3-12 day cycle
 * to avoid recomputing every turn.
 *
 * sellPrice() = price(). buyPrice() adds sales tax and subtracts standing bonus.
 *
 * ## Need metric
 *
 * getNeed(item) returns a dimensionless ratio comparing demand to effective supply:
 *   - supply proxy = (stock + 2*avg_supply) / 3 (weighted toward recent history)
 *   - need > 1: log(10*(1+n)) - escalating shortage signal
 *   - need < 1: d/s fraction - surplus signal
 *   - need = 1: balanced
 *
 * hasShortage/hasSurplus use configurable thresholds on the need value.
 * Net exporters have higher shortage thresholds (harder to trigger).
 *
 * ## Import and manufacture queues
 *
 * When a planet needs resources it can't produce locally, it either:
 *   - schedules an ImportTask (buys from the best exporter and simulates in-transit
 *     delivery over time using a turn countdown)
 *   - schedules a CraftTask (manufactures from raw materials in the local market)
 *
 * processQueue() counts down each task's turns and calls sell() when it arrives.
 * This makes goods appear in the market as if shipped or fabricated in real time.
 *
 * ## Turn structure (spread across the day)
 *
 * The turn() method uses a fall-through switch on (turn % turns_per_day) to
 * spread expensive operations across different turns in the day rather than
 * running everything at once:
 *   turn 0:  manufacture() - schedule craft tasks
 *   turn 1:  imports() - schedule import tasks
 *   turn 2:  refreshContracts(), replenishFabricators(), luxuriate(),
 *            apply_conditions(), rollups()
 *   default: produce(), consume(), processQueue() (every turn)
 *
 * ## Fabricators
 *
 * Planets have a limited fabrication capacity (fab_health) that decreases as
 * the planet uses its fabricators (both for background manufacture() and for
 * player-initiated fabrication). When health falls below 50%, the planet buys
 * cybernetics to replenish. Fabrication with low health takes longer and costs
 * more (craft_fee_nofab rate).
 *
 * ## Contracts
 *
 * Planets offer Passengers and Smuggler contracts. refreshContracts() is called
 * on arrival and periodically (but skipped during transit to save CPU).
 * Contracts expire after a random number of turns (valid_until).
 *
 * The contract restore hack (lines 163-181 in the original) defers contract
 * restoration to the first Arrived event so that all game objects are ready.
 * This is acknowledged as bad code in the original; it should be refactored
 * when planet.ts is decomposed.
 *
 * ## Patrol, piracy, and inspection
 *
 * These methods compute encounter probabilities based on faction parameters
 * scaled by planet size and trait modifiers, and decaying with distance.
 * See faction.ts for the base values and common.ts for the full description.
 */

import data    from './data';
import system  from './system';
import Physics from './physics';
import Store   from './store';
import History from './history';

import { Resource, Raw, Craft, isRaw, isCraft, resources } from './resource';
import { Trait } from './trait';
import { factions } from './faction';
import { Condition, SavedCondition } from './condition';
import { Mission, SavedMission, restoreMission, Passengers, Smuggler } from './mission';
import { Person } from './person';
import { Conflict, Blockade } from './conflict';
import { watch, trigger, GameTurn, Arrived, ItemsBought, ItemsSold } from './events';

import * as t from './common';
import * as util from './util';
import * as FastMath from './fastmath';

import {
  PlanetState,
  isImportTask, isCraftTask,
} from './planet/state';
import type { SavedPlanet, EconTask, ImportTask, CraftTask } from './planet/state';
import { Encounters } from './planet/encounters';
import { Work } from './planet/work';
import { Economy } from './planet/economy';
import { Pricing } from './planet/pricing';
import { Commerce } from './planet/commerce';
import { Fabrication } from './planet/fabrication';
import { Contracts as ContractsDelegate } from './planet/contracts';
import { Repair } from './planet/repair';

// Re-export for external consumers
export type { SavedPlanet };
export { isImportTask, isCraftTask };


declare var window: {
  game: any;
}


// Used by neededResources() to return prioritized import/craft demand.
interface NeededResources {
  prioritized: t.resource[];
  amounts:     { [key: string]: number };
}


// A contract is an offered mission with an expiry turn.
interface Contract {
  valid_until: number;  // game.turns after which the offer expires
  mission:     Mission;
}

export class Planet {
  state:       PlanetState;
  encounters:  Encounters;
  economy:     Economy;
  pricing:     Pricing;
  commerce:    Commerce;
  fabrication: Fabrication;
  contractMgr: ContractsDelegate;
  repair:      Repair;
  labor:       Work;

  constructor(body: t.body, init?: SavedPlanet) {
    this.state      = new PlanetState(body, init);
    this.encounters = new Encounters(this.state);
    this.economy    = new Economy(this.state);
    this.pricing    = new Pricing(this.state, this.economy,
      (body, item) => window.game.planets[body].economy.isNetExporter(item));
    this.commerce   = new Commerce(this.state, this.economy, this.pricing, this.encounters);
    this.fabrication = new Fabrication(this.state, this.pricing, this.commerce);
    this.contractMgr = new ContractsDelegate(this.state, () => this.neededResources());
    this.repair     = new Repair(this.state, this.economy);
    this.labor      = new Work(this.state, (item) => this.economy.production(item));

    // Deferred contract restoration: restoreMission() needs window.game,
    // which isn't ready during construction. Wait for the first Arrived event.
    if (init && init.contracts) {
      watch("arrived", (_ev: Arrived) => {
        if (init && init.contracts) {
          for (const info of init.contracts) {
            this.state.contracts.push({
              valid_until: info.valid_until,
              mission: restoreMission(info.mission, this.body),
            });
          }

          delete init.contracts;
        }

        return {complete: false};
      });
    }

    watch("turn", (ev: GameTurn) => {
      this.turn(ev.detail.turn);
      return {complete: false};
    });

    watch("arrived", (_ev: Arrived) => {
      this.contractMgr.refreshContracts();
      return {complete: false};
    });
  }

  // Delegate state access so the public API stays unchanged.
  // Planet methods and external callers continue using this.body, this.stock, etc.
  get body()           { return this.state.body; }
  get name()           { return this.state.name; }
  get size()           { return this.state.size; }
  get kind()           { return this.state.kind; }
  get central()        { return this.state.central; }
  get gravity()        { return this.state.gravity; }
  get traits()         { return this.state.traits; }
  get produces()       { return this.state.produces; }
  get consumes()       { return this.state.consumes; }
  get min_stock()      { return this.state.min_stock; }
  get avg_stock()      { return this.state.avg_stock; }
  get conditions()     { return this.state.conditions; }
  set conditions(v)    { this.state.conditions = v; }
  get work_tasks()     { return this.state.work_tasks; }
  get contracts()      { return this.state.contracts; }
  set contracts(v)     { this.state.contracts = v; }
  get max_fab_units()  { return this.state.max_fab_units; }
  get max_fab_health() { return this.state.max_fab_health; }
  get fab_health()     { return this.state.fab_health; }
  set fab_health(v)    { this.state.fab_health = v; }
  get stock()          { return this.state.stock; }
  get supply()         { return this.state.supply; }
  get demand()         { return this.state.demand; }
  get need()           { return this.state.need; }
  get pending()        { return this.state.pending; }
  get queue()          { return this.state.queue; }
  set queue(v)         { this.state.queue = v; }
  get _price()         { return this.state._price; }
  set _price(v)        { this.state._price = v; }
  get _cycle()         { return this.state._cycle; }
  set _cycle(v)        { this.state._cycle = v; }
  get _need()          { return this.state._need; }
  set _need(v)         { this.state._need = v; }
  get _exporter()      { return this.state._exporter; }
  set _exporter(v)     { this.state._exporter = v; }

  get faction()        { return this.state.faction; }

  /** Controls JSON.stringify output. Returns only the serializable state,
   * excluding delegates and transient caches. Without this, JSON.stringify
   * would traverse all delegate objects (each holding a PlanetState reference),
   * duplicating the state data 9x and blowing the localStorage quota. */
  toJSON() {
    return {
      conditions: this.state.conditions,
      stock:      this.state.stock,
      supply:     this.state.supply,
      demand:     this.state.demand,
      need:       this.state.need,
      pending:    this.state.pending,
      queue:      this.state.queue,
      contracts:  this.state.contracts,
    };
  }

  // ---------------------------------------------------------------------------
  // Turn processing
  // ---------------------------------------------------------------------------

  /**
   * Advances the planet's economy by one turn. Expensive operations are
   * spread across the day using a fall-through switch so not everything
   * runs on the same turn. The default case (every turn) handles the core
   * produce/consume/queue cycle.
   */
  turn(turn: number) {
    switch (turn % data.turns_per_day) {
      case 0:
        this.manufacture();     // schedule craft tasks from available materials

      case 1:
        this.imports();         // schedule import tasks from other planets

      case 2:
        // Contract refresh is skipped during transit (frozen game) since the
        // per-arrival watcher handles it when the player docks.
        if (!window.game.frozen && !window.game.transit_plan) {
          this.contractMgr.refreshContracts();
        }

        this.fabrication.replenishFabricators();  // buy cybernetics to restore fab health
        this.luxuriate();             // consume luxuries (economic sink)
        this.apply_conditions();      // advance and test for new conditions
        this.rollups(turn);           // update history and clear caches

      default:
        this.produce();         // add production output to stock
        this.consume();         // remove consumption from stock
        this.processQueue();    // deliver arrived imports and crafted goods
    }
  }

  /**
   * Updates supply/demand/need history and resets per-turn caches.
   * Price caches are invalidated on a staggered per-resource cycle (3-12 days)
   * to avoid all prices changing at once.
   */
  rollups(turn: number) {
    for (const item of this.stock.keys())
      this.economy.incSupply(item, this.economy.getStock(item));

    this.supply.rollup();
    this.demand.rollup();

    for (const item of this.need.keys())
      this.need.inc(item, this.economy.getNeed(item));

    this.need.rollup();

    this._need = {};

    for (const item of t.resources) {
      if (!this._cycle[item] || turn % this._cycle[item]) {
        delete this._price[item];
        this._cycle[item] = util.getRandomInt(3, 12) * data.turns_per_day;
      }
    }
  }

  clearNetExporterCache(items: t.ResourceCounter) {
    this.state.clearNetExporterCache(items);
  }

  // ---------------------------------------------------------------------------
  // Physical and faction properties (delegated to PlanetState)
  // ---------------------------------------------------------------------------

  get desc()        { return this.state.desc; }
  get position()    { return this.state.position; }
  get hasTradeBan() { return this.state.hasTradeBan; }

  distance(toBody: t.body)       { return this.state.distance(toBody); }
  hasTrait(trait: string)        { return this.state.hasTrait(trait); }
  hasCondition(condition: string) { return this.state.hasCondition(condition); }
  isCapitol()                    { return this.state.isCapitol(); }




  scale(n=0) { return this.state.scale(n); }

  // ---------------------------------------------------------------------------
  // Import and manufacture queue
  // ---------------------------------------------------------------------------

  /** Adds a task to the economy queue and reserves the item count in pending. */
  schedule(task: EconTask) {
    this.pending.inc(task.item, task.count);
    this.queue.push(task);
  }

  /**
   * Decrements each queued task's remaining turns. Tasks that expire call sell()
   * to add the goods to stock and release from pending. Rebuilds the queue array
   * in-place (faster than Array.filter for large queues).
   */
  processQueue() {
    const queue = this.queue;
    this.queue = [];

    for (const task of queue) {
      if (--task.turns > 0) {
        this.queue.push(task);
      }
      else {
        this.commerce.sell(task.item, task.count);
        this.pending.dec(task.item, task.count);
      }
    }
  }

  /** Target stock level for an item: at least min_stock, scaled by consumption rate. */
  avgStockWanted(item: t.resource) {
    const amount = FastMath.ceil(this.avg_stock * this.economy.consumption(item));
    return Math.max(this.min_stock, amount);
  }

  neededResourceAmount(item: Resource) {
    return FastMath.ceil(this.economy.getNeed(item.name) * 1.5);
  }

  /**
   * Returns all resources with positive need, sorted by urgency.
   * Urgency = log(price) * need, so high-value scarce goods are prioritized.
   */
  neededResources(): NeededResources {
    const amounts: { [key: string]: number } = {};
    const need:    { [key: string]: number } = {};

    for (const item of t.resources) {
      const amount = this.neededResourceAmount(resources[item]);

      if (amount > 0) {
        amounts[item] = amount;
        need[item] = Math.log(this.pricing.price(item)) * this.economy.getNeed(item);
      }
    }

    const prioritized = (Object.keys(amounts) as t.resource[]).sort((a, b) => {
      const diff = need[a] - need[b];
      return diff > 0 ? -1
           : diff < 0 ?  1
           : 0;
    });

    return {
      'prioritized': prioritized,
      'amounts':     amounts,
    };
  }

  /**
   * Returns all planets that are willing exporters of `item` to this market.
   * A planet qualifies if it has stock, is not in shortage, and is either in
   * surplus or a net exporter. Excludes this planet itself.
   */
  exporters(item: t.resource): t.body[] {
    return t.bodies.filter(name => {
      const p = window.game.planets[name];
      return name !== this.body
          && p.economy.getStock(item) >= 1
          && !p.economy.hasShortage(item)
          && (p.economy.hasSurplus(item) || p.economy.isNetExporter(item));
    });
  }

  /**
   * Selects the best exporter for `amount` units of `item`, balancing distance,
   * price, and available stock. Scores each candidate on all three axes relative
   * to the average across candidates; returns the highest composite score.
   *
   * Skips cross-faction sources when this planet has a trade ban.
   */
  selectExporter(item: t.resource, amount: number): t.body | void {
    const exporters = this.exporters(item);

    if (exporters.length === 0)
      return;

    const dist:  t.Counter = {};
    const price: t.Counter = {};
    const stock: t.Counter = {};
    for (const body of exporters) {
      if (window.game.planets[body].hasTradeBan)
        continue;

      dist[body]  = this.distance(body) / Physics.AU * window.game.planets[body].pricing.fuelPricePerTonne();
      price[body] = window.game.planets[body].pricing.buyPrice(item);
      stock[body] = Math.min(amount, window.game.planets[body].economy.getStock(item));
    }

    const avgDist  = Object.values(dist).reduce((a, b)  => {return a + b}, 0) / Object.values(dist).length;
    const avgPrice = Object.values(price).reduce((a, b) => {return a + b}, 0) / Object.values(price).length;
    const avgStock = Object.values(stock).reduce((a, b) => {return a + b}, 0) / Object.values(stock).length;

    const distRating:  t.Counter = {};
    const priceRating: t.Counter = {};
    const stockRating: t.Counter = {};
    for (const body of exporters) {
      distRating[body]  = avgDist  / dist[body];
      priceRating[body] = avgPrice / price[body];
      stockRating[body] = stock[body] / avgStock;
    }

    let bestPlanet: t.body | undefined = undefined;
    let bestRating = 0;

    const hasTradeBan = this.hasTradeBan;

    for (const body of exporters) {
      if (hasTradeBan && data.bodies[body].faction != this.faction.abbrev)
        continue;

      const rating = priceRating[body] * stockRating[body] * distRating[body];

      if (rating > bestRating) {
        bestRating = rating;
        bestPlanet = body;
      }
    }

    return bestPlanet;
  }

  /**
   * Returns how many units of a crafted item the planet can manufacture from
   * current stock, given that ingredient need must be lower than finished good need.
   * Returns 0 if any ingredient is in shortage or unavailable.
   */
  canManufacture(item: t.resource): number {
    const res = resources[item];
    const counts: number[] = [];

    if (isCraft(res)) {
      const need = this.economy.getNeed(item);

      for (const mat of Object.keys(res.recipe.materials) as t.resource[]) {
        if (this.economy.getNeed(mat) > need) {
          return 0;
        }

        const avail = this.economy.getStock(mat);

        if (avail == 0) {
          return 0;
        }

        const amount = FastMath.floor(avail / (res.recipe.materials[mat] || 0));
        counts.push(amount);
      }
    }

    if (counts.length > 0) {
      return counts.reduce((a, b) => a < b ? a : b);
    } else {
      return 0;
    }
  }

  /** Available background manufacturing slots (max_crafts - currently queued crafts). */
  manufactureSlots() {
    return data.max_crafts - this.queue.filter(t => isCraftTask(t)).length;
  }

  /**
   * Schedules background craft tasks for the most needed crafted resources.
   * Buys required materials from local stock, then queues a CraftTask.
   * When materials are insufficient, propagates demand for missing ingredients.
   */
  manufacture() {
    let slots = this.manufactureSlots();

    if (slots <= 0)
      return;

    const needed = this.neededResources();

    for (const item of needed.prioritized) {
      const res = resources[item];

      if (isCraft(res)) {
        const want  = needed.amounts[item];
        const avail = this.canManufacture(item);
        const gets  = Math.min(want, avail);

        if (gets > 0) {
          for (const mat of Object.keys(res.recipe.materials) as t.resource[]) {
            this.commerce.buy(mat, gets * (res.recipe.materials[mat] || 0));
          }

          this.schedule({
            type:  'craft',
            turns: this.fabrication.fabricate(item),
            item:  item,
            count: gets,
          });
        }

        if (gets < want) {
          const diff = want - gets;
          for (const mat of Object.keys(res.recipe.materials) as t.resource[]) {
            this.economy.incDemand(mat, diff * (res.recipe.materials[mat] || 0));
          }
        }
      }

      if (--slots <= 0)
        break;
    }
  }

  /** Available import slots (max_imports - currently queued imports). */
  importSlots(): number {
    return data.max_imports - this.queue.filter(t => isImportTask(t)).length;
  }

  /**
   * Schedules import tasks for needed resources that this planet doesn't produce.
   * Items are ordered by urgency. Each import buys from the best exporter,
   * clamped to hauler cargo bay size (with a minimum of 2).
   * Transit time is approximated from distance using a log scale.
   */
  imports() {
    let slots = this.importSlots();

    if (slots <= 0)
      return;

    const need = this.neededResources();
    const want = need.amounts;

    const list = need.prioritized.filter(i => {
      if (this.economy.isNetExporter(i) && !this.economy.hasShortage(i)) {
        delete want[i];
        return false;
      }

      return true;
    });

    for (const item of list) {
      const amount = util.clamp(want[item], 2, data.shipclass.hauler.cargo);
      const planet = this.selectExporter(item, amount);

      if (!planet) {
        continue;
      }

      const [bought] = window.game.planets[planet].commerce.buy(item, amount);

      if (bought > 0) {
        const distance = this.distance(planet) / Physics.AU;
        const turns = Math.max(3, FastMath.ceil(Math.log(distance) * 2)) * data.turns_per_day;
        window.game.planets[planet].commerce.buy('fuel', distance);

        this.schedule({
          type:  'import',
          item:  item,
          count: bought,
          from:  planet,
          to:    this.body,
          turns: turns,
        });
      }

      if (--slots <= 0)
        break;
    }
  }

  /** Planet buys a small amount of luxuries each turn as a consumption/economic sink. */
  luxuriate() {
    this.commerce.buy('luxuries', this.scale(3));
  }

  /**
   * Adds production output to stock each turn.
   * Production is suppressed when stock is above min_stock AND in super-surplus,
   * preventing infinite accumulation of goods nobody needs.
   */
  produce() {
    for (const item of t.resources) {
      if (this.economy.getStock(item) < this.min_stock || !this.economy.hasSuperSurplus(item)) {
        const amount = this.economy.production(item);
        if (amount > 0) {
          this.commerce.sell(item, amount);
        }
      }
    }
  }

  /** Deducts consumption from stock each turn. */
  consume() {
    for (const item of t.resources) {
      const amt = this.economy.consumption(item);
      if (amt > 0) {
        this.commerce.buy(item, this.economy.consumption(item));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Conditions
  // ---------------------------------------------------------------------------

  /**
   * Advances all active conditions by one turn; removes those that have expired.
   * Clears the net exporter cache for resources affected by expired conditions.
   * Then tests all known conditions for a chance to newly activate.
   */
  apply_conditions() {
    this.conditions = this.conditions.filter(c => {
      c.turn(this);

      if (c.isOver) {
        this.clearNetExporterCache(c.affectedResources);
      }

      return !c.isOver;
    });

    for (const cond of Object.keys(data.conditions)) {
      const c = new Condition(cond);

      if (c.testForChance(this)) {
        this.conditions.push(c);
        this.clearNetExporterCache(c.affectedResources);
      }
    }
  }



}
