define(function(require, exports, module) {
  const data  = require('data');
  const util  = require('util');
  const Game  = require('game');
  const Actor = require('agent/actor');

  return class extends Actor {
    *crafts() {
      let place = this.here;
      let items = data.resources;

      CRAFT: for (let item of place.resourcesNeeded()) {
        let recipe = items[item].recipe;

        if (recipe === undefined)
          continue;

        if (this.is_over_supplied(item))
          continue;

        let profit = place.sellPrice(item);
        let cost   = 0;
        let need   = {};

        for (let mat of Object.keys(recipe.materials)) {
          need[mat] = recipe.materials[mat];

          // Market doesn't have enough to of the mat to craft this resource
          if (place.currentSupply(mat) < need[mat]) {
            place.incDemand(mat, need[mat]);
            continue CRAFT;
          }

          // Protect market from overly aggressive agents emptying the stores
          if (!data.necessity[item] && place.is_under_supplied(mat))
            continue CRAFT;

          cost += place.buyPrice(mat);

          if (cost >= profit)
            continue CRAFT;
        }

        profit -= cost;

        for (let mat of Object.keys(recipe.materials)) {
          if (this.is_over_supplied(mat)) {
            profit *= 1.25;
          }
          else if (this.is_under_supplied(mat)) {
            profit *= 0.75;
          }
        }

        if (this.is_under_supplied(item))
          profit *= 2;

        if (data.necessity[item])
          profit *= 3;

        // Just say no
        if (this.contra_rand(item))
          continue;

        yield {
          item   : item,
          turns  : recipe.tics,
          mats   : recipe.materials,
          need   : need,
          profit : profit
        };
      }
    }

    plan() {
      let best;

      for (let craft of this.crafts()) {
        if (best === undefined || best.profit < craft.profit) {
          best = craft;
        }
      }

      if (best) {
        for (let item of Object.keys(best.need)) {
          if (best.need[item] > 0) {
            this.here.buy(item, best.need[item]);
          }
        }

        let tics = this.here.fabricate(best.item);
        for (let i = 0; i < tics; ++i) this.enqueue('wait');
        this.enqueue('sell', best);
      }
      else {
        this.enqueue('consume');
        this.enqueue('discard');
      }
    }

    sell(info) {
      this.here.sell(info.item, 1);
      //console.debug(`[${Game.game.turns}] agent: ${this.place} manufactured 1 unit of ${info.item}`);
    }

    discard() {
      if (Game.game.turns % (data.update_prices * 24 / data.hours_per_turn) !== 0) {
        return;
      }

      const place = this.here;
      let demand;
      let best;

      for (const item of Object.keys(data.resources)) {
        if (this.is_over_supplied(item)) {
          const itemDemand = place.demand(item);
          if (demand === undefined || demand > itemDemand) {
            demand = itemDemand;
            best = item;
          }
        }
      }

      const supply = place.currentSupply(best);

      if (best && supply) {
        const loc = place.localNeed(best);
        const sys = place.systemNeed(best);
        const amount = util.getRandomInt(supply * (1 - ((loc + sys) / 2)));

        if (amount > 0) {
          place.store.dec(best, amount);
          console.debug(`[${Game.game.turns}] agent: ${this.place} discarded ${amount}/${supply} units of ${best} due to oversupply`);
        }
      }
    }

    consume() {
      if (Game.game.turns % (data.update_prices * 24 / data.hours_per_turn) !== 0) {
        return;
      }

      const place = this.here;
      let supply;
      let best;

      //for (const item of Object.keys(data.resources)) {
      for (const item of 'electronics cybernetics narcotics weapons'.split(' ')) {
        if (!this.is_under_supplied(item)) {
          const itemSupply = place.supply(item);
          if (supply === undefined || supply > itemSupply) {
            supply = itemSupply;
            best = item;
          }
        }
      }

      if (best && place.currentSupply(best) > Math.floor(data.min_delivery_amt / 2)) {
        const amount = Math.floor(place.currentSupply(best) / 5);

        if (amount > 0) {
          place.buy(best, amount);
          console.debug(`[${Game.game.turns}] agent: ${this.place} consumed ${amount} units of ${best} as a luxury`);
        }
      }
    }
  };
});
