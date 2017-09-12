class Agent {
  constructor(place, money) {
    this.place     = place;
    this.money     = money;
    this.pending   = null;
    this.inventory = new ResourceCounter;
    this.consumption_threshold = money * 10;
  }

  save() {
    return {
      place: this.place,
      money: this.money,
      inventory: this.inventory.save(),
      consumption_threshold: this.consumption_threshold
    };
  }

  load(obj) {
    this.place = obj.place;
    this.money = obj.money;
    this.consumption_threshold = obj.consumption_threshold;
    this.inventory.load(obj.inventory);
    this.pending = null;
  }

  turn() {
    if (!this.pending)
      this.pending = this.next_action();

    if (this.pending && this.pending.perform())
      this.pending = null;
  }

  next_action() {
    let best = 0;
    let chooser = new ActionChooser;

    chooser.add(this.action_consume());

    Object.keys(data.resources).forEach((item) => {
      chooser.add(this.action_craft(item));
      chooser.add(this.action_sell(item));
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

    let price = game.place(this.place).sell_price(resource);
    let profit = amt * price;

    return new Action(1, profit, null,
      () => {
        // Busted and fined
        if (contraband && ((Math.random() * 10) <= contraband)) {
          this.money -= 100 * contraband;
          if (this.money < 0)
            this.money = 50;
          return;
        }

        this.money += game.place(this.place).sell(resource, amt);
        this.inventory.dec(resource, amt);
      }
    );
  }

  action_craft(resource) {
    let recipe = data.resources[resource].recipe;

    if (!recipe)
      return;

    let profit = game.place(this.place).sell_price(resource);
    let cost   = 0;
    let stop   = false;

    Object.keys(recipe.materials).forEach((item) => {
      if (stop) return;
      let lack = recipe.materials[item] - this.inventory.get(item);

      if (lack > 0) {
        if (game.place(this.place).current_supply(item) >= lack) {
          cost += lack * game.place(this.place).buy_price(item);

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

    return new Action(recipe.tics, profit,
      () => {
        // Purchase any materials we don't have
        Object.keys(recipe.materials).forEach((item) => {
          let need = recipe.materials[item] - this.inventory.get(item);

          if (need > 0) {
            this.money -= game.place(this.place).buy(item, need);
            this.inventory.inc(item, need);
          }
        });
      },
      () => {
        Object.keys(recipe.materials).forEach((item) => {
          this.inventory.dec(item, recipe.materials[item]);
        });

        this.inventory.inc(resource, 1);
      }
    );
  }

  action_consume() {
    if (this.money < this.consumption_threshold)
      return;

    let item = ['cybernetics', 'narcotics'].reduce((a, b) => {
      return (game.place(this.place).current_supply(a) > game.place(this.place).current_supply(b)) ? a : b;
    });

    let amount = game.place(this.place).current_supply(item);
    if (amount == 0) return;

    let can_afford = Math.floor((this.money / game.place(this.place).buy_price(item)) / 2);
    if (can_afford == 0) return;

    let to_buy = Math.min(can_afford, game.place(this.place).current_supply(item));

    let me = this;
    return new Action(1, 2000, function() {game.place(me.place).buy(item, to_buy)}, function(){});
  }
}
