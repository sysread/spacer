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
      return this.demand(resource) > Math.max(1, this.currentSupply(resource))
          || this.currentSupply(resource) < data.min_delivery_amt;
    }

    is_over_supplied(resource) {
      if (this.currentSupply(resource) <= (data.min_delivery_amt * 2))
        return false;

      const loc = this.local_need(resource);

      if (loc < 0.6)
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

    randomAdjustment(orig) {
return orig;
      const r = Math.random();

      if (orig > 1) {
        const diff = orig - 1;
        return orig - (r * diff);
      }
      else if (orig < 1) {
        const diff = 1 - orig;
        return orig + (r * diff);
      }
      else {
        if (Math.ceil(r * 100) % 2 === 0) {
          return orig + (r / 30);
        } else {
          return orig - (r / 30);
        }
      }
    }

    adjustment(resource) {
      const loc    = this.local_need(resource);
      const sys    = Game.game.system_need(resource);
      const markup = this.scarcityMarkup(resource);
      const need   = (loc + loc + sys) / 3;
      const adjust =
        (need > 1) ? (1 + (Math.log(need) / Math.log(30)))
      : (need < 1) ? (Math.max(0.1, Math.sqrt(need)))
      : 1;

      return this.randomAdjustment( (need + adjust + markup) / 2 );
    }

    calculatePrice(resource) {
      const mine      = data.resources[resource].mine;
      const recipe    = data.resources[resource].recipe;
      const craftTime = this.craftTime(resource);
      const adjust    = this.adjustment(resource);

      let value = 0;

      if (mine) {
        value = data.base_unit_price * mine.tics;
      }
      else if (recipe) {
        for (const mat of Object.keys(recipe.materials)) {
          const price = this.buyPrice(mat);
          value += recipe.materials[mat] * price;
        }
      }

      if (craftTime !== undefined) {
        value += Math.ceil(Math.log(value * craftTime));
      }

      return Math.ceil(value * adjust);
    }

    price(resource) {
      if (!(resource in this.prices)) {
        const price = this.calculatePrice(resource);
        this.prices[resource] = price;
      }

      return this.prices[resource];
    }

    sellPrice(resource) {
      return this.price(resource);
    }

    buyPrice(resource)  {
      return this.price(resource);
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

      if (Game.game.turns % (data.update_prices * 24 / data.hours_per_turn) === 0) {
        this.prices = util.resourceMap(null);
      }
    }
  }
});
