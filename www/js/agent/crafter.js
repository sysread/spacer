define(function(require, exports, module) {
  const data  = require('data');
  const Game  = require('game');
  const Actor = require('agent/actor');

  return class extends Actor {
    *crafts() {
      let place = Game.game.place(this.place);
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
          if (place.currentSupply(mat) < need[mat])
            continue CRAFT;

          // Protect market from overly aggressive agents emptying the stores
          if (place.is_under_supplied(mat))
            continue CRAFT;

          cost += place.buyPrice(mat);

          if (cost >= profit)
            continue CRAFT;
        }

        profit -= cost;

        if (this.is_under_supplied(item))
          profit *= 2;

        if (item === 'fuel')
          profit *= 2;

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
            Game.game.place(this.place).buy(item, best.need[item]);
          }
        }

        let tics = Game.game.place(this.place).fabricate(best.item);
        for (let i = 0; i < tics; ++i) this.enqueue('wait');
        this.enqueue('sell', best);
      }
      else {
        this.enqueue('consume');
      }
    }

    sell(info) {
      if (!this.busted(info.item, 1))
        Game.game.place(this.place).sell(info.item, 1);
    }

    consume() {
      for (let item of 'water food medicine electronics'.split(' ')) {
        let price  = Game.game.place(this.place).price(item);
        let supply = Game.game.place(this.place).currentSupply(item);

        if (supply === 0) continue;

        if (this.is_over_supplied(item)) {
          let amount = Math.ceil(supply / 5);
          Game.game.place(this.place).buy(item, amount);
        }
      }
    }
  };
});
