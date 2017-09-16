let crafter_note = {};

class Crafter extends Actor {
  constructor(opt) {
    opt = opt || {};
    super(opt);
    this.stock = new ResourceCounter;
  }

note(info, item, amt) {
  let p = this.place;
  if (!crafter_note.hasOwnProperty(p)) crafter_note[p] = {};
  if (!crafter_note[p].hasOwnProperty(info)) crafter_note[p][info] = {};
  if (!crafter_note[p][info].hasOwnProperty(item)) crafter_note[p][info][item] = 0;
  crafter_note[p][info][item] += amt;
}

  save() {
    let obj = super.save();
    obj.stock = this.stock.save();
    return obj;
  }

  load(obj) {
    super.load(obj);
    this.stock.load(obj.stock);
  }

  *crafts() {
    let place = game.place(this.place);
    let items = data.resources;

    CRAFT: for (let item of Object.keys(items)) {
      let recipe = items[item].recipe;

      if (recipe === undefined)
        continue;

      let profit = place.sell_price(item);
      let cost   = 0;
      let need   = {};

      for (let mat of Object.keys(recipe.materials)) {
        need[mat] = recipe.materials[mat] - this.stock.get(mat);

        if (place.current_supply(mat) < need[mat])
          continue CRAFT;

        cost += place.buy_price(mat);

        if (cost > this.money)
          continue CRAFT;

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
        profit : profit,
        value  : profit / recipe.tics
      };
    }
  }

  plan() {
    let best;

    for (let craft of this.crafts()) {
      if (best === undefined || best.value < craft.value) {
        best = craft;
      }
    }

    if (best) {
      for (let item of Object.keys(best.need)) {
        if (best.need[item] > 0) {
          this.money -= game.place(this.place).buy(item, best.need[item]);
          this.stock.inc(item, best.need[item]);
this.note('buy', item, best.need[item]);
        }
      }

      for (let i = 0; i < best.turns; ++i)
        this.enqueue('wait');

      this.enqueue('craft', best);
    }
    else {
      this.enqueue('trade');
    }
  }

  craft(info) {
    for (let item of Object.keys(info.mats))
      this.stock.dec(item, info.mats[item]);

    this.stock.inc(info.item, 1);
this.note('craft', info.item, 1);
  }

  contra_rand(item) {
    let contraband = data.resources[item].contraband;
    return contraband && (Math.random() * 10) <= contraband;
  }

  trade() {
    let place = game.place(this.place);
    let best;

    this.stock.each((item, amt) => {
      let profit = place.sell_price(item) * amt;
      if (best === undefined || best.profit < profit)
        best = {profit: profit, item: item, amount: amt};
    });

    if (best) {
      // Busted
      if (this.contra_rand(best.item)) {
        this.money -= 100 * best.amount;
        if (this.money < 0)
          this.money = 50;
      }
      else {
        this.money += place.sell(best.item, best.amount);
      }
    }
  }
}
