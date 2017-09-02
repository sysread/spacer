class Ship {
  constructor(opt) {
    this.opt   = opt || {};
    this.cargo = new ResourceCounter;
  }

  save() {
    return {opt: this.opt, cargo: this.cargo.save()};
  }

  load(obj) {
    this.opt = obj.opt;
    this.cargo.load(obj.cargo);
  }

  get name() { return this.opt.name }
  get shipclass() { return data.shipclass[this.opt.shipclass] }
  get cargo_space() { return this.shipclass.cargo }

  get cargo_used() {
    let n = 0;
    this.cargo.each((item, amt) => {n += amt});
    return n;
  }

  get cargo_left() { return this.cargo_space - this.cargo_used }
  get hold_is_full() { return this.cargo_left === 0 }

  get mass() {
    let m = this.shipclass.mass;
    this.cargo.each((item, amt) => {m += data.resources[item].mass * amt});
    return m;
  }

  acceleration() {
    return this.shipclass.thrust / this.mass;
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
