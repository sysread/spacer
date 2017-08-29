class System {
  constructor() {
    this.system = new SolarSystem;
    this.C      = 299792458;    // m/s
    this.G      = 9.80665;      // m/s/s
    this.AU     = 149597870700; // m
  }

  set_date(date) {
    this.system.setTime(date);
  }

  bodies() {
    return Object.keys(data.bodies);
  }

  forEach(fn) {
    this.bodies().forEach((name) => {fn(name, this.body(name))});
  }

  body(name) {
    return this.system.bodies[name];
  }

  name(name) {
    return this.body(name).name;
  }

  type(name) {
    return this.system.bodies[name].type;
  }

  kind(name) {
    let body = this.body(name);
    let type = this.type(name);

    if (type == 'dwarfPlanet') {
      type = 'Dwarf planet';
    }
    else if (body.central.name != 'The Sun') {
      type = `Moon of ${body.central.name}`;
    }
    else {
      type = 'Planet';
    }

    return type;
  }

  gravity(name) {
    return this.system.bodies['earth'].mass / this.system.bodies[name].mass;
  }

  position(name) {
    return this.body(name).position;
  }

  orbit(name) {
    return this.body(name).getOrbitPath();
  }

  orbit_by_turns(orbit) {
    let point = orbit.shift();
    let path  = [point];

    while (orbit.length > 0) {
      let next = orbit.shift();
      let dx = (point[0] - next[0]) / 6;
      let dy = (point[1] - next[1]) / 6;
      let dz = (point[2] - next[2]) / 6;

      for (var i = 1; i < 6; ++i) {
        path.push([
          point[0] + (i * dx),
          point[1] + (i * dy),
          point[2] + (i * dz)
        ]);
      }

      point = next;
    }

    return path;
  }

  p2p_distance(p1, p2) {
    let [x1, y1, z1] = p1;
    let [x2, y2, z2] = p2;
    return Math.hypot(x1 - x2, y1 - y2, z1 - z2);
  }

  distance(origin, destination) {
    let b1 = this.body(origin);
    let b2 = this.body(destination);

    if (b1.type == 'moon' && b1.central.name != b2.name) {
      b1 = b1.central;
    }

    if (b2.type == 'moon' && b2.central.name != b1.name) {
      b2 = b2.central;
    }

    return this.p2p_distance(b1.position, b2.position);
  }

  /*
   * S = (v * t) + (0.5 * a * t^2)
   *
   * pretending initial velocity is 0:
   *   S = 0.5 * a * t^2
   *   a = (S * 2) / t^2
   */
  astrogate(origin, target, max_g=1) {
    let b1  = this.body(origin);
    let b2  = this.body(target);
    let max = max_g * this.G;
    let p1;
    let time;
    let dist;
    let acc;

    // body to body in the same system
    if (b1.central.name == b2.central.name) {
      p1 = b1.position;
    }
    // planet to moon
    else if (b1.name == b2.central.name) {
      p1 = [0, 0, 0];
    }
    // moon to planet
    else if (b1.central.name == b2.name) {
      [b1, b2] = [b2, b1];
      p1 = [0, 0, 0];
    }
    else {
      if (b1.type == 'moon') b1 = b1.central;
      if (b2.type == 'moon') b2 = b2.central;
      p1 = b1.position;
    }

    let orbit = this.orbit_by_turns(b2.getOrbitPath());

    for (var i = 1; i < orbit.length; ++i) {
      // Calculate distance to flip point
      let S = this.p2p_distance(p1, orbit[i]) * 0.5;

      // Calculate time to flip point
      let t = i * 4 * 60 * 60 * 0.5; // turns to seconds / 2

      // Calculate acceleration required to reach flip point
      let a = S / (t * t) * 0.5;

      if (a <= max) {
        time = t / 60 / 60 * 2; // seconds to hours
        dist = S * 2;           // meters
        acc  = a / this.G;      // gravities
        break;
      }
    }

    if (time === undefined)
      return null;

    return {
      dist  : dist * 2, // meters
      time  : time * 2, // hours
      accel : acc       // gravities
    };
  }
}

const system = new System;
