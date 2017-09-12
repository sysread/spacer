class Ship {
  constructor(opt) {
    this.opt   = opt || {};
    this.fuel  = opt.fuel || data.shipclass[opt.shipclass].tank;
    this.cargo = new ResourceCounter;
  }

  save() {
    return {
      opt   : this.opt,
      fuel  : this.fuel,
      cargo : this.cargo.save()
    };
  }

  load(info) {
    this.opt  = info.opt;
    this.fuel = info.fuel;
    this.cargo.load(info.cargo);
  }

  get name()          { return this.opt.name }
  get shipclass()     { return data.shipclass[this.opt.shipclass] }
  get cargo_space()   { return this.shipclass.cargo }
  get cargo_used()    { return this.cargo.sum() }
  get cargo_left()    { return this.cargo_space - this.cargo_used }
  get hold_is_full()  { return this.cargo_left === 0 }
  get thrust()        { return this.shipclass.drives * data.drives[this.shipclass.drive].thrust }
  get acceleration()  { return this.thrust / this.mass }
  get tank()          { return this.shipclass.tank }
  get burn_rate()     { return this.shipclass.drives * data.drives[this.shipclass.drive].burn_rate }

  get mass() {
    let m = this.shipclass.mass;
    this.cargo.each((item, amt) => {m += data.resources[item].mass * amt});

    for (let i = 0; i < this.shipclass.drives; ++i)
      m += data.drives[this.shipclass.drive].mass;

    return m;
  }

  acceleration_for_mass(cargo_mass) {
    let m = this.shipclass.mass + cargo_mass;

    for (let i = 0; i < this.shipclass.drives; ++i)
      m += data.drives[this.shipclass.drive].mass;

    return this.thrust / m;
  }

  range(accel, nominal=false) {
    if (accel === undefined) accel = this.acceleration;
    let burn_ratio = accel / this.acceleration;
    let fuel = nominal ? this.tank : this.fuel;
    return Math.floor(fuel / (this.burn_rate * burn_ratio));
  }

  refuel_units()  {return Math.ceil(this.tank - this.fuel) }
  tank_is_full()  {return this.fuel === this.tank}
  tank_is_empty() {return this.fuel === 0}

  refuel(units) {
    this.fuel = Math.min(this.tank, this.fuel + units);
  }

  burn(accel) {
    this.fuel = Math.max(0, this.fuel - (this.burn_rate * (accel / this.acceleration)));
    return this.fuel;
  }

  load_cargo(resource, amount) {
    if (this.cargo_left < amount)
      throw new Error('no room left in the hold');
    this.cargo.inc(resource, amount);
  }

  unload_cargo(resource, amount) {
    if (this.cargo.get(resource) < amount)
      throw new Error('you do not have that many units available');
    this.cargo.dec(resource, amount);
  }
}
