class Crafter extends Actor {
  *crafts() {
    let place = game.place(this.place);
    let items = data.resources;

    CRAFT: for (let item of Object.keys(items)) {
      let recipe = items[item].recipe;

      if (recipe === undefined)
        continue;

      if (this.is_over_supplied(item))
        continue;

      let profit = place.sell_price(item);
      let cost   = 0;
      let need   = {};

      for (let mat of Object.keys(recipe.materials)) {
        need[mat] = recipe.materials[mat];

        if (place.current_supply(mat) < need[mat])
          continue CRAFT;

        cost += place.buy_price(mat);

        if (cost >= profit)
          continue CRAFT;
      }

      profit -= cost;

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
          game.place(this.place).buy(item, best.need[item]);
        }
      }

      let tics = game.place(this.place).fabricate(best.item);
      for (let i = 0; i < tics; ++i) this.enqueue('wait');
      this.enqueue('sell', best);
    }
    else {
      this.enqueue('consume');
    }
  }

  sell(info) {
    if (!this.busted(info.item, 1))
      game.place(this.place).sell(info.item, 1);
  }

  consume() {
    for (let item of 'water food medicine electronics'.split(' ')) {
      let price  = game.place(this.place).price(item);
      let supply = game.place(this.place).current_supply(item);

      if (supply === 0) continue;

      if (this.is_over_supplied(item)) {
        let amount = Math.ceil(supply / 5);
        game.place(this.place).buy(item, amount);
      }
    }
  }
}
