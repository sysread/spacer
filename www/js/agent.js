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

class MinerAgent {
  constructor(place) {
    this.place = place;
    this.inventory = new ResourceCounter;
    this.timer = null;
  }

  save() {
    return {place: this.place, inventory: this.inventory};
  }

  load(obj) {
    this.place = obj.place;
    this.inventory = new ResourceCounter;
    this.inventory.load(obj.inventory);
  }

  turn() {
    if (this.timer === null)
      this.timer = 6;

    if (--this.timer === 0) {
      let harvest = game.place(this.place).harvest(6);
      harvest.each((resource, amount) => {
        game.place(this.place).sell(resource, amount);
      });

      this.timer = null;
    }
  }
}

class HaulerAgent {
  constructor(place, money, ship) {
    this.home    = place;
    this.place   = place;
    this.money   = money;
    this.ship    = new Ship({shipclass: ship || 'merchantman'});
    this.pending = null;
    this.trips   = 0;
  }

  save() {
    return {
      home    : this.home,
      place   : this.place,
      money   : this.money,
      ship    : this.ship.save(),
      pending : this.pending,
      trips   : this.trips
    };
  }

  load(obj){
    this.home    = obj.home;
    this.place   = obj.place;
    this.money   = obj.money;
    this.pending = obj.pending;
    this.trips   = obj.trips || 0;
    this.ship    = new Ship;
    this.ship.load(obj.ship);
  }

  turn() {
    if (this.pending === null) {
      this.pending = this.choose_action();
    }

    let action = this.pending.shift();

    switch (action[0]) {
      case 'buy':
        this.money -= game.place(action[1]).buy(action[2], action[3]);
        this.ship.load_cargo(action[2], action[3]);
        break;

      case 'sell':
        this.money += game.place(action[1]).sell(action[2], action[3]);
        this.ship.unload_cargo(action[2], action[3]);
        console.log(`[${this.place} -> ${action[1]}] Delivered ${action[3]} units of ${action[2]}`);
        break;

      case 'set':
        this[action[1]] = action[2];
        break;

      case 'wait':
      default:
        break;
    }

    if (this.pending.length === 0) {
      this.pending = null;
      if (this.money < 200) {
        this.money = data.hauler_money;
      }
    }
  }

  choose_action() {
    let bodies = Object.keys(data.bodies);
    let avail  = Math.ceil(this.money * 0.5);
    let here   = game.place(this.place).report();
    let best;

    if (this.trips % 4 === 0 && this.place !== this.home) {
      bodies = [this.home];
      let plan  = system.astrogate(this.place, this.home, this.ship.acceleration);
      let turns = Math.ceil(plan.time / data.hours_per_turn);
      best = {
        value  : 0,
        target : this.home,
        turns  : turns
      };
    }

    for (let target of bodies) {
      if (target === this.place) continue;

      let there = game.market(target);
      if (there === null) continue;

      for (let resource of Object.keys(here)) {
        // proposition: buy here, sell there
        if (here[resource].buy < there.data[resource].sell) {
          // Are there any units to buy there?
          if (here[resource].stock === 0) continue;

          // Is this resource profitable?
          let profit_per_unit = there.data[resource].sell - here[resource].buy;
          if (profit_per_unit < 1) continue;

          // How many units can we afford?
          let units = Math.min(here[resource].stock, Math.floor(avail / here[resource].buy), this.ship.cargo_left);
          if (units === 0) continue;

          // Is the net profit worth our time?
          let profit = profit_per_unit * units;
          if (profit < Math.ceil(this.money * 0.1)) continue;

          // How far/long a trip?
          let mass  = units * data.resources[resource].mass;
          let plan  = system.astrogate(this.place, target, this.ship.acceleration_for_mass(mass));
          let turns = Math.ceil(plan.time / data.hours_per_turn);
          let value = profit / Math.log10(Math.ceil(turns/2));

          if (best === undefined || best.value < value) {
            best = {
              value    : value,
              target   : target,
              resource : resource,
              profit   : profit,
              turns    : turns,
              units    : units
            };
          }
        }
        // proposition: go to where the goods are cheap
        // TODO buy local goods to sell at target
        else if (here[resource].sell > there.data[resource].buy) {
          // Are there any units to buy there?
          if (there.data[resource].stock === 0) continue;

          // Is this resource profitable?
          let profit_per_unit = there.data[resource].buy - here[resource].sell;
          if (profit_per_unit < 1) continue;

          // How many units can we afford?
          let units = Math.min(there.data[resource].stock, Math.floor(avail / there.data[resource].buy), this.ship.cargo_left);
          if (units === 0) continue;

          // Is the net profit worth our time?
          let profit = profit_per_unit * units;
          if (profit < Math.ceil(this.money * 0.1)) continue;

          // How far/long a trip?
          let plan  = system.astrogate(this.place, target, this.ship.acceleration);
          let turns = Math.ceil(plan.time / data.hours_per_turn);
          let value = profit / Math.log10(Math.ceil(turns/2));

          if (best === undefined || best.value < value) {
            best = {
              value    : value,
              target   : target,
              resource : resource,
              profit   : profit,
              turns    : turns
            };
          }
        }
      }
    }

    let actions = [];

    if (best) {
      ++this.trips;

      if (best.units) {
        actions.push(['buy', this.place, best.resource, best.units]);
        for (let i = 0; i < best.turns; ++i) actions.push(['wait']);
        actions.push(['sell', best.target, best.resource, best.units]);
        actions.push(['set', 'place', best.target]);
      }
      else {
        for (let i = 0; i < best.turns; ++i) actions.push(['wait']);
        actions.push(['set', 'place', best.target]);
      }
    }
    else {
      actions.push(['wait']);
    }

    return actions;
  }
}
