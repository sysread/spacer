define(function(require, exports, module) {
  const data     = require('data');
  const util     = require('util');
  const Game     = require('game');
  const Resource = require('resource');

  return class {
    constructor() {
      this.store          = new util.ResourceCounter;
      this.demandHistory  = new util.ResourceTracker(data.market_history);
      this.supplyHistory  = new util.ResourceTracker(data.market_history);
      this.buysThisTurn   = new util.ResourceCounter;
      this.prices         = util.resourceMap(null);
      this.setNextPriceUpdateTurn();
    }

    save() {
      let me = {};
      me.store           = this.store.save();
      me.demandHistory   = this.demandHistory.save();
      me.supplyHistory   = this.supplyHistory.save();
      me.buysThisTurn    = this.buysThisTurn.save();
      me.prices          = this.prices;
      me.nextPriceUpdate = this.nextPriceUpdate;
      return me;
    }

    load(obj) {
      this.store.load(obj.store);
      this.demandHistory.load(obj.supplyHistory);
      this.supplyHistory.load(obj.supplyHistory);
      this.buysThisTurn.load(obj.buysThisTurn);
      this.prices = util.resourceMap(null, obj.prices);
      this.nextPriceUpdate = obj.nextPriceUpdate || this.setNextPriceUpdateTurn();
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
    }

    supply(resource) {
      let stock = this.currentSupply(resource);
      let avg   = this.supplyHistory.avg(resource);
      return 1 + ((stock + avg) / 2);
    }

    demand(resource) {
      return 1 + this.demandHistory.avg(resource);
    }

    localNeed(resource) {
      return this.demand(resource) / this.supply(resource);
    }

    systemNeed(resource) {
      return Game.game.systemNeed(resource);
    }

    is_under_supplied(resource) {
      const loc = this.localNeed(resource);
      if (loc > 1.5) return true;

      const sys = this.systemNeed(resource);
      if (sys > 1.1 && loc > 1.25) return true;

      return false;
    }

    is_over_supplied(resource) {
      if (this.currentSupply(resource) <= data.min_delivery_amt * 3)
        return false;

      const loc = this.localNeed(resource);
      if (loc < 0.5) return true;

      const sys = this.systemNeed(resource);
      if (sys < 0.9 && loc < 0.75) return true;

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
      const loc  = this.localNeed(resource);
      const sys  = this.systemNeed(resource);
      const need = ((loc + loc + sys) / 3) + this.scarcityMarkup(resource)

      if (need > 0) {
        return 1 + Math.log(need) / Math.log(17);
      }
      else if (need < 0) {
        return Math.max(0.1, Math.sqrt(need));
      }
      else {
        return 1;
      }
    }

    calculatePrice(resource) {
      const adjust = this.adjustment(resource);
      const value  = Resource.get(resource).value;
      const price  = Math.ceil(value * adjust);
      const rand   = util.getRandomInt(0, Math.ceil(price * 0.15));
      return util.getRandomInt(0, 1) > 0 ? price + rand : price - rand;
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
      const info = {};
      Object.keys(data.resources).forEach((resource) => {
        const supply = (Math.round(this.supply(resource) * 100) / 100);
        const demand = (Math.round(this.demand(resource) * 100) / 100);

        info[resource] = {
          stock  : this.currentSupply(resource),
          buy    : this.buyPrice(resource),
          sell   : this.sellPrice(resource),
          supply : supply,
          demand : demand,
          trend  : this.trend(resource)
        };
      });
      return info;
    }

    setNextPriceUpdateTurn() {
      const turnsPerDay = 24 / data.hours_per_turn;
      const nextOffset  = util.getRandomInt(1, data.update_prices * turnsPerDay);
      this.nextPriceUpdate = Game.game.turns + nextOffset;
      return this.nextPriceUpdate;
    }

    turn() {
      Object.keys(data.resources).forEach((k) => {
        this.supplyHistory.add(k, this.currentSupply(k));
        this.demandHistory.add(k, this.buysThisTurn.get(k));
      });

      this.buysThisTurn.clear();

      if (Game.game.turns >= this.nextPriceUpdate) {
        this.prices = util.resourceMap(null);
        this.setNextPriceUpdateTurn();
      }
    }
  }
});
