class Market {
  constructor() {
    this.store           = new ResourceCounter;
    this.bought          = new ResourceTracker(data.market_history);
    this.sold            = new ResourceTracker(data.market_history);
    this.buys_this_turn  = new ResourceCounter;
    this.sales_this_turn = new ResourceCounter;
    this.prices          = new DefaultMap(null);
  }

  save() {
    let me = {};
    me.store           = this.store.save();
    me.bought          = this.bought.save();
    me.sold            = this.sold.save();
    me.buys_this_turn  = this.buys_this_turn.save();
    me.sales_this_turn = this.sales_this_turn.save();
    me.prices          = this.prices.save();
    return me;
  }

  load(obj) {
    this.store.load(obj.store);
    this.bought.load(obj.sold);
    this.sold.load(obj.sold);
    this.buys_this_turn.load(obj.buys_this_turn);
    this.sales_this_turn.load(obj.sales_this_turn);
    this.prices.load(obj.prices);
  }

  current_supply(resource) {
    return this.store.get(resource);
  }

  inc_demand(resource, amount) {
    this.buys_this_turn.inc(resource, amount);
  }

  inc_supply(resource, amount) {
    this.sales_this_turn.inc(resource, amount);
  }

  supply(resource) {
    let stock = this.current_supply(resource) || 1;
    let avg   = this.sold.avg(resource)       || 1;
    return Math.max(1, (stock + (3 * avg)) / 4);
  }

  demand(resource) {
    return Math.max(1, this.bought.avg(resource));
  }

  adjustment(resource) {
    const supply = this.supply(resource);
    const demand = this.demand(resource);
    let adjust = demand / supply;
    let markup = 0;

    if (this.current_supply(resource) == 0) {
      markup += data.scarcity_markup;

      if (data.necessity[resource]) {
        markup += data.scarcity_markup;
      }
    }

    if (adjust > 1.1) {
      return markup + 1 + Math.log2(adjust);
    }
    else if (adjust < 0.9) {
      //return Math.atanh(adjust) / Math.asinh(adjust) / 2;
      return markup + Math.sqrt(adjust);
    }
    else {
      return markup + 1;
    }
  }

  calculate_price(resource) {
    let mine    = data.resources[resource].mine;
    let recipe  = data.resources[resource].recipe;
    let value   = null;

    if (mine) {
      value = data.base_unit_price * mine.tics;
    }
    else if (recipe) {
      let mats = recipe.materials;
      let keys = Object.keys(mats);
      let val  = keys.reduce((acc, k) => {return acc + (mats[k] * this.buy_price(k))}, 0);
      if (value === null || val < value)
        value = val;
    }

    return Math.ceil(value * this.adjustment(resource));
  }

  price(resource) {
    if (!this.prices.has(resource))
      this.prices.set(resource, this.calculate_price(resource));
    return this.prices.get(resource);
  }

  buy_price(resource)  { return this.price(resource) }
  sell_price(resource) { return this.price(resource) }

  buy(resource, amount) {
    let available = this.current_supply(resource);

    if (available < amount) {
      throw new Error(`buy: requested ${amount} but only ${available} available of ${resource}`);
    }

    let price = amount * this.buy_price(resource);
    this.store.dec(resource, amount);
    this.inc_demand(resource, amount);
    return price;
  }

  sell(resource, amount) {
    let price = amount * this.sell_price(resource);
    this.store.inc(resource, amount);
    this.inc_supply(resource, amount);
    return price;
  }

  trend(resource, days=10) {
    let turns     = days * (24 / data.hours_per_turn);
    let long_avg  = this.bought.avg(resource) + this.sold.avg(resource);
    let short_avg = this.bought.avg(resource, turns) + this.sold.avg(resource, turns);
    return short_avg - long_avg;
  }

  report() {
    let info = {};
    Object.keys(data.resources).forEach((resource) => {
      let supply = (Math.round(this.supply(resource) * 100) / 100);
      let demand = (Math.round(this.demand(resource) * 100) / 100);

      info[resource] = {
        supply : supply,
        demand : demand,
        stock  : this.current_supply(resource),
        trend  : this.trend(resource),
        price  : this.price(resource),
        buy    : this.buy_price(resource),
        sell   : this.sell_price(resource)
      };
    });
    return info;
  }

  turn() {
    Object.keys(data.resources).forEach((k) => {
      this.sold.add(k, this.sales_this_turn.get(k));
      this.bought.add(k, this.buys_this_turn.get(k));
    });

    this.sales_this_turn.clear();
    this.buys_this_turn.clear();
    this.prices.clear();
  }
}
