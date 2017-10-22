define(function(require, exports, module) {
  const data = require('data');
  const util = require('util');
  const Game = require('game');

  return class {
    constructor() {
      this.store          = new util.ResourceCounter;
      this.demandHistory  = new util.ResourceTracker(data.market_history);
      this.supplyHistory  = new util.ResourceTracker(data.market_history);
      this.buysThisTurn   = new util.ResourceCounter;
      this.prices         = util.resourceMap(null);
    }

    save() {
      let me = {};
      me.store          = this.store.save();
      me.demandHistory  = this.demandHistory.save();
      me.supplyHistory  = this.supplyHistory.save();
      me.buysThisTurn   = this.buysThisTurn.save();
      me.prices         = this.prices;
      return me;
    }

    load(obj) {
      this.store.load(obj.store);
      this.demandHistory.load(obj.supplyHistory);
      this.supplyHistory.load(obj.supplyHistory);
      this.buysThisTurn.load(obj.buysThisTurn);
      this.prices = util.resourceMap(null, obj.prices);
    }

    craftTime(item) {
      let recipe = data.resources[item].recipe;
      if (recipe) return recipe.tics;
      return;
    }

    currentSupply(resource) {
      return Math.floor(this.store.get(resource));
    }

    incDemand(resource, amount) {
      this.buysThisTurn.inc(resource, amount);

      // Increment demand for all ingredients of this (if craftable)
      let recipe = data.resources[resource].recipe;

      if (recipe) {
        for (let item of Object.keys(recipe.materials)) {
          this.incDemand(item, recipe.materials[item]);
        }
      }
    }

    supply(resource) {
      let stock = this.currentSupply(resource);
      let avg   = this.supplyHistory.avg(resource);
      return 1 + ((stock + avg) / 2);
    }

    demand(resource) {
      return 1 + this.demandHistory.avg(resource);
    }

    local_need(resource) {
      return this.demand(resource) / this.supply(resource);
    }

    is_under_supplied(resource) {
      return this.demand(resource) > Math.max(1, this.currentSupply(resource));
    }

    is_over_supplied(resource) {
      if (this.currentSupply(resource) === 0)
        return false;

      const loc = this.local_need(resource);

      if (loc < 0.5)
        return true;

      const sys = Game.game.system_need(resource);

      if (sys < 0.9 && loc < 0.75)
        return true;

      return false;
    }

    scarcityMarkup(resource) {
      let markup = 0;

      if (this.currentSupply(resource) === 0) {
        markup += data.scarcity_markup;

        if (data.necessity[resource]) {
          markup += data.scarcity_markup;
        }
      }

      return markup;
    }

    adjustment(resource) {
      const loc = this.local_need(resource);
      const sys = Game.game.system_need(resource);
      const adjust = (loc + loc + loc + sys) / 4;
      const markup = this.scarcityMarkup(resource);;

      if (adjust > 1) {
        return 1 + markup + Math.log10(adjust);
      }
      else if (adjust < 1) {
        return markup + Math.max(0.1, Math.sqrt(adjust));
      }

      return 1 + markup;
    }

    calculatePrice(resource) {
      let mine   = data.resources[resource].mine;
      let recipe = data.resources[resource].recipe;
      let value  = 0;

      if (mine) {
        value = data.base_unit_price * mine.tics;
      }
      else if (recipe) {
        for (let mat of Object.keys(recipe.materials)) {
          value += recipe.materials[mat] * this.buyPrice(mat);
        }
      }

      let craftTime = this.craftTime(resource);

      if (craftTime !== undefined)
        value += Math.ceil(Math.log(value * craftTime));

      return Math.ceil(value * this.adjustment(resource));
    }

    price(resource) {
      if (!(resource in this.prices)) {
        this.prices[resource] = this.calculatePrice(resource);
      }

      return this.prices[resource];
    }

    sellPrice(resource) {
      return this.price(resource);
    }

    buyPrice(resource)  {
      const price = this.price(resource);
      return price + (price * data.buy_price_markup);
    }

    buy(resource, amount) {
      let available = this.currentSupply(resource);

      if (available < amount) {
        throw new Error(`buy: requested ${amount} but only ${available} available of ${resource}`);
      }

      let price = amount * this.buyPrice(resource);
      this.store.dec(resource, amount);
      this.incDemand(resource, amount);
      return price;
    }

    sell(resource, amount) {
      let price = amount * this.sellPrice(resource);
      this.store.inc(resource, amount);
      return price;
    }

    trend(resource, days=10) {
      let turns = days * (24 / data.hours_per_turn);
      let longAvg = this.demandHistory.avg(resource) + this.supplyHistory.avg(resource);
      let shortAvg = this.demandHistory.avg(resource, turns) + this.supplyHistory.avg(resource, turns);
      return shortAvg - longAvg;
    }

    report() {
      let info = {};
      Object.keys(data.resources).forEach((resource) => {
        let supply = (Math.round(this.supply(resource) * 100) / 100);
        let demand = (Math.round(this.demand(resource) * 100) / 100);

        info[resource] = {
          stock  : this.currentSupply(resource),
          price  : this.price(resource),
          buy    : this.buyPrice(resource),
          sell   : this.sellPrice(resource),
          supply : supply,
          demand : demand,
          trend  : this.trend(resource)
        };
      });
      return info;
    }

    turn() {
      Object.keys(data.resources).forEach((k) => {
        this.supplyHistory.add(k, this.currentSupply(k));
        this.demandHistory.add(k, this.buysThisTurn.get(k));
      });

      this.buysThisTurn.clear();

      if (Game.game.turns % (Game.game.update_prices * 24 / data.hours_per_turn) === 0) {
        this.prices = resourceMap(null);
      }
    }
  }
});
