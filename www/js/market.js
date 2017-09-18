class Market {
  constructor() {
    this.store           = new ResourceCounter;
    this.demand_history  = new ResourceTracker(data.market_history);
    this.supply_history  = new ResourceTracker(data.market_history);
    this.buys_this_turn  = new ResourceCounter;
    this.prices          = new DefaultMap(null);
  }

  save() {
    let me = {};
    me.store           = this.store.save();
    me.demand_history  = this.demand_history.save();
    me.supply_history  = this.supply_history.save();
    me.buys_this_turn  = this.buys_this_turn.save();
    me.prices          = this.prices.save();
    return me;
  }

  load(obj) {
    this.store.load(obj.store);
    this.demand_history.load(obj.supply_history);
    this.supply_history.load(obj.supply_history);
    this.buys_this_turn.load(obj.buys_this_turn);
    this.prices.load(obj.prices);
  }

  current_supply(resource) {
    return Math.floor(this.store.get(resource));
  }

  inc_demand(resource, amount) {
    this.buys_this_turn.inc(resource, amount);
  }

  supply(resource) {
    let stock = this.current_supply(resource) || 1;
    let avg   = this.supply_history.avg(resource) || 1;
    return Math.max(1, (stock + (3 * avg)) / 4);
  }

  demand(resource) {
    let demand = Math.max(1, this.demand_history.avg(resource));

    // Increment demand based on items whose recipes include this resource
    for (let item of Object.keys(data.resources)) {
      let recipe = data.resources[item].recipe;

      if (recipe !== undefined && recipe.materials.hasOwnProperty(resource)) {
        // Boost demand by the amount of the resource required in this recipe
        // times the demand of the item itself.
        demand += recipe.materials[resource] * this.demand(item);
      }
    }

    return demand;
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

    if (adjust > 1) {
      adjust =  Math.min(2, Math.log10(adjust));
    }
    else if (adjust < 1) {
      adjust = Math.max(0.5, Math.sqrt(adjust));
    }

    if (adjust > 1) return markup + Math.min(2.00, adjust);
    if (adjust < 1) return markup + Math.max(0.5, adjust);
    return 1 + markup;
  }

  is_over_supplied(item, margin=0.5) {
    return (Math.round(this.demand(item) / this.supply(item) * 100) / 100) < margin;
  }

  craft_time(item) {
    let recipe = data.resources[ite].recipe;
    if (recipe) return recipe.tics;
    return;
  }

  calculate_price(resource) {
    let mine   = data.resources[resource].mine;
    let recipe = data.resources[resource].recipe;
    let value  = 0;

    if (mine) {
      value = data.base_unit_price * mine.tics;
    }
    else if (recipe) {
      for (let mat of Object.keys(recipe.materials)) {
        value += recipe.materials[mat] * this.buy_price(mat);
      }
    }

    let craft_time = this.craft_time(resource);

    if (craft_time !== undefined)
      value += Math.ceil(Math.log(value * craft_time));

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
    return price;
  }

  trend(resource, days=10) {
    let turns = days * (24 / data.hours_per_turn);
    let long_avg = this.demand_history.avg(resource) + this.supply_history.avg(resource);
    let short_avg = this.demand_history.avg(resource, turns) + this.supply_history.avg(resource, turns);
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
      this.supply_history.add(k, this.current_supply(k));
      this.demand_history.add(k, this.buys_this_turn.get(k));
    });

    this.buys_this_turn.clear();
    this.prices.clear();
  }
}
