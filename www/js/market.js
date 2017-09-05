class Market {
  constructor() {
    this.store           = new ResourceCounter;

    this.sold            = new ResourceTracker(data.demand_history);
    this.sales_this_turn = new ResourceCounter;

    this.bought          = new ResourceTracker(data.demand_history);
    this.buys_this_turn  = new ResourceCounter;

    this.sell_total      = new ResourceCounter;
    this.buy_total       = new ResourceCounter;
    this.prices          = new DefaultMap(null);
  }

  save() {
    let me = {};
    me.store           = this.store.save();
    me.sold            = this.sold.save();
    me.sales_this_turn = this.sales_this_turn.save();
    me.bought          = this.bought.save();
    me.buys_this_turn  = this.buys_this_turn.save();
    me.sell_total      = this.sell_total.save();
    me.buy_total       = this.buy_total.save();
    me.prices          = this.prices.save();
    return me;
  }

  load(obj) {
    this.store.load(obj.store);
    this.sold.load(obj.sold);
    this.sales_this_turn.load(obj.sales_this_turn);
    this.bought.load(obj.sold);
    this.buys_this_turn.load(obj.buys_this_turn);
    this.sell_total.load(obj.sell_total);
    this.buy_total.load(obj.buy_total);
    this.prices.load(obj.prices);
  }

  current_supply(resource) {
    return this.store.get(resource);
  }

  supply(resource) {
    let stock = this.current_supply(resource) || 1;
    let avg   = this.bought.avg(resource)     || 1;
    return stock * (1 + Math.log10(avg));
  }

  demand(resource) {
    return Math.max(1, this.sold.avg(resource));
  }

  adjustment(resource) {
    let supply = this.supply(resource) || 1;
    let demand = this.demand(resource) || 1;
    let adjust = demand / supply;

    if (this.current_supply(resource) == 0) {
      adjust += data.scarcity_markup;

      if (data.necessity[resource]) {
        adjust += data.scarcity_markup;
      }
    }

    return 1 + Math.log(1 + adjust);
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
      let val  = keys.reduce((acc, k) => {return acc + (mats[k] * this.price(k))}, 0);
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
    this.sales_this_turn.inc(resource, amount);
    this.buy_total.inc(resource, amount);
    this.prices.delete(resource);
    return price;
  }

  sell(resource, amount) {
    let price = amount * this.sell_price(resource);
    this.store.inc(resource, amount);
    this.buys_this_turn.inc(resource, amount);
    this.sell_total.inc(resource, amount);
    this.prices.delete(resource);
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
      this.sales_this_turn.delete(k);
      this.bought.add(k, this.buys_this_turn.get(k));
      this.buys_this_turn.delete(k);
    });
  }
}
