class Agent {
  constructor(place, money) {
    this.place     = place;
    this.money     = money;
    this.pending   = null;
    this.inventory = new ResourceCounter;
    this.consumption_threshold = money * 10;
  }

  turn() {
    if (!this.pending) {
      this.pending = this.next_action();
    }

    if (this.pending && this.pending.perform()) {
      this.pending = null;
    }
  }

  next_action() {
    let best = 0;
    let chooser = new ActionChooser;

    chooser.add(this.action_consume());

    Object.keys(data.resources).forEach((item) => {
      chooser.add(this.action_craft(item));
      chooser.add(this.action_sell(item));
      chooser.add(this.action_mine(item));
    });

    return chooser.action;
  }

  action_sell(resource) {
    let amt = this.inventory.get(resource);

    if (!amt)
      return;

    let contraband = data.resources[resource].contraband;

    // Decides against illegal activity
    if (contraband && ((Math.random() * 10) <= contraband))
      return;

    let price = game.place(this.place).price(resource);
    let profit = amt * price;
    let me = this;

    return new Action(1, profit, null,
      function() {
        // Busted and fined
        if (contraband && ((Math.random() * 10) <= contraband)) {
          me.money -= 100 * contraband;
          if (me.money < 0)
            me.money = 50;
          return;
        }

        me.money += game.place(me.place).sell(resource, amt);
        me.inventory.dec(resource, amt);
      }
    );
  }

  action_mine(resource) {
    let info = data.resources[resource].mine;

    if (!info)
      return;

    let chance = game.place(this.place).minability;
    let profit = game.place(this.place).price(resource) * chance;
    let me = this;

    return new Action(info.tics, profit, null,
      function() {
        if (game.place(me.place).mine(resource))
          me.inventory.inc(resource, 1);
      }
    );
  }

  action_craft(resource) {
    let recipe = data.resources[resource].recipe;

    if (!recipe)
      return;

    let profit = game.place(this.place).price(resource);
    let cost   = 0;
    let stop   = false;

    Object.keys(recipe.materials).forEach((item) => {
      if (stop) return;
      let lack = recipe.materials[item] - this.inventory.get(item);

      if (lack > 0) {
        if (game.place(this.place).supply(item) >= lack) {
          cost += lack * game.place(this.place).price(item);

          if (cost >= profit)
            stop = true;

          if (cost > this.money)
            stop = true;
        }
        else {
          stop = true;
        }
      }
    });

    if (stop)
      return;

    profit -= cost;
    let me = this;

    return new Action(recipe.tics, profit,
      function() {
        // Purchase any materials we don't have
        Object.keys(recipe.materials).forEach((item) => {
          let need = recipe.materials[item] - me.inventory.get(item);

          if (need > 0) {
            me.money -= game.place(me.place).buy(item, need);
            me.inventory.inc(item, need);
          }
        });
      },
      function() {
        Object.keys(recipe.materials).forEach((item) => {
          me.inventory.dec(item, recipe.materials[item]);
        });

        me.inventory.inc(resource, 1);
      }
    );
  }

  action_consume() {
    if (this.money < this.consumption_threshold)
      return;

    let item = ['cybernetics', 'narcotics'].reduce((a, b) => {
      return (game.place(this.place).supply(a) > game.place(this.place).supply(b)) ? a : b;
    });

    let amount = game.place(this.place).supply(item);
    if (amount == 0) return;

    let can_afford = Math.floor((this.money / game.place(this.place).price(item)) / 2);
    if (can_afford == 0) return;

    let to_buy = Math.min(can_afford, game.place(this.place).supply(item));

    let me = this;
    return new Action(1, 2000, function() {game.place(me.place).buy(item, to_buy)}, function(){});
  }
}
