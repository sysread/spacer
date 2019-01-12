import data    from './data';
import system  from './system';
import Physics from './physics';
import Store   from './store';
import History from './history';

import * as t from './common';
import * as util from './util';

declare var window: {
  game: any;
}

declare var console: any;


export const resources: { [key: string]: Resource } = {};

export function getResource(item: t.resource): Resource {
  if (!resources[item]) {
    resources[item] = new Resource(item);
  }

  return resources[item];
}


export class Resource {
  name:        t.resource;
  mass:        number;
  contraband?: number;
  mine?:       t.Mining;
  recipe?:     t.Recipe;
  value:       number;

  constructor(name: t.resource) {
    this.name       = name;
    this.mass       = data.resources[name].mass;
    this.contraband = data.resources[name].contraband;
    this.mine       = data.resources[name].mine;
    this.recipe     = data.resources[name].recipe;
    this.value      = this.calculateBaseValue();
  }

  get isMinable()   { return !!this.mine }
  get isCraftable() { return !!this.recipe }
  get mineTurns()   { return this.mine ? this.mine.tics : 0 }
  get craftTurns()  { return this.recipe ? this.recipe.tics : 0 }

  get ingredients(): t.resource[] {
    return this.recipe
      ? (<t.resource[]>Object.keys(this.recipe.materials))
      : [];
  }

  calculateBaseValue() {
    let value = 0;

    if (this.mine) {
      value = this.mine.value;
    }
    else if (this.recipe) {
      for (const mat of this.ingredients) {
        value += this.recipe.materials[mat] * getResource(mat).calculateBaseValue();
      }

      value += Math.max(1, util.R(data.craft_fee * value, 2));

      for (let i = 0; i < this.recipe.tics; ++i) {
        value *= 1.5;
      }
    }

    return value;
  }
}


export class Faction {
  abbrev:     t.faction;
  full_name:  string;
  capital:    string;
  sales_tax:  number;
  patrol:     number;
  inspection: number;
  produces:   Store;
  consumes:   Store;
  standing:   { [key: string]: number };

  constructor(abbrev: t.faction | Faction) {
    if (typeof abbrev == 'object') {
      abbrev = abbrev.abbrev;
    }

    this.abbrev     = abbrev;
    this.full_name  = data.factions[abbrev].full_name;
    this.capital    = data.factions[abbrev].capital;
    this.sales_tax  = data.factions[abbrev].sales_tax;
    this.patrol     = data.factions[abbrev].patrol;
    this.inspection = data.factions[abbrev].inspection;
    this.consumes   = new Store(data.factions[abbrev].consumes);
    this.produces   = new Store(data.factions[abbrev].produces);
    this.standing   = data.factions[abbrev].standing;
  }

  get desc() { return data.factions[this.abbrev].desc }
  toString() { return this.abbrev }
}


export class Trait implements t.Trait {
  name:     string;
  produces: t.Counter;
  consumes: t.Counter;
  price:    t.Counter;

  constructor(name: string) {
    this.name     = name;
    this.produces = data.traits[name].produces || {};
    this.consumes = data.traits[name].consumes || {};
    this.price    = data.traits[name].price    || {};
  }
};


interface SavedCondition {
  name:        string;
  turns_total: number;
  turns_done:  number;
}

export class Condition {
  name:        string;
  turns_total: number;
  turns_done:  number;
  produces:    Store;
  consumes:    Store;

  constructor(name: string, init?: SavedCondition) {
    this.name     = name;
    this.produces = new Store;
    this.consumes = new Store;

    if (init) {
      this.turns_total = init.turns_total;
      this.turns_done  = init.turns_done;
    }
    else {
      this.turns_total = data.turns_per_day * util.getRandomInt(this.data.days[0], this.data.days[1]);
      this.turns_done  = 0;
    }
  }

  get data()         { return data.conditions[this.name] }
  get triggers()     { return this.data.triggers }
  get on_shortage()  { return this.triggers.shortage  || {} }
  get on_surplus()   { return this.triggers.surplus   || {} }
  get on_condition() { return this.triggers.condition || {} }

  get turns_left()   { return this.turns_total - this.turns_done }
  get is_over()      { return this.turns_done >= this.turns_total }

  inc_turns()        { ++this.turns_done }
};


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

type EconTask =
  ImportTask
| CraftTask;

interface SavedPlanet {
  conditions?: SavedCondition[];
  stock?:      any;
  supply?:     any;
  demand?:     any;
  need?:       any;
  pending?:    any;
  queue?:      any;
  cycle?:      any;
}

export class Planet {
  body:           t.body;
  name:           string;
  size:           string;
  radius:         number;
  faction:        Faction;
  traits:         Trait[];
  conditions:     Condition[];

  max_fab_units:  number;
  max_fab_health: number;
  fab_health:     number;

  work_tasks:     t.Work[];

  stock:          Store;
  supply:         History;
  demand:         History;
  need:           History;
  pending:        Store;
  queue:          EconTask[];
  cycle:          t.Counter;

  produces:       Store;
  consumes:       Store;

  _isNetExporter: {[key: string]: boolean};
  _getShortage:   {[key: string]: boolean};
  _getSurplus:    {[key: string]: boolean};
  _getDemand:     t.Counter;
  _getSupply:     t.Counter;
  _getNeed:       t.Counter;
  _price:         t.Counter;

  constructor(body: t.body, init?: SavedPlanet) {
    init = init || {};

    /*
     * Physical and faction
     */
    this.body    = body;
    this.name    = data.bodies[body].name;
    this.size    = data.bodies[body].size;
    this.faction = new Faction(data.bodies[body].faction);
    this.radius  = system.body(body).radius;
    this.traits  = data.bodies[body].traits.map((t) => {return new Trait(t)});

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
            this.work_tasks.push(task);
            continue TASK;
          }
        }
      }
    }

    /*
     * Economics
     */
    this.stock   = new Store(init.stock);
    this.supply  = new History(data.market_history, init.supply);
    this.demand  = new History(data.market_history, init.demand);
    this.need    = new History(data.market_history, init.need);
    this.pending = new Store(init.pending);
    this.queue   = init.queue || [];
    this.cycle   = init.cycle || {};

    this.produces = new Store;
    this.consumes = new Store;
    for (const item of t.resources) {
      this.produces.inc(item, this.scale(data.market.produces[item]));
      this.consumes.inc(item, this.scale(data.market.consumes[item]));

      this.produces.inc(item, this.scale(this.faction.produces.get(item)));
      this.consumes.inc(item, this.scale(this.faction.consumes.get(item)));

      for (const trait of this.traits) {
        this.produces.inc(item, this.scale(trait.produces[item]));
        this.consumes.inc(item, this.scale(trait.consumes[item]));
      }

      this.cycle[item] = util.getRandomInt(3, 10);
    }

    // Assign directly in constructor rather than in clearMemos for
    // performance reasons. V8's jit will produce more optimized classes by
    // avoiding dynamic assignment in the constructor.
    this._isNetExporter = {};
    this._getDemand     = {};
    this._getSupply     = {};
    this._getNeed       = {};
    this._getShortage   = {};
    this._getSurplus    = {};
    this._price         = {};
  }

  get desc() { return data.bodies[this.body].desc }

  /*
   * Physical
   */
  get kind()     { return system.kind(this.body) }
  get central()  { return system.central(this.body) }
  get gravity()  { return system.gravity(this.body) }
  get position() { return system.position(this.body) }

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
   * Patrols and inspections
   */
  patrolRate(distance=0) {
    const rate = this.scale(this.faction.patrol);

    const invsq = distance > data.jurisdiction
      ? rate * Math.pow(data.jurisdiction, 2) / Math.pow(distance, 2)
      : rate;

    return Math.max(0, invsq);
  }

  inspectionRate(player: any) {
    const standing = 1 - (player.getStanding(this.faction.abbrev) / data.max_abs_standing);
    return this.scale(this.faction.inspection) * standing;
  }

  inspectionFine(player: any) {
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
    const resource = getResource(item);

    if (!resource.isCraftable) {
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
    const resource = getResource(item);

    if (!resource.isCraftable) {
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

  fabricationFee(item: t.resource, count=1, player: any) {
    const resource = getResource(item);
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
    const resource = getResource(item);

    if (!resource.isCraftable) {
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

  payRate(player: any, task: t.Work) {
    let rate = this.scale(task.pay);
    rate += rate * player.getStandingPriceAdjustment(this.faction.abbrev);
    rate -= rate * this.faction.sales_tax;
    return Math.ceil(rate);
  }

  work(player: any, task: t.Work, days: number) {
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
    if (this.production(item) > 0 && Math.random() <= data.market.minability) {
      return Math.min(1, this.production(item));
    }

    return 0;
  }

  /*
   * Economics
   */
  scale(n=0)                       { return data.scales[this.size] * n }
  getStock(item: t.resource)       { return this.stock.count(item) }
  shortageFactor(item: t.resource) { return this.isNetExporter(item) ? 4 : 6 }
  surplusFactor(item: t.resource)  { return this.isNetExporter(item) ? 0.2 : 0.8 }
  avgProduction(item: t.resource)  { return this.getSupply(item) - this.consumption(item) }
  netProduction(item: t.resource)  { return this.production(item) - this.consumption(item) }

  getDemand(item: t.resource) {
    if (!this._getDemand.hasOwnProperty(item))
      this._getDemand[item] = this.demand.avg(item);
    return this._getDemand[item];
  }

  getSupply(item: t.resource) {
    if (!this._getSupply.hasOwnProperty(item))
      this._getSupply[item] = this.supply.avg(item);
    return this._getSupply[item];
  }

  hasShortage(item: t.resource) {
    if (!this._getShortage.hasOwnProperty(item))
      this._getShortage[item] = this.getNeed(item) >= this.shortageFactor(item);
    return this._getShortage[item];
  }

  hasSurplus(item: t.resource) {
    if (!this._getSurplus.hasOwnProperty(item))
      this._getSurplus[item] = this.getNeed(item) <= this.surplusFactor(item);
    return this._getSurplus[item];
  }

  production(item: t.resource) {
    let amount = this.produces.get(item) / data.turns_per_day;

    for (const condition of this.conditions) {
      amount += this.scale(condition.produces.get(item));
    }

    return amount;
  }

  consumption(item: t.resource) {
    let amount = this.consumes.get(item) / data.turns_per_day;

    for (const condition of this.conditions) {
      amount += this.scale(condition.consumes.get(item));
    }

    return amount;
  }

  incDemand(item: t.resource, amount: number) {
    this.demand.inc(item, amount);

    const res = getResource(item);
    if (res.recipe && this.hasShortage(item)) {
      for (const mat of res.ingredients) {
        this.incDemand(mat, res.recipe.materials[mat]);
      }
    }
  }

  incSupply(item: t.resource, amount: number) {
    this.supply.inc(item, amount);
  }

  isNetExporter(item: t.resource) {
    if (!this._isNetExporter.hasOwnProperty(item)) {
      let isExporter = false;

      const res = getResource(item);

      if (res.isMinable) {
        const net = this.netProduction(item);
        isExporter = net >= this.scale(1);
      }

      if (!isExporter && res.isCraftable) {
        let matExporter = true;
        for (const mat of res.ingredients) {
          if (!this.isNetExporter(mat)) {
            matExporter = false;
            break;
          }
        }

        isExporter = matExporter;
      }

      this._isNetExporter[item] = isExporter;
    }

    return this._isNetExporter[item];
  }

  // TODO include distance and delivery time from nearest source
  getNeed(item: t.resource) {
    if (!this._getNeed.hasOwnProperty(item)) {
      let result;
      const markup = data.necessity[item] ? 1 + data.scarcity_markup : 1;

      const d = this.getDemand(item);
      if (d === 0) {
        result = markup * d / this.surplusFactor(item);
      }
      else {
        const s = (this.getStock(item) + this.getSupply(item)) / 2;

        if (s === 0) {
          result = markup * d * this.shortageFactor(item);
        }
        else {
          result = markup * d / s;
        }
      }

      this._getNeed[item] = result;
    }

    return this._getNeed[item];
  }

  getScarcityMarkup(item: t.resource) {
    let markup = 1;

    if (data.necessity[item]) {
      markup += data.scarcity_markup;
    }

    for (const condition of this.conditions) {
      const consumption = this.scale(condition.consumes.get(item));
      const production  = this.scale(condition.produces.get(item));
      const amount      = consumption - production; // production is generally a malus
      markup += amount;
    }

    return markup;
  }

  price(item: t.resource) {
    const res = getResource(item);

    if (!this.hasOwnProperty('_price')) {
      this._price = {};
    }

    if (window.game.turns % (this.cycle[item] % 24 / data.hours_per_turn) === 0) {
      delete this._price[item];
    }

    if (!this._price.hasOwnProperty(item)) {
      const value  = res.value;
      const markup = this.getScarcityMarkup(item);
      const need   = this.getNeed(item);

      if (need > 1) {
        this._price[item] = Math.ceil(markup * Math.min(value * 2, value + (value * Math.log(need))));
      } else if (need < 1) {
        this._price[item] = Math.ceil(markup * Math.max(value / 2, value * need));
      } else {
        this._price[item] = Math.ceil(markup * value);
      }

      // Special cases for market classifications
      for (const trait of this.traits) {
        if (trait.hasOwnProperty('price') && trait.price.hasOwnProperty(item)) {
          this._price[item] -= this._price[item] * trait.price[item];
        }
      }

      this._price[item] = Math.ceil(this._price[item]);
    }

    return this._price[item];
  }

  sellPrice(item: t.resource) {
    return this.price(item);
  }

  buyPrice(item: t.resource, player?: any): number {
    const base  = this.price(item);
    const price = base + (base * this.faction.sales_tax);

    return player
      ? util.R(price * (1 - player.getStandingPriceAdjustment(this.faction.abbrev)))
      : util.R(price);
  }

  buy(item: t.resource, amount: number, player?: any) {
    const bought = Math.min(amount, this.getStock(item));
    const price  = bought * this.buyPrice(item, player);

    this.incDemand(item, amount);
    this.stock.dec(item, bought);

    if (player && bought) {
      player.debit(price);
      player.ship.loadCargo(item, bought);
    }

    return [bought, price];
  }

  sell(item: t.resource, amount: number, player?: any) {
    const hadShortage = this.hasShortage(item);
    const price = amount * this.sellPrice(item);
    this.stock.inc(item, amount);

    let standing = 0;

    if (player) {
      player.ship.unloadCargo(item, amount);
      player.credit(price);

      if (hadShortage && !getResource(item).contraband) {
        // Player ended a shortage. Increase their standing with our faction.
        if (!this.hasShortage(item)) {
          standing = util.getRandomNum(1, 5);
          player.incStanding(this.faction.abbrev, standing);
        }
        // Player contributed toward ending a shortage. Increase their
        // standing with our faction slightly.
        else {
          player.incStanding(this.faction.abbrev, 1);
          standing = 1;
        }
      }
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
    const amount = this.getDemand(item.name) - this.getStock(item.name) - this.pending.get(item.name);
    return Math.max(Math.ceil(amount), 0);
  }

  neededResources() {
    // Calculate how many of each item we want
    const amounts: { [key: string]: number } = {};
    for (const item of t.resources) {
      const amount = this.neededResourceAmount(getResource(item));

      if (amount > 0) {
        amounts[item] = amount;
      }
    }

    // Pre-calculate each item's need
    const need: { [key: string]: number } = {};
    for (const item of Object.keys(amounts)) {
      need[item] = this.getNeed(item as t.resource);
    }

    // Sort the greatest needs to the front of the list
    const prioritized = (<t.resource[]>Object.keys(amounts)).sort((a, b) => {
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
    const bodies = (<t.body[]>Object.keys(window.game.planets));
    return bodies.filter(name => {
      const p = window.game.planets[name];
      return p.body !== this.body
          && !p.hasShortage(item)
          && p.getStock(item) >= 1
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

  manufacture() {
    const need = this.neededResources();
    const want = need.amounts;
    const list: t.resource[] = [];

    for (const i of (<t.resource[]>need.prioritized)) {
      const res = getResource(i);

      // Not craftable or we do not need it
      if (!res.recipe || this.getNeed(i) < 0.25) {
        delete want[i];
      }
      else {
        // Cache so we don't recalculate these over and over
        const mat_stock: t.Counter = {};
        const mat_short: { [key: string]: boolean } = {};

        for (const mat of res.ingredients) {
          if (!mat_stock[mat]) mat_stock[mat] = this.getStock(mat);
          if (!mat_short[mat]) mat_short[mat] = this.hasShortage(mat);

          if (mat_stock[mat] < res.recipe.materials[mat] || mat_short[mat]) {
            this.incDemand(mat, res.recipe.materials[mat]);
          }
        }

        list.push(i);
      }
    }

    while (Object.keys(want).length > 0) {
      const items = list
        .filter(i => want[i])
        .map(i => getResource(i));

      for (const item of items) {
        if (item.recipe) {
          for (const mat of item.ingredients) {
            this.buy(mat, item.recipe.materials[mat]);
          }
        }

        if (--want[item.name] === 0) {
          delete want[item.name];
        }

        this.schedule({
          type:  'craft',
          turns: this.fabricate(item.name),
          item:  item.name,
          count: 1,
        });
      }
    }
  }

  imports() {
    if (this.queue.length > 10)
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
      // Import amounts should be between 5-20 units
      const amount = util.clamp(want[item] * (data.necessity[item] ? 2 : 1), 5, 20);
      const planet = this.selectExporter(item, amount);

      if (!planet) {
        continue;
      }

      const [bought, price] = window.game.planets[planet].buy(item, amount);

      if (bought > 0) {
        const distance = this.distance(planet) / Physics.AU;
        const turns = Math.ceil(distance * (24 / data.hours_per_turn) * 5); // 5 days per AU
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
    }
  }

  produce() {
    for (const item of this.produces.keys()) {
      const amount = this.production(item);
      if (amount > 0 && !this.hasSurplus(item)) {
        this.sell(item, amount);
      }
    }
  }

  consume() {
    for (const item of this.consumes.keys()) {
      const amt = this.consumption(item);
      if (amt > 0) {
        this.buy(item, this.consumption(item));
      }
    }
  }

  rollups() {
    if (window.game.turns % (24 / data.hours_per_turn) === 0) {
      for (const item of this.stock.keys()) {
        this.incSupply(item, this.getStock(item));
      }

      this.supply.rollup();
      this.demand.rollup();

      for (const item of this.need.keys()) {
        this.need.inc(item, this.getNeed(item));
      }

      this.need.rollup();
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

  clearMemos() {
    this._isNetExporter = {};
    this._getDemand     = {};
    this._getSupply     = {};
    this._getNeed       = {};
    this._getShortage   = {};
    this._getSurplus    = {};
  }

  turn() {
    this.clearMemos();
    this.produce();
    this.consume();
    this.processQueue();
    this.manufacture();
    this.replenishFabricators();
    this.imports();
    this.apply_conditions();
    this.rollups();
  }

  /*
   * Misc
   */
  addonPrice(addon: t.addon, player: any) {
    const base     = data.addons[addon].price;
    const standing = base * player.getStandingPriceAdjustment(this.faction.abbrev);
    const tax      = base * this.faction.sales_tax;

    let price = base - standing + tax;

    for (const trait of this.traits) {
      if ('price' in trait && 'addons' in trait.price) {
        price -= base * trait.price.addons;
      }
    }

    return price;
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
    return this.resourceDependencyPriceAdjustment('metal') < 10;
  }

  hullRepairPrice(player: any) {
    const base     = data.ship.hull.repair;
    const tax      = this.faction.sales_tax;
    const standing = player.getStandingPriceAdjustment(this.faction.abbrev);
    const scarcity = this.resourceDependencyPriceAdjustment('metal');
    return (base + (base * tax) - (base * standing)) * scarcity;
  }

  armorRepairPrice(player: any) {
    const base     = data.ship.armor.repair;
    const tax      = this.faction.sales_tax;
    const standing = player.getStandingPriceAdjustment(this.faction.abbrev);
    const scarcity = this.resourceDependencyPriceAdjustment('metal');
    return (base + (base * tax) - (base * standing)) * scarcity;
  }
}
