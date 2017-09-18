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

  /*
   * Shipclass properties or those derived from them
   */
  get shipclass()     { return data.shipclass[this.opt.shipclass] }
  get cargo_space()   { return this.shipclass.cargo }
  get tank()          { return this.shipclass.tank }
  get drive()         { return data.drives[this.shipclass.drive] }
  get drives()        { return this.shipclass.drives }
  get drive_mass()    { return this.drives * this.drive.mass }
  get mass()          { return this.shipclass.mass + this.drive_mass }
  get thrust()        { return this.shipclass.drives * this.drive.thrust }
  get acceleration()  { return Physics.deltav(this.thrust, this.mass) }

  /*
   * Properties of the ship itself
   */
  get cargo_used()    { return this.cargo.sum() }
  get cargo_left()    { return this.cargo_space - this.cargo_used }
  get hold_is_full()  { return this.cargo_left === 0 }

  thrust_ratio(deltav, mass) {
    if (mass === undefined) mass = this.current_mass();

    // Calculate thrust required to accelerate our mass at deltav
    let thrust = Physics.force(mass, deltav);

    // Calculate fraction of full thrust required
    return thrust / this.thrust;
  }

  burn_rate(deltav, mass) {
    // Calculate fraction of full thrust required
    let thrust_ratio = this.thrust_ratio(deltav, mass);

    // Calculate nominal burn rate
    let burn_rate = this.drives * this.drive.burn_rate;

    // Reduce burn rate by the fraction of thrust being used
    return burn_rate * thrust_ratio;
  }

  cargo_mass() {
    let m = 0;
    this.cargo.each((item, amt) => {m += data.resources[item].mass * amt});
    return m;
  }

  nominal_mass(full_tank=false) {
    let m = this.mass;
    if (full_tank) m += this.tank;
    return m;
  }

  current_mass() {
    return this.mass + this.cargo_mass() + (data.resources['fuel'].mass * this.fuel);
  }

  current_acceleration() {
    return Physics.deltav(this.thrust, this.current_mass());
  }

  acceleration_with_mass(mass) {
    return Physics.deltav(this.thrust, this.current_mass() + mass);
  }

  max_burn_time(accel, nominal=false) {
    let fuel = this.fuel;
    let mass = this.current_mass();

    if (nominal) {
      fuel = this.tank;
      mass = this.nominal_mass(true);
      if (accel === undefined) accel = Physics.deltav(this.thrust, mass);
    }
    else {
      if (accel === undefined) accel = this.current_acceleration();
    }

    return Math.floor(fuel / this.burn_rate(accel, mass));
  }

  refuel_units()  {return Math.ceil(this.tank - this.fuel) }
  tank_is_full()  {return this.fuel === this.tank}
  tank_is_empty() {return this.fuel === 0}

  refuel(units) {
    this.fuel = Math.min(this.tank, this.fuel + (units * data.resources['fuel'].mass));
  }

  burn(deltav) {
    this.fuel = Math.max(0, this.fuel - this.burn_rate(deltav));
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

  price() {
    let info = this.shipclass;
    let price = (info.mass  * 100)
              + (info.hull  * 1000)
              + (info.armor * 8000)
              + (info.tank  * 150)
              + (info.cargo * 65);
    return price;
  }
}
