import data    from './data';
import system  from './system';
import Physics from './physics';
import Store   from './store';
import History from './history';

import { Resource, Raw, Craft, isRaw, isCraft, resources } from './resource';
import { Trait } from './trait';
import { Faction } from './faction';
import { Condition, SavedCondition } from './condition';
import { Events, Ev, TurnCallBack, TurnDetail } from './events';
import { Mission, Passengers, MissionData } from './mission';
import { Person } from './person';

import * as t from './common';
import * as util from './util';


// Shims for global browser objects
declare var console: any;
declare var window: { game: any; }


interface NeededResources {
  prioritized: t.resource[];
  amounts:     { [key: string]: number };
}


interface ImportTask {
  type:  'import';
  turns: number;
  item:  t.resource;
  count: number;
  from:  t.body;
  to:    t.body;
}

interface CraftTask {
  type:  'craft';
  turns: number;
  item:  t.resource;
  count: number;
}

type EconTask = ImportTask | CraftTask;

export function isImportTask(task: EconTask): task is ImportTask {
  return (<ImportTask>task).type == 'import';
}

export function isCraftTask(task: EconTask): task is ImportTask {
  return (<CraftTask>task).type == 'craft';;
}


interface Contract {
  valid_until: number;  // game.turns after which offering expires
  mission:     Mission; // offered mission
}

interface SavedContract {
  valid_until: number;
  mission:     MissionData;
}


export interface SavedPlanet {
  conditions?: SavedCondition[];
  stock?:      any;
  supply?:     any;
  demand?:     any;
  need?:       any;
  pending?:    any;
  queue?:      any;
  contracts?:  SavedContract[];
}

export class Planet {
  readonly body:      t.body;
  readonly name:      string;
  readonly size:      string;
  readonly radius:    number;
  readonly kind:      string;
  readonly central:   string;
  readonly gravity:   number;
  readonly faction:   Faction;
  readonly traits:    Trait[];

  readonly produces:  Store;
  readonly consumes:  Store;
  readonly min_stock: number;

  conditions:         Condition[];
  work_tasks:         string[];
  contracts:          Contract[];

  max_fab_units:      number;
  max_fab_health:     number;
  fab_health:         number;

  stock:              Store;
  supply:             History;
  demand:             History;
  need:               History;
  pending:            Store;
  queue:              EconTask[];

  _price:             t.Counter;
  _cycle:             t.Counter;
  _need:              t.Counter;
  _exporter:          {[key:string]: boolean};

  constructor(body: t.body, init?: SavedPlanet) {
    init = init || {};

    /*
     * Physical and faction
     */
    this.body    = body;
    this.name    = data.bodies[this.body].name;
    this.size    = data.bodies[this.body].size;
    this.radius  = system.body(this.body).radius;
    this.kind    = system.kind(this.body);
    this.central = system.central(this.body);
    this.gravity = system.gravity(this.body);
    this.faction = new Faction(data.bodies[body].faction);
    this.traits  = data.bodies[body].traits.map(t => new Trait(t));

    /*
     * Temporary conditions
     */
    if (init.conditions) {
      this.conditions = init.conditions.map(c => new Condition(c.name, c));
    } else {
      this.conditions = [];
    }

    /*
     * Fabrication
     */
    this.max_fab_units  = Math.ceil(this.scale(data.fabricators));
    this.max_fab_health = this.max_fab_units * data.fab_health;
    this.fab_health     = this.max_fab_units * data.fab_health;

    /*
     * Work
     */
    this.work_tasks = [];
    TASK:for (const task of data.work) {
      for (const req of task.avail) {
        for (const trait of this.traits) {
          if (req === trait.name) {
            this.work_tasks.push(task.name);
            continue TASK;
          }
        }
      }
    }

    this.contracts = [];
    if (init.contracts) {
      for (const info of init.contracts) {
        this.contracts.push({
          valid_until: info.valid_until,
          mission: new Passengers(info.mission),
        });
      }
    }

    /*
     * Economics
     */
    this.stock     = new Store(init.stock);
    this.supply    = new History(data.market_history, init.supply);
    this.demand    = new History(data.market_history, init.demand);
    this.need      = new History(data.market_history, init.need);
    this.pending   = new Store(init.pending);
    this.queue     = init.queue || [];
    this.min_stock = this.scale(data.min_stock_count);

    this.produces = new Store;
    this.consumes = new Store;
    for (const item of t.resources) {
      this.produces.inc(item, this.scale(data.market.produces[item]));
      this.consumes.inc(item, this.scale(data.market.consumes[item]));

      this.produces.inc(item, this.scale(this.faction.produces[item] || 0));
      this.consumes.inc(item, this.scale(this.faction.consumes[item] || 0));

      for (const trait of this.traits) {
        this.produces.inc(item, this.scale(trait.produces[item]));
        this.consumes.inc(item, this.scale(trait.consumes[item]));
      }
    }

    // Assign directly in constructor rather than in a method call for
    // performance reasons. V8's jit will produce more optimized classes by
    // avoiding dynamic assignment in the constructor.
    this._price    = {};
    this._cycle    = {};
    this._need     = {};
    this._exporter = {};

    window.game.onTurn((ev: TurnDetail) => this.turn(ev.detail.turn));
  }

  turn(turn: number) {
    // Spread expensive daily procedures out over multiple turns; note the
    // fall-through in each case to default, which are actions called on every
    // turn.
    switch (turn % data.turns_per_day) {
      case 0:
        this.manufacture();

      case 1:
        this.imports();

      case 2:
        // >= should catch the final turn of a new game being prepared so
        // the new game starts with a selection of jobs generated
        if (turn >= data.initial_days * data.turns_per_day) {
          this.refreshContracts();
        }

        this.replenishFabricators();
        this.luxuriate();
        this.apply_conditions();
        this.rollups(turn);

      default:
        this.produce();
        this.consume();
        this.processQueue();
    }
  }

  rollups(turn: number) {
    for (const item of this.stock.keys())
      this.incSupply(item, this.getStock(item))

    this.supply.rollup()
    this.demand.rollup()

    for (const item of this.need.keys())
      this.need.inc(item, this.getNeed(item))

    this.need.rollup()

    this._exporter = {};
    this._need = {};

    // randomly cycle updates to price
    for (const item of t.resources) {
      if (!this._cycle[item] || turn % this._cycle[item]) {
        // drop the saved price
        delete this._price[item];

        // set a new turn modulus for 3-12 days
        this._cycle[item] = util.getRandomInt(3, 12) * data.turns_per_day;
      }
    }
  }

  get desc() {
    return data.bodies[this.body].desc;
  }

  get position() {
    return system.position(this.body);
  }

  distance(toBody: t.body): number {
    return system.distance(this.body, toBody);
  }

  hasTrait(trait: string) {
    for (const t of this.traits) {
      if (t.name == trait) {
        return true;
      }
    }

    return false;
  }

  hasCondition(condition: string) {
    for (const c of this.conditions) {
      if (c.name == condition) {
        return true;
      }
    }

    return false;
  }

  /*
   * Piracy rates
   */
  piracyRadius() {
    // jurisdiction is a good enough basis for operating range for now
    let radius = this.scale(data.jurisdiction * 2);
    if (this.hasTrait('black market')) radius *= 2;
    if (this.hasTrait('capital'))      radius *= 0.75;
    if (this.hasTrait('military'))     radius *= 0.5;
    return radius;
  }

  // Piracy obeys a similar approximation of the inverse square law, just as
  // patrols do, but piracy rates peak at the limit of patrol ranges, where
  // pirates are close enough to remain within operating range of their home
  // base, but far enough away that patrols are not too problematic.
  piracyRate(distance=0) {
    const radius = this.piracyRadius();

    distance = Math.abs(distance - radius);

    let rate = this.scale(this.faction.piracy);
    const intvl = radius / 10;
    for (let i = 0; i < distance; i += intvl) {
      rate *= 0.85;
    }

    return Math.max(0, rate);
  }

  /*
   * Patrols and inspections
   */
  patrolRadius() {
    let radius = this.scale(data.jurisdiction);
    if (this.hasTrait('military'))     radius *= 1.75;
    if (this.hasTrait('capital'))      radius *= 1.5;
    if (this.hasTrait('black market')) radius *= 0.5;
    return radius;
  }

  // Distance is in AU
  patrolRate(distance=0) {
    const radius = this.patrolRadius();
    let patrol = this.scale(this.faction.patrol);

    if (distance < radius) {
      return patrol;
    }

    distance -= radius;

    let rate = patrol;
    for (let i = 0; i < distance; i += 0.1) {
      rate /= 2;
    }

    return Math.max(0, rate);
  }

  inspectionRate(player: Person) {
    const standing = 1 - (player.getStanding(this.faction.abbrev) / data.max_abs_standing);
    return this.scale(this.faction.inspection) * standing;
  }

  inspectionFine(player: Person) {
    return Math.max(10, data.max_abs_standing - player.getStanding(this.faction));
  }

  /*
   * Fabrication
   */
  fabricationAvailability() {
    return Math.ceil(Math.min(100, this.fab_health / this.max_fab_health * 100));
  }

  fabricationReductionRate() {
    if (this.hasTrait('manufacturing hub'))
      return 0.35;

    if (this.hasTrait('tech hub'))
      return 0.5;

    return 0.65;
  }

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

    return Math.max(1, Math.ceil(turns));
  }

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

  fabricationFee(item: t.resource, count=1, player: Person) {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const rate = data.craft_fee * this.sellPrice(item);
    const reduction = this.fabricationReductionRate();

    let health = this.fab_health;
    let fee = 5 * rate * count;

    for (let i = 0; i < count && health > 0; ++i) {
      health -= resource.craftTurns * reduction;
      fee    -= rate * 4;
    }

    fee -= fee * player.getStandingPriceAdjustment(this.faction.abbrev);
    fee += fee * this.faction.sales_tax;

    return Math.max(1, Math.ceil(fee));
  }

  fabricate(item: t.resource) {
    const resource = resources[item];

    if (!isCraft(resource)) {
      throw new Error(`${item} is not craftable`);
    }

    const reduction = this.fabricationReductionRate();
    let health = this.fab_health;
    let turns  = 0;

    if (this.fab_health > 0) {
      turns += resource.craftTurns * reduction;
      this.fab_health -= resource.craftTurns * reduction;
    }
    else {
      turns += resource.craftTurns;
    }

    const turns_taken = Math.max(1, Math.ceil(turns));
    return turns_taken;
  }

  replenishFabricators() {
    if (this.fab_health < this.max_fab_health / 2) {
      const want = Math.ceil((this.max_fab_health - this.fab_health) / data.fab_health);
      const [bought, price] = this.buy('cybernetics', want);
      this.fab_health += bought * data.fab_health;
    }
  }

  /*
   * Work
   */
  hasPicketLine() {
    return this.hasCondition("workers' strike");
  }

  payRate(player: Person, task: t.Work) {
    let rate = this.scale(task.pay);
    rate += rate * player.getStandingPriceAdjustment(this.faction.abbrev);
    rate -= rate * this.faction.sales_tax;
    return Math.ceil(rate);
  }

  work(player: Person, task: t.Work, days: number) {
    const pay       = this.payRate(player, task) * days
    const turns     = days * 24 / data.hours_per_turn;
    const rewards   = task.rewards;
    const collected = new Store;

    for (let turn = 0; turn < turns; ++turn) {
      for (const item of rewards) {
        collected.inc(item, this.mine(item));
      }
    }

    return {pay: pay, items: collected};
  }

  mine(item: t.resource) {
    if (this.production(item) > 0 && util.chance(data.market.minability)) {
      const amt = util.getRandomNum(0, this.production(item));
      return Math.min(1, amt);
    }

    return 0;
  }

  /*
   * Economics
   */
  scale(n=0) {
    return data.scales[this.size] * n;
  }

  getStock(item: t.resource) {
    return this.stock.count(item);
  }

  avgProduction(item: t.resource) {
    return this.getSupply(item) - this.consumption(item);
  }

  netProduction(item: t.resource) {
    return this.production(item) - this.consumption(item);
  }

  getDemand(item: t.resource) {
    return this.demand.avg(item);
  }

  getSupply(item: t.resource) {
    return this.supply.avg(item);
  }

  shortageFactor(item: t.resource) {
    return this.isNetExporter(item) ? 3 : 6;
  }

  hasShortage(item: t.resource) {
    return this.getNeed(item) >= this.shortageFactor(item);
  }

  surplusFactor(item: t.resource) {
    return this.isNetExporter(item) ? 0.3 : 0.6;
  }

  hasSurplus(item: t.resource) {
    return this.getNeed(item) <= this.surplusFactor(item);
  }

  hasSuperSurplus(item: t.resource) {
    return this.getNeed(item) <= this.surplusFactor(item) * 0.75;
  }

  production(item: t.resource) {
    let amount = this.produces.get(item) / data.turns_per_day;

    for (const condition of this.conditions) {
      amount += this.scale(condition.produces[item] || 0);
    }

    return amount;
  }

  consumption(item: t.resource) {
    let amount = this.consumes.get(item) / data.turns_per_day;

    for (const condition of this.conditions) {
      amount += this.scale(condition.consumes[item] || 0);
    }

    return amount;
  }

  incDemand(item: t.resource, amt: number) {
    const queue: [t.resource, number][] = [[item, amt]];

    while (queue.length > 0) {
      const elt = queue.shift();

      if (elt != undefined) {
        const [item, amt] = elt;

        this.demand.inc(item, amt);

        const res = data.resources[item];

        if (t.isCraft(res) && this.hasShortage(item)) {
          for (const mat of Object.keys(res.recipe.materials) as t.resource[]) {
            queue.push([ mat, (res.recipe.materials[mat] || 0) * amt ]);
          }
        }
      }
    }
  }

  incSupply(item: t.resource, amount: number) {
    this.supply.inc(item, amount);
  }

  isNetExporter(item: t.resource): boolean {
    if (this._exporter[item] === undefined) {
      const res = data.resources[item];

      if (t.isCraft(res)) {
        this._exporter[item] = true;

        for (const mat of Object.keys(res.recipe.materials)) {
          if (!this.isNetExporter(mat as t.resource)) {
            this._exporter[item] = false;
            break;
          }
        }
      }
      else {
        this._exporter[item] = this.netProduction(item) > this.scale(1);
      }
    }

    return this._exporter[item];
  }

  getNeed(item: t.resource) {
    if (this._need[item] === undefined) {
      const d = this.getDemand(item);
      const s = (this.getStock(item) + (2 * this.getSupply(item))) / 3;
      const n = d - s;
      this._need[item] =
            n == 0 ? 1
          : n > 0  ? Math.log(10 * (1 + n))
                   : d / s;
    }

    return this._need[item];
  }

  /**
   * Returns a price adjustment which accounts for the distance to the nearest
   * net exporter of the item. Returns a decimal percentage where 1.0 means no
   * adjustment.
   */
  getAvailabilityMarkup(item: t.resource) {
    // If this planet is a net exporter of the item, easy access results in a
    // lower price.
    if (this.isNetExporter(item)) {
      return 0.8;
    }

    // Find the nearest exporter of the item
    let distance;
    let nearest;

    for (const body of t.bodies) {
      if (body == this.body) {
        continue;
      }

      if (!window.game.planets[body].isNetExporter(item)) {
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

      // Competing market malus
      if (data.bodies[nearest].faction != data.bodies[this.body].faction) {
        markup += 0.1;
      }

      // Distance malus: compound 10% markup for each AU
      const au = Math.ceil(distance / Physics.AU);
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
   * Percent adjustment to price due to an item being a necessity (see
   * data.necessity). Returns a decimal percentage, where 1.0 means no
   * adjustment:
   *
   *    price *= this.getScarcityMarkup(item));
   */
  getScarcityMarkup(item: t.resource) {
    if (data.necessity[item]) {
      return 1 + data.scarcity_markup;
    } else {
      return 1;
    }
  }

  /**
   * Also factors in temporary deficits between production and consumption of
   * the item due to Conditions. Returns a decimal percentage, where 1.0
   * means no adjustment.
   */
  getConditionMarkup(item: t.resource) {
    let markup = 1;

    for (const condition of this.conditions) {
      const consumption = this.scale(condition.consumes[item] || 0);
      const production  = this.scale(condition.produces[item] || 0);
      const amount      = consumption - production; // production is generally a malus
      markup += amount;
    }

    return markup;
  }

  price(item: t.resource) {
    if (this._price[item] == undefined) {
      const value = resources[item].value;
      const need  = this.getNeed(item);

      let price = 0;

      if (need > 1) {
        price = value + (value * Math.log(need));
      } else if (need < 1) {
        price = value * need;
      } else {
        price = value;
      }

      // Linear adjustments for market classifications
      for (const trait of this.traits) {
        price -= price * (trait.price[item] || 0);
      }

      // Scarcity adjustment for items necessary to survival
      price *= this.getScarcityMarkup(item);

      // Scarcity adjustment due to temporary conditions affecting production
      // and consumption of resources
      price *= this.getConditionMarkup(item);

      // Set upper and lower boundary to prevent superheating or crashing
      // markets.
      price = resources[item].clampPrice(price);

      // Post-clamp adjustments due to distance
      price *= this.getAvailabilityMarkup(item);

      // Add a bit of "unaccounted for local influences"
      price = util.fuzz(price, 0.05);

      this._price[item] = util.R(price);
    }

    return this._price[item];
  }

  sellPrice(item: t.resource) {
    return this.price(item);
  }

  buyPrice(item: t.resource, player?: Person): number {
    const price = this.price(item) * (1 + this.faction.sales_tax);
    return player
      ? Math.ceil(price * (1 - player.getStandingPriceAdjustment(this.faction.abbrev)))
      : Math.ceil(price);
  }

  buy(item: t.resource, amount: number, player?: Person) {
    const bought = Math.min(amount, this.getStock(item));
    const price  = bought * this.buyPrice(item, player);

    this.incDemand(item, amount);
    this.stock.dec(item, bought);

    if (player && bought) {
      player.debit(price);
      player.ship.loadCargo(item, bought);

      if (player === window.game.player)
        Events.signal({type: Ev.ItemsBought, count: bought, item, price});
    }

    return [bought, price];
  }

  sell(item: t.resource, amount: number, player?: Person) {
    const hasShortage = this.hasShortage(item);
    const price = amount * this.sellPrice(item);
    this.stock.inc(item, amount);

    let standing = 0;

    if (player) {
      player.ship.unloadCargo(item, amount);
      player.credit(price);

      if (hasShortage && !resources[item].contraband) {
        // Player ended a shortage. Increase their standing with our faction.
        if (!this.hasShortage(item)) {
          standing = util.getRandomNum(3, 8);
          player.incStanding(this.faction.abbrev, standing);
        }
        // Player contributed toward ending a shortage. Increase their
        // standing with our faction slightly.
        else {
          standing = util.getRandomNum(1, 3);
          player.incStanding(this.faction.abbrev, standing);
        }
      }

      if (player === window.game.player)
        Events.signal({type: Ev.ItemsSold, count: amount, item, price, standing});
    }

    return [amount, price, standing];
  }

  schedule(task: EconTask) {
    this.pending.inc(task.item, task.count);
    this.queue.push(task);
  }

  processQueue() {
    // NOTE: this method of regenerating the queue is *much* faster than
    // Array.prototype.filter().
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

  neededResourceAmount(item: Resource) {
    if (this.getStock(item.name) > data.min_stock_count)
      return 0;
    const amount = this.getDemand(item.name) - this.getSupply(item.name) - this.pending.get(item.name);
    return Math.max(Math.ceil(amount), 0);
  }

  neededResources(): NeededResources {
    const amounts: { [key: string]: number } = {}; // Calculate how many of each item we want
    const need:    { [key: string]: number } = {}; // Pre-calculate each item's need

    for (const item of t.resources) {
      const amount = this.neededResourceAmount(resources[item]);

      if (amount > 0) {
        amounts[item] = amount;
        need[item] = Math.log(this.price(item)) * this.getNeed(item);
      }
    }

    // Sort the greatest needs to the front of the list
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

  exporters(item: t.resource): t.body[] {
    return t.bodies.filter(name => {
      const p = window.game.planets[name];
      return name !== this.body
          && p.getStock(item) >= 1
          && !p.hasShortage(item)
          && (p.hasSurplus(item) || p.isNetExporter(item));
    });
  }

  selectExporter(item: t.resource, amount: number): t.body | void {
    const exporters = this.exporters(item);

    if (exporters.length === 0)
      return;

    // Calculate a rating based on difference from average distance, price, stock
    const dist:  t.Counter = {};
    const price: t.Counter = {};
    const stock: t.Counter = {};
    for (const body of exporters) {
      dist[body]  = this.distance(body) / Physics.AU * window.game.planets[body].buyPrice('fuel');
      price[body] = window.game.planets[body].buyPrice(item);
      stock[body] = Math.min(amount, window.game.planets[body].getStock(item));
    }

    const avgDist
      = Object.values(dist).reduce((a, b) => {return a + b}, 0)
      / Object.values(dist).length;

    const avgPrice
      = Object.values(price).reduce((a, b) => {return a + b}, 0)
      / Object.values(price).length;

    const avgStock
      = Object.values(stock).reduce((a, b) => {return a + b}, 0)
      / Object.values(stock).length;

    const distRating:  t.Counter = {};
    const priceRating: t.Counter = {};
    const stockRating: t.Counter = {};
    for (const body of exporters) {
      distRating[body]  = avgDist / dist[body];
      priceRating[body] = avgPrice / price[body];
      stockRating[body] = stock[body] / avgStock;
    }

    // Calculate a rating by comparing distance, price, and number of
    // available units
    let bestPlanet: t.body | void;
    let bestRating = 0;

    for (const body of exporters) {
      const rating = priceRating[body] * stockRating[body] * distRating[body];
      if (rating > bestRating) {
        bestRating = rating;
        bestPlanet = body;
      }
    }

    return bestPlanet;
  }

  /**
   * Returns the number of an item which can be crafted given the resources
   * available in this market.
   */
  canManufacture(item: t.resource): number {
    const res = resources[item];
    const counts: number[] = [];

    if (isCraft(res)) {
      const need = this.getNeed(item);

      for (const mat of Object.keys(res.recipe.materials) as t.resource[]) {
        if (this.getNeed(mat) > need) {
          return 0;
        }

        const avail = this.getStock(mat);

        if (avail == 0) {
          return 0;
        }

        const amount = Math.floor(avail / (res.recipe.materials[mat] || 0));
        counts.push(amount);
      }
    }

    if (counts.length > 0) {
      return counts.reduce((a, b) => a < b ? a : b);
    } else {
      return 0;
    }
  }

  manufactureSlots() {
    return data.max_crafts - this.queue.filter(t => isCraftTask(t)).length;
  }

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
            this.incDemand(mat, diff * (res.recipe.materials[mat] || 0));
          }
        }
      }

      if (--slots <= 0)
        break;
    }
  }

  importSlots(): number {
    return data.max_imports - this.queue.filter(t => isImportTask(t)).length;
  }

  imports() {
    let slots = this.importSlots();

    if (slots <= 0)
      return;

    const need = this.neededResources();
    const want = need.amounts;

    const list = need.prioritized.filter(i => {
      if (this.isNetExporter(i) && !this.hasShortage(i)) {
        // Remove items that we ourselves export or that we aren't short of
        delete want[i];
        return false;
      }

      return true;
    });

    ITEM: for (const item of list) {
      // clamp max amount to the size of a hauler's cargo bay, with a minimum
      // of 2 units for deliveries
      const amount = util.clamp(want[item], 2, data.shipclass.hauler.cargo);
      const planet = this.selectExporter(item, amount);

      if (!planet) {
        continue;
      }

      const [bought, price] = window.game.planets[planet].buy(item, amount);

      if (bought > 0) {
        const distance = this.distance(planet) / Physics.AU;
        const turns = Math.max(3, Math.ceil(Math.log(distance) * 2)) * data.turns_per_day;
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

  luxuriate() {
    this.buy('luxuries', this.scale(3));
  }

  produce() {
    for (const item of t.resources) {
      // allow some surplus to build
      if (this.getStock(item) < this.min_stock || !this.hasSuperSurplus(item)) {
        const amount = this.production(item);
        if (amount > 0) {
          this.sell(item, amount);
        }
      }
    }
  }

  consume() {
    for (const item of t.resources) {
      const amt = this.consumption(item);
      if (amt > 0) {
        this.buy(item, this.consumption(item));
      }
    }
  }

  apply_conditions() {
    // Increment turns on each condition and filter out those which are no
    // longer active.
    this.conditions = this.conditions.filter(c => {
      c.inc_turns();
      return !c.is_over;
    });

    // Test for chance of new conditions
    for (const c of Object.keys(data.conditions)) {
      // Skip conditions that are already active
      if (this.hasCondition(c)) {
        continue;
      }

      // Shortages
      for (const item of Object.keys(data.conditions[c].triggers.shortage)) {
        if (this.hasShortage(item as t.resource)) {
          if (util.chance( data.conditions[c].triggers.shortage[item] )) {
            this.conditions.push(new Condition(c));
          }
        }
      }

      // Surpluses
      for (const item of Object.keys(data.conditions[c].triggers.surplus)) {
        if (this.hasSurplus(item as t.resource)) {
          if (util.chance( data.conditions[c].triggers.surplus[item] )) {
            this.conditions.push(new Condition(c));
          }
        }
      }

      // Conditions
      for (const cond of Object.keys(data.conditions[c].triggers.condition)) {
        if (this.hasCondition(cond) || this.hasTrait(cond)) {
          if (util.chance( data.conditions[c].triggers.condition[cond] )) {
            this.conditions.push(new Condition(c));
          }
        }
      }
    }
  }

  /*
   * Contracts
   */
  refreshContracts() {
    if (this.contracts.length > 0 && window.game) {
      this.contracts = this.contracts.filter(c => c.valid_until >= window.game.turns);
    }

    const want  = util.getRandomInt(0, this.scale(10));
    const dests = t.bodies.filter(t => t != this.body);

    for (const body of t.bodies) {
      if (body != this.body) {
        // add weight to destinations from our own faction
        if (data.bodies[body].faction == this.faction.abbrev) {
          dests.push(body);
        }

        // add weight to capitals
        if (data.factions[data.bodies[body].faction].capital == body) {
          dests.push(body);
        }
      }
    }

    while (this.contracts.length < want) {
      const dest = util.oneOf(dests.filter(d => !this.contracts.find(c => (<Passengers>c.mission).dest == d)));
      const mission = new Passengers({issuer: this.body, dest: dest});

      if (this.contracts.find(c => c.mission.title == mission.title)) {
        continue;
      }

      this.contracts.push({
        valid_until: util.getRandomInt(10, 30) * data.turns_per_day,
        mission: mission,
      });
    }
  }

  acceptMission(mission: Mission) {
    this.contracts = this.contracts.filter(c => c.mission.title != mission.title);
  }

  /*
   * Misc
   */
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

  /*
   * Returns the number of turns until the next expected import or fabrication
   * of the desired resource will arrive. Returns undefined if none are
   * scheduled in the queue. Does not account for agents.
   */
  estimateAvailability(item: t.resource): number|undefined {
    let turns = undefined;

    if (this.getStock(item) > 0)
      return 0;

    const res = resources[item];
    if (isRaw(res) && this.netProduction(item) > 0) {
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

  resourceDependencyPriceAdjustment(resource: t.resource) {
    if (this.hasShortage(resource)) {
      return this.getNeed(resource);
    } else if (this.hasSurplus(resource)) {
      return 1 / this.getNeed(resource);
    } else {
      return 1;
    }
  }

  hasRepairs() {
    //return this.resourceDependencyPriceAdjustment('metal') < 10;
    return this.getStock('metal');
  }

  hullRepairPrice(player: Person) {
    const base     = data.ship.hull.repair;
    const tax      = this.faction.sales_tax;
    const standing = player.getStandingPriceAdjustment(this.faction.abbrev);
    const scarcity = this.resourceDependencyPriceAdjustment('metal');
    return (base + (base * tax) - (base * standing)) * scarcity;
  }

  armorRepairPrice(player: Person) {
    const base     = data.ship.armor.repair;
    const tax      = this.faction.sales_tax;
    const standing = player.getStandingPriceAdjustment(this.faction.abbrev);
    const scarcity = this.resourceDependencyPriceAdjustment('metal');
    return (base + (base * tax) - (base * standing)) * scarcity;
  }
}
