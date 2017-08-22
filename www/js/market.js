class Market {
  constructor() {
    this.store           = new ResourceCounter;
    this.sold            = new ResourceTracker(500);
    this.sales_this_turn = new ResourceCounter;
    this.sell_total      = new ResourceCounter;
    this.buy_total       = new ResourceCounter;
    this._price          = new DefaultMap(() => {return null});
  }

  supply(resource) {
    return this.store.get(resource);
  }

  demand(resource) {
    return 1 + this.sold.avg(resource);
  }

  adjustment(resource) {
    let supply  = this.supply(resource);
    let demand  = this.demand(resource) || 1;
    let adjust  = 1 + Math.log10(1 + (demand / (supply || 1)));
    if (supply == 0) adjust *= 2;
    return adjust;
  }

  calculate_price(resource) {
    let mine    = data.resources[resource].mine;
    let recipe  = data.resources[resource].recipe;
    let value   = null;

    if (mine) {
      value = 50 * mine.tics;
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
    if (!this._price.has(resource))
      this._price.set(resource, this.calculate_price(resource));
    return this._price.get(resource);
  }

  buy(resource, amount) {
    let available = this.supply(resource);

    if (available < amount) {
      throw new Error(`buy: requested ${amount} but only ${available} available of ${resource}`);
    }

    let price = amount * this.price(resource);
    this.store.dec(resource, amount);
    this.sales_this_turn.inc(resource, amount);
    this._price.delete(resource);
    this.buy_total.inc(resource, amount);
    return price;
  }

  sell(resource, amount) {
    let price = amount * this.price(resource);
    this.store.inc(resource, amount);
    this.sell_total.inc(resource, amount);
    this._price.delete(resource);
    return price;
  }

  report() {
    let info = {};
    Object.keys(data.resources).forEach((resource) => {
      info[resource] = {amount: this.supply(resource), price: this.price(resource)};
    });
    return info;
  }

  turn() {
    this.sales_this_turn.each((k, v) => {
      this.sold.add(k, this.sales_this_turn.get(k));
      this.sales_this_turn.delete(k);
    });
  }
}
