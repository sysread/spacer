class Ship {
  constructor(opt) {
    this.opt   = opt || {};
    this.fuel  = opt.fuel || data.shipclass[opt.shipclass].tank;
    this.cargo = new ResourceCounter;
    this.dmg   = new DefaultMap(0);
  }

  save() {
    return {
      opt   : this.opt,
      fuel  : this.fuel,
      cargo : this.cargo.save(),
      dmg   : this.dmg.save()
    };
  }

  load(info) {
    this.opt  = info.opt;
    this.fuel = info.fuel;
    this.cargo.load(info.cargo);
    this.dmg.load(info.dmg);
  }

  /*
   * Shipclass properties or those derived from them
   */
  get shipclass()    { return data.shipclass[this.opt.shipclass] }
  get cargoSpace()   { return this.shipclass.cargo }
  get tank()         { return this.shipclass.tank }
  get drive()        { return data.drives[this.shipclass.drive] }
  get drives()       { return this.shipclass.drives }
  get driveMass()    { return this.drives * this.drive.mass }
  get mass()         { return this.shipclass.mass + this.driveMass }
  get thrust()       { return this.shipclass.drives * this.drive.thrust }
  get acceleration() { return Physics.deltav(this.thrust, this.mass) }

  /*
   * Properties of the ship itself
   */
  get cargoUsed()  { return this.cargo.sum() }
  get cargoLeft()  { return this.cargoSpace - this.cargoUsed }
  get holdIsFull() { return this.cargoLeft === 0 }

  thrustRatio(deltav, mass) {
    if (mass === undefined) mass = this.currentMass();

    // Calculate thrust required to accelerate our mass at deltav
    let thrust = Physics.force(mass, deltav);

    // Calculate fraction of full thrust required
    return thrust / this.thrust;
  }

  burnRate(deltav, mass) {
    // Calculate fraction of full thrust required
    let thrustRatio = this.thrustRatio(deltav, mass);

    // Calculate nominal burn rate
    let burnRate = this.drives * this.drive.burn_rate;

    // Reduce burn rate by the fraction of thrust being used
    return burnRate * thrustRatio;
  }

  cargoMass() {
    let m = 0;
    this.cargo.each((item, amt) => {m += data.resources[item].mass * amt});
    return m;
  }

  nominalMass(full_tank=false) {
    let m = this.mass;
    if (full_tank) m += this.tank;
    return m;
  }

  currentMass() {
    return this.mass + this.cargoMass() + (data.resources['fuel'].mass * this.fuel);
  }

  currentAcceleration() {
    return Physics.deltav(this.thrust, this.currentMass());
  }

  accelerationWithMass(mass) {
    return Physics.deltav(this.thrust, this.currentMass() + mass);
  }

  maxBurnTime(accel, nominal=false) {
    let fuel = this.fuel;
    let mass = this.currentMass();

    if (nominal) {
      fuel = this.tank;
      mass = this.nominalMass(true);
      if (accel === undefined) accel = Physics.deltav(this.thrust, mass);
    }
    else {
      if (accel === undefined) accel = this.currentAcceleration();
    }

    return Math.floor(fuel / this.burnRate(accel, mass));
  }

  refuelUnits() {return Math.ceil((this.tank - this.fuel) / data.resources.fuel.mass) }
  tankIsFull()  {return this.fuel === this.tank}
  tankIsEmpty() {return this.fuel === 0}

  refuel(units) {
    this.fuel = Math.min(this.tank, this.fuel + (units * data.resources.fuel.mass));
  }

  burn(deltav) {
    this.fuel = Math.max(0, this.fuel - this.burnRate(deltav));
    return this.fuel;
  }

  loadCargo(resource, amount) {
    if (this.cargoLeft < amount)
      throw new Error('no room left in the hold');
    this.cargo.inc(resource, amount);
  }

  unloadCargo(resource, amount) {
    if (this.cargo.get(resource) < amount)
      throw new Error('you do not have that many units available');
    this.cargo.dec(resource, amount);
  }

  shipValue() {
    let sc = this.shipclass;

    let price
      = (sc.mass  * 80)
      + (sc.hull  * 1000)
      + (sc.armor * 8000)
      + (sc.tank  * 150)
      + (sc.cargo * 65);

    if (this.shipclass.drive === 'ion')
      price += 500 + (this.shipclass.drives * 30);
    else if (this.shipclass.drive === 'fusion')
      price += 100000 + (this.shipclass.drives * 5000);

    return price;
  }

  cargoValue() {
    let place = game.place();
    let price = 0;
    this.cargo.each((item, amt) => {price += place.sellPrice(item) * amt});
    return price;
  }

  fuelValue() {
    let place = game.place();
    return place.sellPrice('fuel') * Math.floor(this.fuel / data.resources.fuel.mass);
  }

  price(tradein) {
    let cargo = this.cargoValue();
    let fuel  = this.fuelValue();
    let ship  = this.shipValue();
    if (tradein) ship = Math.ceil(ship * 0.7);
    return ship + cargo + fuel;
  }
}
