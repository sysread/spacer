var log = {};
Object.keys(data.resources).forEach((k)=>{log[k] = 0});

function note(resource) {
  ++log[resource];
}

class Hauler extends Actor {
  constructor(opt) {
    opt = opt || {};
    super(opt);
    this.home = opt.place;
    this.ship = new Ship({shipclass: opt.ship || 'merchantman'});
  }

  save() {
    let obj  = super.save();
    obj.home = this.home;
    obj.ship = this.ship.save();
    return obj;
  }

  load(obj) {
    super.load(obj);
    this.home = obj.home;
    this.ship.load(obj.ship);
  }

  buy(info) {
    let [place, item, amount] = info;
    this.cost(game.place(place).buy(item, amount));
    this.ship.load_cargo(item, amount);
  }

  sell(info) {
    let [place, item, amount] = info;
    this.gain(game.place(place).sell(item, amount));
    this.ship.unload_cargo(item, amount);
    note(item);
  }

  arrive(info) {
    let [place] = info;
    this.place = place;

    // Nuts
    if (data.fuel_price > this.money)
      this.money = data.hauler_money;

    // Refuel
    let want   = this.ship.refuel_units();
    let afford = Math.floor(this.money / data.fuel_price);
    let get    = Math.min(want, afford);

    this.cost(get * data.fuel_price);
    this.ship.refuel(get);
  }

  burn(info) {
    let [acc] = info;
    this.ship.burn(acc);
  }

  plan() {
    let bodies = Object.keys(data.bodies);
    let avail  = Math.ceil(this.money * 0.5);
    let here   = game.place(this.place).report();
    let best;

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
          if (profit < 1) continue;
          //if (profit < Math.ceil(this.money * 0.1)) continue;

          // How far/long a trip?
          let mass = units * data.resources[resource].mass;
          let plan = system.astrogate(this.place, target, this.ship.acceleration_for_mass(mass));
          if (!plan) continue;

          // Estimate value
          let turns = Math.ceil(plan.time / data.hours_per_turn);
          let value = profit / (1 + Math.log10(1 + turns));

          if (best === undefined || best.value < value) {
            best = {
              value    : value,
              target   : target,
              resource : resource,
              profit   : profit,
              turns    : turns,
              accel    : plan.accel,
              units    : units
            };
          }
        }
        // proposition: go to where the goods are cheap
        // TODO buy local goods to sell at target
        else if (here[resource].buy > there.data[resource].sell) {
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
          if (profit < 1) continue;
          //if (profit < Math.ceil(this.money * 0.1)) continue;

          // How far/long a trip?
          let plan = system.astrogate(this.place, target, this.ship.acceleration);
          if (!plan) continue;

          // Estimate value
          let turns = Math.ceil(plan.time / data.hours_per_turn);
          let value = profit / (1 + Math.log10(1 + turns));

          if (best === undefined || best.value < value) {
            best = {
              value    : value,
              target   : target,
              resource : resource,
              profit   : profit,
              turns    : turns,
              accel    : plan.accel
            };
          }
        }
      }
    }

    if (!best && this.place != this.home) {
      let plan = system.astrogate(this.place, this.home, this.ship.acceleration);

      if (plan) {
        let turns = Math.ceil(plan.time / data.hours_per_turn);

        best = {
          value  : 0,
          target : this.home,
          turns  : turns,
          accel  : plan.accel
        };
      }
    }

    if (best) {
      if (best.units) {
        this.enqueue('buy', [this.place, best.resource, best.units]);
        for (let i = 0; i < best.turns; ++i) this.enqueue('burn', [best.accel]);
        this.enqueue('arrive', [best.target]);
        this.enqueue('sell', [best.target, best.resource, best.units]);
      }
      else {
        for (let i = 0; i < best.turns; ++i) this.enqueue('burn', [best.accel]);
        this.enqueue('arrive', [best.target]);
      }
    }
    else {
      this.enqueue('wait');

      if (this.money < data.hauler_money)
        this.money = data.hauler_money;
    }
  }
}
