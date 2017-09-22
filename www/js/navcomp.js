class NavComp {
  constructor(max_acc, ship, origin) {
    this.max  = max_acc;
    this.ship = ship;
    this.orig = origin;
  }

  get maxdv() { return Math.min(this.max, this.ship.currentAcceleration()) }

  get transits() {
    if (this.data === undefined) {
      this.data = {};

      for (let dest of system.bodies()) {
        this.data[dest] = [];

        for (let transit of system.astrogator(this.orig, dest)) {
          if (transit.accel > this.maxdv) continue;
          if (transit.turns > this.ship.maxBurnTime(transit.accel)) continue;

          let burn = this.ship.burnRate(transit.accel, this.ship.currentMass());

          this.data[dest].push({
            index   : this.data[dest].length,
            transit : transit,
            turns   : transit.turns,
            fuel    : transit.turns * burn,
            burn    : burn
          });
        }
      }
    }

    return this.data;
  }

  search(destination, approve) {
    if (!approve) return this.transits[destination];
    return this.transits[destination].filter(approve);
  }

  fastest(destination) {
    if (this.transits[destination].length === 0) return;
    return this.transits[destination].reduce((a, b) => {
      return a.turns < b.turns ? a : b;
    });
  }
}
