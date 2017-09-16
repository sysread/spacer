var hauler_note = {};

class Hauler extends Actor {
  constructor(opt) {
    opt = opt || {};
    super(opt);
    this.home  = opt.place;
    this.ship  = new Ship({shipclass: opt.ship || 'trader'});
    this.trips = 0;

    // Delay start
    let turns = Math.floor(Math.random() * 10) + 1;
    for (let i = 0; i < turns; ++i)
      this.enqueue('wait');
  }

note(dest, res, amt) {
  let p = this.place;
  if (!hauler_note.hasOwnProperty(p)) hauler_note[p] = {};
  if (!hauler_note[p].hasOwnProperty(dest)) hauler_note[p][dest] = {};
  if (!hauler_note[p][dest].hasOwnProperty(res)) hauler_note[p][dest][res] = 0;
  hauler_note[p][dest][res] += amt;
}

  save() {
    let obj   = super.save();
    obj.home  = this.home;
    obj.ship  = this.ship.save();
    obj.trips = this.trips;
    return obj;
  }

  load(obj) {
    super.load(obj);
    this.home  = obj.home;
    this.trips = obj.trips;
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
  }

  burn(info) {
    let [acc] = info;
    this.ship.burn(acc);
  }

  arrive(info) {
    let [place] = info;
    this.place = place;
    this.trips++;
    this.refuel();
  }

  refuel() {
    let place = game.place(this.place);
    let price = place.buy_price('fuel');
    let want  = this.ship.refuel_units();
    let avail = place.current_supply('fuel');
    let get   = Math.min(avail, want, Math.floor(this.money / price));

    if (get > 0) {
      this.cost(place.buy('fuel', get));
      this.ship.refuel(get);
    }

    let unfilled = this.ship.refuel_units();
    if (unfilled > 0)
      place.inc_demand('fuel', unfilled);
  }

  harvest(info) {
    let [turns] = info;
    let resources = game.place(this.place).harvest(turns);
    let profit = 0;

    resources.each((item, amt) => {
      profit += game.place(this.place).sell(item, amt);
    });

    this.money += profit;
  }

  *astrogate(target, cargo_mass=0) {
    // Calculate max acceleration for ship, assuming staff can handle 0.5G
    let maxdv = Math.min(0.5, this.ship.acceleration_with_mass(cargo_mass));
    let paths = system.astrogator(this.place, target);

    for (let path of paths) {
      if (path.accel > maxdv) continue;
      if (path.turns > this.ship.max_burn_time(path.accel)) continue;
      yield path;
    }
  }

  value(profit, turns) {
    return profit / Math.log2(1 + turns);
  }

  go_home() {
    if (this.home === this.place)
      return;

    let plan = this.astrogate(this.home);

    if (plan && plan.turns * (24 / data.hours_per_turn) < 100) {
      let turns = Math.ceil(plan.time / data.hours_per_turn);
      if (this.ship.thrust_ratio(plan.accel) > 0.8) return;
      if (turns * (24 / data.hours_per_turn) > 100) return;
      for (let i = 0; i < plan.turns; ++i) this.enqueue('burn', [plan.accel]);
      this.enqueue('arrive', [this.home]);
      return true;
    }

    this.enqueue('refuel');

    return false;
  }

  plan() {
    let bodies = Object.keys(data.bodies);
    let avail  = Math.ceil(this.money * 0.5);
    let here   = game.place(this.place).report();
    let best;

    if (this.place === this.home) {
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
            let units = Math.min(here[resource].stock, Math.floor(this.money / here[resource].buy), this.ship.cargo_left);
            if (units === 0) continue;

            // Is the net profit worth our time?
            let profit = profit_per_unit * units;
            if (profit < 1) continue;

            // How far/long a trip?
            let mass = units * data.resources[resource].mass;
            let nav = this.astrogate(target, mass);
            let fuel;
            let value;
            let plan;

            for (let path of nav) {
              let fuel_cost = there.data.fuel.buy * path.turns * this.ship.burn_rate(path.accel);
              let net = (profit - fuel_cost) / path.turns;

              if (value === undefined || net > value) {
                value = net;
                plan  = path;
                fuel  = fuel_cost;
              }
            }

            if (!plan) continue;

            profit -= fuel;

            if (best === undefined || best.value < value) {
              best = {
                value    : value,
                target   : target,
                resource : resource,
                profit   : profit,
                turns    : plan.turns,
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
            let units = Math.min(there.data[resource].stock, Math.floor(this.money / there.data[resource].buy), this.ship.cargo_left);
            if (units === 0) continue;

            // Is the net profit worth our time?
            let profit = profit_per_unit * units;
            if (profit < 1) continue;

            // How far/long a trip?
            let nav = this.astrogate(target);
            let fuel;
            let value;
            let plan;

            for (let path of nav) {
              let fuel_cost = there.data.fuel.buy * path.turns * this.ship.burn_rate(path.accel);
              let net = (profit - fuel_cost) / path.turns;

              if (value === undefined || net > value) {
                value = net;
                plan  = path;
                fuel  = fuel_cost;
              }
            }

            if (!plan) continue;

            profit -= fuel;

            if (best === undefined || best.value < value) {
              best = {
                value    : value,
                target   : target,
                resource : resource,
                profit   : profit,
                turns    : plan.turns,
                accel    : plan.accel
              };
            }
          }
        }
      }
    }
    else {
      let there = game.market(this.home);

      for (let resource of Object.keys(here)) {
        // proposition: buy here, sell there
        if (here[resource].buy < there.data[resource].sell) {
          // Are there any units to buy there?
          if (here[resource].stock === 0) continue;

          // Is this resource profitable?
          let profit_per_unit = there.data[resource].sell - here[resource].buy;
          if (profit_per_unit < 1) continue;

          // How many units can we afford?
          let units = Math.min(here[resource].stock, Math.floor(this.money / here[resource].buy), this.ship.cargo_left);
          if (units === 0) continue;

          // Is the net profit worth our time?
          let profit = profit_per_unit * units;
          if (profit < 1) continue;

          // How far/long a trip?
          let mass = units * data.resources[resource].mass;
          let plan = this.astrogate(this.home, mass);
          if (!plan) continue;

          if (best === undefined || best.value < profit) {
            best = {
              value    : profit,
              target   : this.home,
              resource : resource,
              profit   : profit,
              turns    : plan.turns,
              accel    : plan.accel,
              units    : units
            };
          }
        }
      }
    }

    if (best) {
      if (best.units) {
//console.log(`<${this.home}> ${this.place} --> ${best.target} : ${best.resource}`);
this.note(best.target, best.resource, best.units);
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
      if (!this.go_home()) {
        let turns = (24 / data.hours_per_turn) * (Math.floor(Math.random() * 4) + 1);
        for (let i = 0; i < turns; ++i) this.enqueue('wait');
        this.enqueue('harvest', [turns]);
      }
    }
  }
}
