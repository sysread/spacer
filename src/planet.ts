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
  state:      PlanetState;
  encounters: Encounters;
  economy:    Economy;
  labor:      Work;

  constructor(body: t.body, init?: SavedPlanet) {
    this.state      = new PlanetState(body, init);
    this.encounters = new Encounters(this.state);
    this.economy    = new Economy(this.state);
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
      this.refreshContracts();
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
          this.refreshContracts();
        }

        this.replenishFabricators();  // buy cybernetics to restore fab health
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


  // ---------------------------------------------------------------------------
  // Fabrication
  // ---------------------------------------------------------------------------

  /** Returns fabricator availability as a percentage [0, 100]. */
  fabricationAvailability() {
    return FastMath.ceil(Math.min(100, this.fab_health / this.max_fab_health * 100));
  }

  /**
   * The reduction rate applied to fabrication time when fab_health > 0.
   * Manufacturing hubs are fastest, then tech hubs, then baseline.
   * A lower rate means faster (and cheaper) fabrication.
   */
  fabricationReductionRate() {
    if (this.hasTrait('manufacturing hub'))
      return 0.35;

    if (this.hasTrait('tech hub'))
      return 0.5;

    return 0.65;
  }

  /**
   * Computes the turns required to fabricate `count` units.
   * While fab_health remains, each unit takes craftTurns * reductionRate turns.
   * Once health is exhausted, remaining units take the full craftTurns each.
   */
  fabricationTime(item: t.resource, count=1) {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const reduction = this.fabricationReductionRate();
    let health = this.fab_health;
    let turns  = 0;

    while (count > 0 && health > 0) {
      turns  += resource.craftTurns * reduction;
      health -= resource.craftTurns * reduction;
      --count;
    }

    turns += count * resource.craftTurns;

    return Math.max(1, FastMath.ceil(turns));
  }

  /**
   * Returns true if fab_health is sufficient to cover `count` units without
   * falling to zero mid-batch (i.e. the batch won't hit the penalty rate).
   */
  hasFabricationResources(item: t.resource, count=1) {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const reduction = this.fabricationReductionRate();
    let health = this.fab_health;

    for (let i = 0; i < count && health > 0; ++i) {
      health -= resource.craftTurns * reduction;

      if (health == 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Computes the credit fee to fabricate `count` units.
   * Units produced while fab_health > 0 pay data.craft_fee per unit.
   * Units produced after health is exhausted pay data.craft_fee_nofab (higher).
   * Standing discount is applied to the total.
   */
  fabricationFee(item: t.resource, count=1, player: Person): number {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const price    = this.sellPrice(item);
    const discount = 1.0 - player.getStandingPriceAdjustment(this.faction);

    let fee = 0;

    for (let i = 0, health = this.fab_health; i < count; ++i, --health) {
      if (health > 0) {
        fee += price * data.craft_fee;
      } else {
        fee += price * data.craft_fee_nofab;
      }
    }

    return FastMath.ceil(fee * discount);
  }

  /**
   * Consumes fab_health for one fabrication run. Returns the turns taken.
   * If health is available, uses the reduction rate. Otherwise uses full turns.
   */
  fabricate(item: t.resource) {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const reduction = this.fabricationReductionRate() * resource.craftTurns;
    let turns  = 0;

    if (this.fab_health > 0) {
      turns += reduction;
      this.fab_health -= Math.min(this.fab_health, reduction);
    }
    else {
      turns += resource.craftTurns;
    }

    const turns_taken = Math.max(1, FastMath.ceil(turns));
    return turns_taken;
  }

  /**
   * Attempts to buy cybernetics to restore fab_health when it falls below 50%.
   * Each unit of cybernetics restores data.fab_health points of capacity.
   */
  replenishFabricators() {
    if (this.fab_health < this.max_fab_health / 2) {
      const want = FastMath.ceil((this.max_fab_health - this.fab_health) / data.fab_health);
      const [bought] = this.buy('cybernetics', want);
      this.fab_health += bought * data.fab_health;
    }

    this.fab_health = Math.min(this.fab_health, this.max_fab_health);
  }


  scale(n=0) { return this.state.scale(n); }

  // ---------------------------------------------------------------------------
  // Pricing
  // ---------------------------------------------------------------------------

  /**
   * Distance-based price markup for non-exporters.
   * Net exporters of an item sell at a 20% discount (0.8).
   * Non-exporters get a markup based on distance to the nearest exporter:
   *   - Cross-faction source adds 10%
   *   - Each full AU of distance adds 5% compounded
   * Returns 1.0 when no exporter exists (no markup, no discount).
   */
  getAvailabilityMarkup(item: t.resource) {
    if (this.economy.isNetExporter(item)) {
      return 0.8;
    }

    let distance;
    let nearest;

    for (const body of t.bodies) {
      if (body == this.body) {
        continue;
      }

      if (!window.game.planets[body].economy.isNetExporter(item)) {
        continue;
      }

      const d = system.distance(this.body, body);

      if (distance == undefined || distance > d) {
        nearest  = body;
        distance = d;
      }
    }

    if (distance != undefined && nearest != undefined) {
      let markup = 1;

      if (data.bodies[nearest].faction != data.bodies[this.body].faction) {
        markup += 0.1;
      }

      const au = FastMath.ceil(distance / Physics.AU);
      for (let i = 0; i < au; ++i) {
        markup *= 1.05;
      }

      return markup;
    }
    else {
      return 1;
    }
  }

  /**
   * Scarcity markup for necessity goods (food, fuel, medicine, etc.).
   * Returns 1 + data.scarcity_markup for necessities, 1.0 otherwise.
   */
  getScarcityMarkup(item: t.resource) {
    if (data.necessity[item]) {
      return 1 + data.scarcity_markup;
    } else {
      return 1;
    }
  }

  /**
   * Condition-based markup: active conditions that consume an item raise its
   * price; conditions that produce it lower it.
   */
  getConditionMarkup(item: t.resource) {
    let markup = 1;

    for (const condition of this.conditions) {
      const consumption = this.scale(condition.consumes[item] || 0);
      const production  = this.scale(condition.produces[item] || 0);
      const amount      = consumption - production;
      markup += amount;
    }

    return markup;
  }

  /**
   * Computes and caches the market price for an item.
   *
   * Pipeline:
   *   1. Base value from resource.ts
   *   2. Need factor: log(need) markup or fractional discount
   *   3. Trait price adjustments (flat percentage)
   *   4. Scarcity markup for necessity goods
   *   5. Condition markup from active events
   *   6. Clamped to [minPrice, maxPrice]
   *   7. Availability markup (distance to nearest exporter, post-clamp)
   *   8. 5% random fuzz for local variation
   *
   * Cached until the per-resource _cycle expires (3-12 days).
   */
  price(item: t.resource) {
    if (this._price[item] == undefined) {
      const value = resources[item].value;
      const need  = this.economy.getNeed(item);

      let price = 0;

      if (need > 1) {
        price = value + (value * Math.log(need));
      } else if (need < 1) {
        price = value * need;
      } else {
        price = value;
      }

      for (const trait of this.traits)
        price -= price * (trait.price[item] || 0);

      price *= this.getScarcityMarkup(item);
      price *= this.getConditionMarkup(item);
      price  = resources[item].clampPrice(price);
      price *= this.getAvailabilityMarkup(item);
      price  = util.fuzz(price, 0.05);

      this._price[item] = util.R(price);
    }

    return this._price[item];
  }

  /** Price at which this market will buy goods from the player. */
  sellPrice(item: t.resource) {
    return this.price(item);
  }

  /**
   * Price at which this market sells goods to the player.
   * Adds sales tax; subtracts a standing discount if a player is provided.
   */
  buyPrice(item: t.resource, player?: Person): number {
    const price = this.price(item) * (1 + this.faction.sales_tax);
    return player
      ? FastMath.ceil(price * (1 - player.getStandingPriceAdjustment(this.faction.abbrev)))
      : FastMath.ceil(price);
  }

  /** Price per tonne of fuel (buy price / fuel mass), with a 3.5% handling margin. */
  fuelPricePerTonne(player?: Person): number {
    return FastMath.ceil(this.buyPrice('fuel', player) * 1.035 / data.resources.fuel.mass);
  }

  // ---------------------------------------------------------------------------
  // Commerce - buy and sell
  // ---------------------------------------------------------------------------

  /**
   * Checks whether a transaction involves contraband and applies inspection logic.
   * Returns true if the transaction may proceed. Returns false (and applies fine,
   * standing loss, and confiscation) if the player is caught.
   *
   * Inspection is per-unit-of-contraband-severity: each severity point is a
   * separate roll at inspectionRate. Amount is signed (negative = selling to market).
   */
  transactionInspection(item: t.resource, amount: number, player: Person) {
    if (!player || !this.faction.isContraband(item, player))
      return true;

    const contraband = data.resources[item].contraband || 0;

    // FastMath.abs() because amount is negative when selling, positive when buying.
    const fine = FastMath.abs(contraband * amount * this.encounters.inspectionFine(player));
    const rate = this.encounters.inspectionRate(player);

    for (let i = 0; i < contraband; ++i) {
      if (util.chance(rate)) {
        const totalFine = Math.min(player.money, fine);
        const csnFine = util.csn(totalFine);
        const csnAmt = util.csn(amount);

        player.debit(totalFine);
        player.decStanding(this.faction.abbrev, contraband);

        let verb;
        if (amount < 0) {
          player.ship.cargo.set(item, 0);
          verb = 'selling';
        }
        else {
          this.stock.dec(item, amount);
          verb = 'buying';
        }

        const msg = `Busted! ${this.faction.abbrev} agents were tracking your movements and observed you ${verb} ${csnAmt} units of ${item}. `
                  + `You have been fined ${csnFine} credits and your standing wtih this faction has decreased by ${contraband}.`;

        window.game.notify(msg, true);

        return false;
      }
    }

    return true;
  }

  /**
   * Player or agent buys `amount` units of `item` from this market.
   * Returns [units_bought, total_price]. Triggers inspection for contraband.
   * Fires ItemsBought event for the player (not for agents).
   * Limited by current stock; demand is still signaled for the full requested amount.
   */
  buy(item: t.resource, amount: number, player?: Person) {
    if (player && player === window.game.player && !this.transactionInspection(item, amount, player))
      return [0, 0];

    const bought = Math.min(amount, this.economy.getStock(item));
    const price  = bought * this.buyPrice(item, player);

    this.economy.incDemand(item, amount);
    this.stock.dec(item, bought);

    if (player && bought) {
      player.debit(price);
      player.ship.loadCargo(item, bought);

      if (player === window.game.player) {
        trigger(new ItemsBought({
          count: bought,
          body:  this.body,
          item:  item,
          price: price,
        }));
      }
    }

    return [bought, price];
  }

  /**
   * Player or agent sells `amount` units of `item` to this market.
   * Returns [units_sold, total_price, standing_gained].
   * Ending a shortage grants standing; selling during an active condition grants
   * additional standing. Fires ItemsSold event for the player.
   */
  sell(item: t.resource, amount: number, player?: Person) {
    if (player && player === window.game.player && !this.transactionInspection(item, amount, player))
      return [0, 0, 0];

    const hasShortage = this.economy.hasShortage(item);
    const price = amount * this.sellPrice(item);
    this.stock.inc(item, amount);

    let standing = 0;

    if (player) {
      player.ship.unloadCargo(item, amount);
      player.credit(price);

      if (hasShortage && !resources[item].contraband) {
        if (!this.economy.hasShortage(item)) {
          // Selling resolved the shortage entirely.
          standing += util.getRandomNum(3, 8);
        }
        else {
          // Selling contributed toward resolving the shortage.
          standing += util.getRandomNum(1, 3);
        }
      }

      for (const c of this.conditions) {
        if (c.consumes[item] != undefined) {
          standing += util.getRandomNum(2, 5);
        }
      }

      if (standing > 0)
        player.incStanding(this.faction.abbrev, standing);

      if (player === window.game.player) {
        trigger(new ItemsSold({
          count:    amount,
          body:     this.body,
          item:     item,
          price:    price,
          standing: standing,
        }));
      }
    }

    return [amount, price, standing];
  }

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
        this.sell(task.item, task.count);
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
        need[item] = Math.log(this.price(item)) * this.economy.getNeed(item);
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

      dist[body]  = this.distance(body) / Physics.AU * window.game.planets[body].fuelPricePerTonne();
      price[body] = window.game.planets[body].buyPrice(item);
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
            this.buy(mat, gets * (res.recipe.materials[mat] || 0));
          }

          this.schedule({
            type:  'craft',
            turns: this.fabricate(item),
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

      const [bought] = window.game.planets[planet].buy(item, amount);

      if (bought > 0) {
        const distance = this.distance(planet) / Physics.AU;
        const turns = Math.max(3, FastMath.ceil(Math.log(distance) * 2)) * data.turns_per_day;
        window.game.planets[planet].buy('fuel', distance);

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
    this.buy('luxuries', this.scale(3));
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
          this.sell(item, amount);
        }
      }
    }
  }

  /** Deducts consumption from stock each turn. */
  consume() {
    for (const item of t.resources) {
      const amt = this.economy.consumption(item);
      if (amt > 0) {
        this.buy(item, this.economy.consumption(item));
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

  // ---------------------------------------------------------------------------
  // Contracts
  // ---------------------------------------------------------------------------

  get availableContracts() {
    return this.contracts.filter(c => !c.mission.is_accepted);
  }

  /** Contracts that can be accepted without docking (Smuggler missions only). */
  get availableOffPlanetContracts() {
    return this.availableContracts.filter(c => c.mission instanceof Smuggler);
  }

  /**
   * Removes expired contracts and refreshes passenger and smuggler offerings.
   * Called on arrival and (when not in transit) at turn 2 of each day.
   */
  refreshContracts() {
    if (this.contracts.length > 0 && window.game) {
      this.contracts = this.contracts.filter(c => c.valid_until >= window.game.turns);
    }

    this.refreshPassengerContracts();
    this.refreshSmugglerContracts();
  }

  /**
   * Rebuilds the smuggler contract list. Removes contracts for items that are
   * no longer contraband or under blockade. Generates new contracts for the
   * most-needed contraband or blockaded items, up to the scaled maximum count.
   */
  refreshSmugglerContracts() {
    const hasTradeBan = this.hasTradeBan;

    if (this.contracts.length > 0 && window.game) {
      this.contracts = this.contracts.filter(c => {
        if (c.mission instanceof Smuggler) {
          if (hasTradeBan || data.resources[c.mission.item].contraband) {
            return true;
          }

          return false;
        }

        return true;
      });
    }

    const max_count = FastMath.ceil(this.scale(data.smuggler_mission_count));
    const missions  = this.contracts.filter(c => c.mission instanceof Smuggler).slice(0, max_count);

    this.contracts = this.contracts.filter(c => !(c.mission instanceof Smuggler));

    const threshold = FastMath.ceil(this.scale(6));

    if (missions.length < max_count) {
      const needed = this.neededResources();

      for (const item of needed.prioritized) {
        if (missions.length >= max_count)
          break;

        if (needed.amounts[item] < threshold)
          continue;

        if (hasTradeBan || data.resources[item].contraband) {
          const batch  = util.clamp(needed.amounts[item], 1, window.game.player.ship.cargoSpace);
          const amount = util.clamp(util.fuzz(batch, 1.00), 1);

          const mission = new Smuggler({
            issuer: this.body,
            item:   item,
            amt:    util.R(amount),
          });

          missions.push({
            valid_until: util.getRandomInt(30, 60) * data.turns_per_day,
            mission: mission,
          });
        }
      }
    }

    this.contracts = this.contracts.concat(missions);
  }

  /**
   * Fills passenger contract slots up to the scaled maximum.
   * Destinations are weighted toward same-faction planets and faction capitals.
   * Each destination is only offered once per refresh.
   */
  refreshPassengerContracts() {
    const have = this.contracts.filter(c => c.mission instanceof Passengers).length;
    const max  = Math.max(1, util.getRandomInt(0, this.scale(data.passenger_mission_count)));
    const want = Math.max(0, max - have);

    if (this.contracts.length >= want) {
      return;
    }

    const skip:  {[key: string]: boolean} = { [this.body]: true };
    const dests: t.body[] = [];

    for (const c of this.contracts) {
      skip[(<Passengers>c.mission).dest] = true;
    }

    for (const body of t.bodies) {
      if (skip[body]) {
        continue;
      }

      dests.push(body);

      // Weight same-faction and capital destinations more heavily.
      if (data.bodies[body].faction == this.faction.abbrev) {
        dests.push(body);
      }

      if (data.factions[data.bodies[body].faction].capital == body) {
        dests.push(body);
      }
    }

    for (let i = 0; i < want; ++i) {
      const dest = util.oneOf(dests.filter(d => !skip[d]));

      if (!dest) {
        break;
      }

      const mission = new Passengers({ orig: this.body, dest: dest });

      this.contracts.push({
        valid_until: util.getRandomInt(10, 30) * data.turns_per_day,
        mission:     mission,
      });

      skip[dest] = true;
    }
  }

  /** Removes an accepted mission from the offered contract list. */
  acceptMission(mission: Mission) {
    this.contracts = this.contracts.filter(c => c.mission.title != mission.title);
  }


  // ---------------------------------------------------------------------------
  // Misc - repair and addon pricing
  // ---------------------------------------------------------------------------

  /** Price for an addon at this market: base + tax - standing discount, then trait adjustment. */
  addonPrice(addon: t.addon, player: Person) {
    const base     = data.addons[addon].price;
    const standing = base * player.getStandingPriceAdjustment(this.faction.abbrev);
    const tax      = base * this.faction.sales_tax;

    let price = base - standing + tax;

    for (const trait of this.traits) {
      if ('price' in trait && 'addons' in trait.price) {
        price *= trait.price['addons'] || 1;
      }
    }

    return price;
  }

  /**
   * Estimates turns until `item` becomes available (stock > 0).
   * Returns 0 if in stock, 3 if a raw producer (will produce within a few turns),
   * or the minimum turns_left of any queued import or craft task for this item.
   * Returns undefined if nothing is scheduled.
   */
  estimateAvailability(item: t.resource): number|undefined {
    let turns: number | undefined = undefined;

    if (this.economy.getStock(item) > 0)
      return 0;

    const res = resources[item];
    if (isRaw(res) && this.economy.netProduction(item) > 0) {
      return 3;
    }

    for (const task of this.queue) {
      if (isImportTask(task)
        && task.item == item
        && (turns == undefined || turns > task.turns))
      {
        turns = task.turns;
      }
      else if (isCraftTask(task)
        && task.item == item
        && (turns == undefined || turns > task.turns))
      {
        turns = task.turns;
      }
    }

    return turns;
  }

  /**
   * Price adjustment factor based on how scarce or surplus a resource dependency is.
   * Used by repair pricing to reflect current metal market conditions.
   */
  resourceDependencyPriceAdjustment(resource: t.resource) {
    if (this.economy.hasShortage(resource)) {
      return this.economy.getNeed(resource);
    } else if (this.economy.hasSurplus(resource)) {
      return 1 / this.economy.getNeed(resource);
    } else {
      return 1;
    }
  }

  /** True if metal is in stock (repairs are possible). */
  hasRepairs() {
    return this.economy.getStock('metal');
  }

  /** Hull repair price: base rate adjusted for tax, standing, and metal scarcity. */
  hullRepairPrice(player: Person) {
    const base     = data.ship.hull.repair;
    const tax      = this.faction.sales_tax;
    const standing = player.getStandingPriceAdjustment(this.faction.abbrev);
    const scarcity = this.resourceDependencyPriceAdjustment('metal');
    return FastMath.ceil((base + (base * tax) - (base * standing)) * scarcity);
  }

  /** Armor repair price: base rate adjusted for tax, standing, and metal scarcity. */
  armorRepairPrice(player: Person) {
    const base     = data.ship.armor.repair;
    const tax      = this.faction.sales_tax;
    const standing = player.getStandingPriceAdjustment(this.faction.abbrev);
    const scarcity = this.resourceDependencyPriceAdjustment('metal');
    return FastMath.ceil((base + (base * tax) - (base * standing)) * scarcity);
  }
}
