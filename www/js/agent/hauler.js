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
    game.place(place).buy(item, amount);
    this.ship.load_cargo(item, amount);
  }

  sell(info) {
    let [place, item, amount] = info;
    this.ship.unload_cargo(item, amount);

    if (!this.busted(item, amount))
      game.place(place).sell(item, amount);
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
    let get   = Math.min(avail, want);

    if (get > 0) {
      place.buy('fuel', get);
      this.ship.refuel(get);
    }

    let unfilled = this.ship.refuel_units();
    if (unfilled > 0)
      place.inc_demand('fuel', unfilled);
  }

  harvest(info) {
    let [turns] = info;
    let resources = game.place(this.place).harvest(turns);

    resources.each((item, amt) => {
      game.place(this.place).sell(item, amt);
    });
  }

  *astrogate(target, cargo_mass=0) {
    // Calculate max acceleration for ship, assuming staff can handle 0.65G
    let maxdv = Math.min(0.65, this.ship.acceleration_with_mass(cargo_mass));
    let maxf  = Math.ceil(this.ship.fuel * 0.5);
    let paths = system.astrogator(this.place, target);

    for (let path of paths) {
      if (path.accel > maxdv) continue;                                  // to high a burn
      if (path.turns > this.ship.max_burn_time(path.accel)) continue;    // out of range
      if (path.turns * this.ship.burn_rate(path.accel) > maxf) continue; // fuel usage too high
      yield path;
    }
  }

  value(profit, turns) {
    return profit / Math.log2(1 + turns);
  }

  plan() {
    let bodies = Object.keys(data.bodies);
    let here   = game.place(this.place).report();
    let best;

    if (this.trips === 0 || this.trips % 4 !== 0) {
      for (let target of bodies) {
        if (target === this.place) continue;

        let there = game.market(target, this.place);
        if (there === null) continue;

        for (let resource of Object.keys(here)) {
          if (this.is_over_supplied(resource, target)) continue;

          // proposition: buy here, sell there
          if (here[resource].buy < there.data[resource].sell) {
            // Are there any units to buy there?
            if (here[resource].stock === 0) continue;

            // Is this resource profitable?
            let profit_per_unit = there.data[resource].sell - here[resource].buy;
            if (profit_per_unit < 1) continue;

            // How many units can we afford?
            let units = Math.min(here[resource].stock, this.ship.cargo_left);
            if (units === 0) continue;

            // Is the net profit worth our time?
            let profit = profit_per_unit * units;
            if (profit < 1) continue;

            // How far/long a trip?
            let mass = units * data.resources[resource].mass;
            let nav = this.astrogate(target, mass);
            let fuel;
            let plan;

            for (let path of nav) {
              fuel = there.data.fuel.buy * path.turns * this.ship.burn_rate(path.accel);
              plan = path;
              break;
            }

            if (!plan) continue;
            profit -= fuel;

            if (data.bodies[target].faction === data.bodies[this.home].faction)
              profit *= 1.5;

            if (best === undefined || best.profit < profit) {
              if (this.contra_rand(resource)) continue; // just say no

              best = {
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
            let units = Math.min(there.data[resource].stock, this.ship.cargo_left);
            if (units === 0) continue;

            // Is the net profit worth our time?
            let profit = profit_per_unit * units;
            if (profit < 1) continue;

            // How far/long a trip?
            let nav = this.astrogate(target);
            let fuel;
            let plan;

            for (let path of nav) {
              fuel = there.data.fuel.buy * path.turns * this.ship.burn_rate(path.accel);
              plan = path;
              break;
            }

            if (!plan) continue;

            profit -= fuel;

            if (best === undefined || best.profit < profit) {
              best = {
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
      let there = game.market(this.home, this.place);

      for (let resource of Object.keys(here)) {
        if (this.is_over_supplied(resource, this.home)) continue;

        // proposition: buy here, sell there
        if (here[resource].buy < there.data[resource].sell) {
          // Are there any units to buy there?
          if (here[resource].stock === 0) continue;

          // Is this resource profitable?
          let profit_per_unit = there.data[resource].sell - here[resource].buy;
          if (profit_per_unit < 1) continue;

          // How many units can we afford?
          let units = Math.min(here[resource].stock, this.ship.cargo_left);
          if (units === 0) continue;

          // Is the net profit worth our time?
          let profit = profit_per_unit * units;
          if (profit < 1) continue;

          // How far/long a trip?
          let mass = units * data.resources[resource].mass;
          let nav = this.astrogate(this.home, mass);
          let fuel;
          let plan;

          for (let path of nav) {
            fuel = there.data.fuel.buy * path.turns * this.ship.burn_rate(path.accel);
            plan = path;
            break;
          }

          if (!plan) continue;
          profit -= fuel;

          if (best === undefined || best.profit < profit) {
            best = {
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
        this.enqueue('buy', [this.place, best.resource, best.units]);
        for (let i = 0; i < best.turns; ++i) this.enqueue('burn', [best.accel]);
        this.enqueue('arrive', [best.target]);
        this.enqueue('sell', [best.target, best.resource, best.units]);
      }
      else {
//console.log(`<${this.home}> ${this.place} --> ${best.target}`);
        for (let i = 0; i < best.turns; ++i) this.enqueue('burn', [best.accel]);
        this.enqueue('arrive', [best.target]);
      }
    }
    else {
      this.enqueue('harvest', [2]);
      this.enqueue('refuel');
    }
  }
}
