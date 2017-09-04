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
    this.place   = obj.place;
    this.money   = obj.money;
    this.pending = null;
    this.inventory.load(obj.inventory);
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
        if (game.place(this.place).current_supply(item) >= lack) {
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
      return (game.place(this.place).current_supply(a) > game.place(this.place).current_supply(b)) ? a : b;
    });

    let amount = game.place(this.place).current_supply(item);
    if (amount == 0) return;

    let can_afford = Math.floor((this.money / game.place(this.place).price(item)) / 2);
    if (can_afford == 0) return;

    let to_buy = Math.min(can_afford, game.place(this.place).current_supply(item));

    let me = this;
    return new Action(1, 2000, function() {game.place(me.place).buy(item, to_buy)}, function(){});
  }
}

class HaulerAgent {
  constructor(place, money, ship) {
    this.place   = place;
    this.money   = money;
    this.ship    = new Ship({shipclass: ship || 'merchantman'});
    this.pending = null;
  }

  save() {
    return {
      place   : this.place,
      money   : this.money,
      ship    : this.ship.save(),
      pending : this.pending
    };
  }

  load(obj){
    this.place   = obj.place;
    this.money   = obj.money;
    this.pending = obj.pending;
    this.ship    = new Ship;
    this.ship.load(obj.ship);
  }

  turn() {
    if (this.pending === null)
      this.pending = this.choose_action();

    let action = this.pending.shift();

    switch (action[0]) {
      case 'buy':
        this.money -= game.place(action[1]).buy(action[2], action[3]);
        this.ship.load_cargo(action[2], action[3]);
        break;

      case 'sell':
        this.money += game.place(action[1]).sell(action[2], action[3]);
        this.ship.unload_cargo(action[2], action[3]);
        break;

      case 'set':
        this[action[1]] = action[2];
        break;

      case 'wait':
      default:
        break;
    }

    if (this.pending.length === 0)
      this.pending = null;
  }

  choose_action() {
    let here = game.place(this.place).report();
    let best;

    for (let target of Object.keys(data.bodies)) {
      if (target === this.place) continue;

      let there = game.market(target);
      if (there === null) continue;

      for (let resource of Object.keys(here)) {
        if (here[resource].stock === 0) continue;

        let profit_per_unit = here[resource].price - there.data[resource].price;
        if (profit_per_unit < 1) continue;

        let units = Math.min(
          here[resource].stock,
          Math.floor(this.money / here[resource].price),
          this.ship.cargo_left
        );

        if (units === 0) continue;

        let mass   = units * data.resources[resource].mass;
        let plan   = system.astrogate(target, this.place, this.ship.acceleration_for_mass(mass));
        let turns  = Math.ceil(plan.time / data.hours_per_turn);
        let profit = profit_per_unit * units;
        let value  = Math.ceil(profit / turns);

        if (best === undefined || best.value < value) {
          best = {
            target   : target,
            resource : resource,
            profit   : profit,
            turns    : turns,
            units    : units,
            value    : value
          };
        }
      }
    }

    let actions = [];

    if (best) {
      actions.push(['buy', this.place, best.resource, best.units]);
      for (let i = 0; i < best.turns; ++i) actions.push(['wait']);
      actions.push(['set', 'place', best.target]);
      actions.push(['sell', best.target, best.resource, best.units]);
    }
    else {
      actions.push(['wait']);
    }

    return actions;
  }
}
