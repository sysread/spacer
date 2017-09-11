class System {
  constructor() {
    this.system = new SolarSystem;
    this.cache  = new Map;
  }

  set_date(date) {
    if (new Date(date + ' 01:00:00').getDate() !== this.system.time.getDate())
      this.cache.clear();

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
    let n = this.body(name).name;
    if (n == 'The Moon') return 'Luna';
    return n;
  }

  type(name) {
    return this.system.bodies[name].type;
  }

  central(name) {
    let body = this.body(name);
    if (body.central) return body.central.key;
    return;
  }

  kind(name) {
    let body = this.body(name);
    let type = this.type(name);

    if (type == 'dwarfPlanet') {
      type = 'Dwarf planet';
    }
    else if (body.central && body.central.name != 'The Sun') {
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
    if (!this.cache.has(name))
      this.cache.set(name, this.body(name).getOrbitPath());
    return this.cache.get(name);
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
  astrogate(origin, target, max_g) {
    if (max_g === undefined) max_g = 1.0;
    let b1  = this.body(origin);
    let b2  = this.body(target);
    let max = max_g * data.G;
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

    let orbit = this.orbit_by_turns(this.orbit(b2.key));

    for (var i = 1; i < orbit.length; ++i) {
      // Calculate distance to flip point
      let S = this.p2p_distance(p1, orbit[i]) * 0.5;

      // Calculate time to flip point
      let t = i * 4 * 60 * 60 * 0.5; // turns to seconds / 2

      // Convert seconds to hours
      let hrs = t / 60 / 60 * 2;

      // Calculate acceleration required to reach flip point
      let a = S / (t * t) * 0.5;

      if (a <= max) {
        time = t / 60 / 60 * 2; // hours
        dist = S * 2;           // meters
        acc  = a / data.G;      // gravities
        break;
      }
    }

    if (time === undefined)
      return null;

    return new Transit({
      dest  : target,              // destination name
      dist  : Math.ceil(dist * 2), // meters
      time  : Math.ceil(time * 2), // hours
      accel : Math.max(0.01, acc)  // gravities
    });
  }

  plot() {
    let abs    = Math.abs;
    let ceil   = Math.ceil;
    let floor  = Math.floor;
    let max    = Math.max;
    let round  = Math.round;
    let bodies = this.bodies();
    let pos    = {};

    // Get coordinates and hypot for each body, scaled down
    for (let name of bodies) {
      let body = this.body(name);

      if (body.type === 'moon')
        body = body.central;

      let [x, y, z] = body.position;
      x = ceil(x / 1000);
      y = ceil(y / 1000);

      pos[name] = {x:x, y:y};
    }

    // Calculate max values for x and y
    let max_x = Object.values(pos).reduce((acc, val) => {return max(acc, abs(val.x))}, 0);
    let max_y = Object.values(pos).reduce((acc, val) => {return max(acc, abs(val.y))}, 0);

    // Calculate scaled coordinates
    let plot  = [['sun', 0, 0]];
    for (let name of bodies) {
      let p     = pos[name];
      let pct_x = round(p.x / max_x * 100);
      let pct_y = round(p.y / max_y * 100);

      plot.push([name, pct_x, pct_y]);
    }

    return {
      max_x  : plot.reduce((acc, val) => {return max(acc, abs(val[1]))}, 0),
      max_y  : plot.reduce((acc, val) => {return max(acc, abs(val[2]))}, 0),
      bodies : plot
    };
  }
}

const system = new System;
