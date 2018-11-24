/*
 * Special case: must use window.game to avoid circular reference with game.js
 */
define(function(require, exports, module) {
  const data      = require('data');
  const system    = require('system');
  const util      = require('util');
  const Physics   = require('physics');
  const resources = [];

  const Resource = class {
    constructor(name) {
      this.name        = name;
      this.mass        = data.resources[name].mass;
      this.contraband  = data.resources[name].contraband;
      this.isMinable   = data.resources[name].mine !== undefined;
      this.isCraftable = data.resources[name].recipe !== undefined;
      this.mineTurns   = this.isMinable ? data.resources[name].mine.tics : null;
      this.craftTurns  = this.isCraftable ? data.resources[name].recipe.tics : null;
      this.recipe      = this.isCraftable ? data.resources[name].recipe.materials : null;
      this.ingredients = this.isCraftable ? Object.keys(this.recipe) : [];
      this.value       = this.calculateBaseValue();
    }

    calculateBaseValue() {
      let value = 0;

      if (this.isMinable) {
        value = data.resources[this.name].mine.value;
      }
      else if (this.isCraftable) {
        for (const mat of Object.keys(this.recipe)) {
          value += this.recipe[mat] * resources[mat].calculateBaseValue();
        }

        value += Math.max(1, util.R(data.craft_fee * value, 2));

        for (let i = 0; i < this.craftTurns; ++i) {
          value *= 1.5;
        }
      }

      return value;
    }
  };


  const Faction = class {
    constructor(abbrev) {
      // Faction instance rather than abbrev string
      if (abbrev.hasOwnProperty('abbrev')) {
        abbrev = abbrev.abbrev;
      }

      this.abbrev    = abbrev;
      this.full_name = data.factions[abbrev].full_name;
      this.capital   = data.factions[abbrev].capital;
      this.sales_tax = data.factions[abbrev].sales_tax;
      this.patrol    = data.factions[abbrev].patrol;
      this.patrol    = data.factions[abbrev].patrol;
      this.produces  = new Store(data.factions[abbrev].produces);
      this.consumes  = new Store(data.factions[abbrev].consumes);
    }

    get desc() { return data.factions[abbrev].desc }
    toString() { return this.abbrev }
  };


  const Trait = class {
    constructor(name) {
      this.name     = name;
      this.produces = new Store(this.data.produces);
      this.consumes = new Store(this.data.consumes);
    }

    get data() { return data.traits[this.name] }
  };


  const Condition = class extends Trait {
    constructor(name, init) {
      super(name);

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


  const Store = class {
    constructor(init) {
      if (init && init.hasOwnProperty('store')) {
        this.store = init.store;
      }
      else if (init) {
        this.store = init;
      }
      else {
        this.store = {};
        for (const item of Object.keys(resources)) {
          this.store[item] = 0;
        }
      }
    }

    item(item)     { return resources[item] }
    get keys()     { return Object.keys(this.store) }
    set(item, amt) { this.store[item] = amt }
    get(item)      { return this.store[item] }
    count(item)    { return Math.floor(this.store[item]) }

    sum() {
      let n = 0;
      for (const k of Object.keys(this.store))
        n += this.store[k];
      return n;
    }

    dec(item, amount) {
      this.inc(item, -amount);
    }

    inc(item, amount=0) {
      if (!this.store.hasOwnProperty(item)) {
        throw new Error('not found: ' + item);
      }

      this.store[item] = this.store[item] + amount;

      if (this.store[item] < 0) {
        this.store[item] = 0;
      }
    }
  };


  const History = class {
    constructor(length, init) {
      init = init || {};
      this.length  = length;
      this.history = init.history;
      this.sum     = new Store(init.sum);
      this.daily   = new Store(init.daily);

      if (!this.history) {
        this.history = {};
        for (const item of Object.keys(resources)) {
          this.history[item] = [];
        }
      }
    }

    inc(item, n) { return this.daily.inc(item, n) }
    dec(item, n) { return this.daily.dec(item, n) }
    nth(item, n) { return this.history[item][n] }
    get keys()   { return this.sum.keys }
    item(item)   { return this.sum.item(item) }
    get(item)    { return this.sum.get(item) }
    count(item)  { return this.sum.count(item) }

    avg(item) {
      if (this.history[item].length === 0) {
        return 0;
      }

      return this.sum.get(item) / this.history[item].length;
    }

    add(item, amount) {
      if (!this.history.hasOwnProperty(item)) {
        throw new Error('not found: ' + item);
      }

      this.history[item].unshift(amount);
      this.sum.inc(item, amount);

      while (this.history[item].length > this.length) {
        this.sum.dec(item, this.history[item].pop());
      }
    }

    rollup() {
      for (const item of Object.keys(resources)) {
        this.add(item, this.daily.get(item));
      }

      this.daily = new Store;
    }
  };


  const Planet = class {
    constructor(body, init) {
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
      for (const item of Object.keys(resources)) {
        this.produces.inc(item, this.scale(data.market.produces[item]));
        this.consumes.inc(item, this.scale(data.market.consumes[item]));

        this.produces.inc(item, this.scale(this.faction.produces.get(item)));
        this.consumes.inc(item, this.scale(this.faction.consumes.get(item)));

        for (const trait of this.traits) {
          this.produces.inc(item, this.scale(trait.produces.get(item)));
          this.consumes.inc(item, this.scale(trait.consumes.get(item)));
        }

        this.cycle[item] = util.getRandomInt(3, 10);
      }

      this.clearMemos();
    }

    get desc() { return data.bodies[this.body].desc }

    /*
     * Physical
     */
    get kind()       { return system.kind(this.body) }
    get central()    { return system.central(this.body) }
    get gravity()    { return system.gravity(this.body) }
    get position()   { return system.position(this.body) }
    distance(toBody) { return system.distance(this.body, toBody) }

    hasTrait(trait) {
      for (const t of this.traits) {
        if (t.name == trait) {
          return true;
        }
      }

      return false;
    }

    hasCondition(condition) {
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

    inspectionRate(ignore_standing=false) {
      if (ignore_standing) {
        return this.scale(this.faction.inspection);
      }
      else {
        const standing = 1 - (window.game.player.getStanding(this.faction.abbrev) / data.max_abs_standing);
        return this.scale(this.faction.inspection) * standing;
      }
    }

    inspectionFine() {
      return Math.max(10, data.max_abs_standing - window.game.player.getStanding(this.faction));
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

    fabricationTime(item, count=1) {
      const resource = resources[item];

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

    hasFabricationResources(item, count=1) {
      const resource = resources[item];

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

    fabricationFee(item, count=1, player) {
      const resource = resources[item];
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

    fabricate(item) {
      const resource = resources[item];

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

    payRate(player, task) {
      let rate = this.scale(task.pay);
      rate += rate * player.getStandingPriceAdjustment(this.faction.abbrev);
      rate -= rate * this.faction.sales_tax;
      return Math.ceil(rate);
    }

    work(player, task, days) {
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

    mine(item) {
      if (this.production(item) > 0 && Math.random() <= data.market.minability) {
        return Math.min(1, this.production(item));
      }

      return 0;
    }

    /*
     * Economics
     */
    scale(n=0)           { return data.scales[this.size] * n }

    getStock(item)       { return this.stock.count(item) }
    getSupply(item)      { return this.supply.avg(item) }
    getDemand(item)      { return this.demand.avg(item) }

    shortageFactor(item) { return this.isNetExporter(item) ? 4 : 6 }
    hasShortage(item)    { return this.getNeed(item) >= this.shortageFactor(item) }

    surplusFactor(item)  { return this.isNetExporter(item) ? 0.2 : 0.8 }
    hasSurplus(item)     { return this.getNeed(item) <= this.surplusFactor(item) }

    avgProduction(item)  { return this.getSupply(item) - this.consumption(item) }
    netProduction(item)  { return this.production(item) - this.consumption(item) }

    production(item) {
      let amount = this.produces.get(item) / data.turns_per_day;

      for (const condition of this.conditions) {
        amount += this.scale(condition.produces.get(item));
      }

      return amount;
    }

    consumption(item) {
      let amount = this.consumes.get(item) / data.turns_per_day;

      for (const condition of this.conditions) {
        amount += this.scale(condition.consumes.get(item));
      }

      return amount;
    }

    incDemand(item, amount) {
      this.demand.inc(item, amount);

      if (resources[item].isCraftable && this.hasShortage(item)) {
        for (const mat of resources[item].ingredients) {
          this.incDemand(mat, resources[item].recipe[mat]);
        }
      }
    }

    incSupply(item, amount) {
      this.supply.inc(item, amount);
    }

    isNetExporter(item) {
      if (!this._isNetExporter.hasOwnProperty(item)) {
        let isExporter = false;

        if (resources[item].isMinable) {
          const net = this.netProduction(item);
          isExporter = net >= this.scale(1);
        }

        if (!isExporter && resources[item].isCraftable) {
          let matExporter = true;
          for (const mat of resources[item].ingredients) {
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
    getNeed(item) {
      const markup = data.necessity[item] ? 1 + data.scarcity_markup : 1;

      const d = this.getDemand(item);
      if (d === 0) return markup * this.getDemand(item) / this.surplusFactor(item);

      const s = (this.getStock(item) + this.getSupply(item)) / 2;
      if (s === 0) return markup * this.getDemand(item) * this.shortageFactor(item);

      return markup * d / s;
    }

    getScarcityMarkup(item) {
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

    price(item) {
      if (!resources.hasOwnProperty(item)) {
        throw new Error(`unrecognized resource: ${item}`);
      }

      if (!this.hasOwnProperty('_price')) {
        this._price = {};
      }

      if (window.game.turns % (this.cycle[item] % 24 / data.hours_per_turn) === 0) {
        delete this._price[item];
      }

      if (!this._price.hasOwnProperty(item)) {
        const value  = resources[item].value;
        const markup = this.getScarcityMarkup(item);
        const need   = this.getNeed(item);

        if (need > 1) {
          //this._price[item] = Math.ceil(markup * Math.min(value * 3, value * (1 + (need / (need + 5)))));
          this._price[item] = Math.ceil(markup * Math.min(value * 2, value + (value * Math.log10(need))));
        } else if (need < 1) {
          this._price[item] = Math.ceil(markup * Math.max(value / 2, value * need));
        } else {
          this._price[item] = Math.ceil(markup * value);
        }
      }

      // Special cases for market classifications
      for (const trait of this.traits) {
        if (trait.hasOwnProperty('price')
         && trait.price.hasOwnProperty(item))
        {
          this._price[item] -= this._price[item] * trait.price[item];
        }
      }

      return this._price[item];
    }

    sellPrice(item) {
      return this.price(item);
    }

    buyPrice(item, player) {
      const base  = this.price(item);
      const price = base + (base * this.faction.sales_tax);

      return player
        ? util.R(price * (1 - player.getStandingPriceAdjustment(this.faction.abbrev)))
        : util.R(price);
    }

    buy(item, amount, player) {
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

    sell(item, amount, player) {
      const hadShortage = this.hasShortage(item);
      const price = amount * this.sellPrice(item);
      this.stock.inc(item, amount);

      let standing = 0;

      if (player) {
        player.ship.unloadCargo(item, amount);
        player.credit(price);

        if (hadShortage && !resources[item].contraband) {
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

    schedule(task) {
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

    neededResourceAmount(item) {
      const amount = Math.ceil(this.getDemand(item.name) - this.getStock(item.name) - this.pending.get(item.name));
      return amount > 0 ? amount : 0;
    }

    neededResources() {
      // Calculate how many of each item we want
      const amounts = {};
      for (const item of Object.values(resources)) {
        const amount = this.neededResourceAmount(item);
        if (amount > 0) amounts[item.name] = amount;
      }

      // Sort the greatest needs to the front of the list
      const prioritized = Object.keys(amounts).sort((a, b) => {
        const diff = this.getNeed(a) - this.getNeed(b);
        return diff > 0 ? -1
             : diff < 0 ?  1
             : 0;
      });

      return {'prioritized': prioritized, 'amounts': amounts};
    }

    exporters(item) {
      return Object.keys(window.game.planets).filter(name => {
        const p = window.game.planets[name];
        return p.body !== this.body
            && !p.hasShortage(item)
            && p.getStock(item) >= 1
            && (p.hasSurplus(item) || p.isNetExporter(item));
      });
    }

    selectExporter(item, amount) {
      const exporters = this.exporters(item);

      if (exporters.length === 0)
        return;

      // Calculate a rating based on difference from average distance, price, stock
      const dist  = {}, price = {}, stock = {};
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

      const distRating  = {}, priceRating = {}, stockRating = {};
      for (const body of exporters) {
        distRating[body]  = avgDist / dist[body];
        priceRating[body] = avgPrice / price[body];
        stockRating[body] = stock[body] / avgStock;
      }

      // Calculate a rating by comparing distance, price, and number of
      // available units
      let bestRating = 0, bestPlanet = null;
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
      const list = [];

      for (const i of need.prioritized) {
        let canCraft = true;

        // Not craftable or we do not need it
        if (!resources[i].isCraftable || this.getNeed(i) < 0.25) {
          canCraft = false;
        }

        // Cache so we don't recalculate these over and over
        const mat_stock = {};
        const mat_short = {};

        for (const mat of resources[i].ingredients) {
          for (const mat of resources[i].ingredients) {
            if (!mat_stock[mat]) mat_stock[mat] = this.getStock(mat);
            if (!mat_short[mat]) mat_short[mat] = this.hasShortage(mat);

            if (mat_stock[mat] < resources[i].recipe[mat] || mat_short[mat]) {
              this.incDemand(mat, resources[i].recipe[mat]);
              canCraft = false;
            }
          }
        }

        if (canCraft) {
          list.push(i);
        } else {
          delete want[i];
        }
      }

      while (Object.keys(want).length > 0) {
        const items = list
          .filter(i => want[i])
          .map(i => resources[i]);

        for (const item of items) {
          for (const mat of item.ingredients) {
            this.buy(mat, item.recipe[mat]);
          }

          if (--want[item.name] === 0) {
            delete want[item.name];
          }

          const turns = this.fabricate(item.name);

          this.schedule({
            type:  'craft',
            turns: turns,
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
        if (!planet) continue;

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
      for (const item of this.produces.keys) {
        const amount = this.production(item);
        if (amount > 0 && !this.hasSurplus(item)) {
          this.sell(item, amount);
        }
      }
    }

    consume() {
      for (const item of this.consumes.keys) {
        this.buy(item, this.consumption(item));
      }
    }

    rollups() {
      if (window.game.turns % (24 / data.hours_per_turn) === 0) {
        for (const item of this.stock.keys) {
          this.incSupply(item, this.getStock(item));
        }

        this.supply.rollup();
        this.demand.rollup();

        for (const item of this.need.keys) {
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
          if (this.hasShortage(item)) {
            if (util.chance( data.conditions[c].triggers.shortage[item] )) {
              this.conditions.push(new Condition(c));
            }
          }
        }

        // Surpluses
        for (const item of Object.keys(data.conditions[c].triggers.surplus)) {
          if (this.hasSurplus(item)) {
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
    addonPrice(addon, player) {
      const base     = data.addons[addon].price;
      const standing = base * player.getStandingPriceAdjustment(this.faction.abbrev);
      const tax      = base * this.faction.sales_tax;

      let price = base - standing + tax;

      for (const trait of this.traits) {
        if (trait.hasOwnProperty('price') && trait.price.hasOwnProperty('addons')) {
          price -= base * traits.price.addons;
        }
      }

      return price;
    }

    resourceDependencyPriceAdjustment(resource) {
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

    hullRepairPrice(player) {
      const base     = data.ship.hull.repair;
      const tax      = this.faction.sales_tax;
      const standing = player.getStandingPriceAdjustment(this.faction.abbrev);
      const scarcity = this.resourceDependencyPriceAdjustment('metal');
      return (base + (base * tax) - (base * standing)) * scarcity;
    }

    armorRepairPrice(player) {
      const base     = data.ship.armor.repair;
      const tax      = this.faction.sales_tax;
      const standing = player.getStandingPriceAdjustment(this.faction.abbrev);
      const scarcity = this.resourceDependencyPriceAdjustment('metal');
      return (base + (base * tax) - (base * standing)) * scarcity;
    }
  };


  for (const name of Object.keys(data.resources))
    resources[name] = new Resource(name);


  exports.resources = resources;
  exports.Resource  = Resource;
  exports.Store     = Store;
  exports.Faction   = Faction;
  exports.Trait     = Trait;
  exports.Condition = Condition;
  exports.History   = History;
  exports.Planet    = Planet;
});
