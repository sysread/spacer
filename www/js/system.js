class System {
  constructor() {
    this.system = new SolarSystem;
    this.cache  = {};
  }

  set_date(date) {
    if (new Date(date + ' 01:00:00').getDate() !== this.system.time.getDate())
      this.cache = {};

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
      type = 'dwarf';
    }
    else if (body.central && body.central.name != 'The Sun') {
      type = body.central.name;
      //type = `Moon of ${body.central.name}`;
    }
    else {
      type = 'planet';
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
    let key = `${name}.orbit`;
    if (!this.cache.hasOwnProperty(key))
      this.cache[key] = this.body(name).getOrbitPath();
    return this.cache[key];
  }

  orbit_by_turns(name) {
    let key = `${name}.orbit.byturns`;
    if (!this.cache.hasOwnProperty(key)) {
      let orbit = this.orbit(name);
      let point = orbit[0];
      let path  = [point];
      let end   = orbit.length;
      let turns_per_day = 24 / data.hours_per_turn;

      for (let day = 1; day < end; ++day) {
        let next = orbit[day];
        let dx = (point[0] - next[0]) / turns_per_day;
        let dy = (point[1] - next[1]) / turns_per_day;
        let dz = (point[2] - next[2]) / turns_per_day;

        for (var i = 1; i < turns_per_day; ++i) {
          path.push([
            point[0] + (i * dx),
            point[1] + (i * dy),
            point[2] + (i * dz)
          ]);
        }

        point = next;
      }

      this.cache[key] = path;
    }

    return this.cache[key];
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

    return Math.hypot(
      b1.position[0] - b2.position[0],
      b1.position[1] - b2.position[1],
      b1.position[2] - b2.position[2]
    );
  }

  astrogate(origin, target, max_g) {
    let key = [origin, target, max_g, 'route'].join('.');
    if (!this.cache.hasOwnProperty(key))
      this.cache[key] = this._astrogate(origin, target, max_g);
    return this.cache[key];
  }

  /*
   * S = (v * t) + (0.5 * a * t^2)
   *
   * pretending initial velocity is 0:
   *   S = 0.5 * a * t^2
   *   a = (S * 2) / t^2
   */
  _astrogate(origin, target, max_g) {
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

    let orbit         = this.orbit_by_turns(b2.key);
    let turns_per_day = 24 / data.hours_per_turn;
    let secs_per_hr   = 60 * 60;
    let turns_to_secs = turns_per_day * secs_per_hr;

    for (var i = 1; i < orbit.length; ++i) {
      // Calculate distance to flip point
      let S = Math.hypot(p1[0] - orbit[i][0], p1[1] - orbit[i][1], p1[2] - orbit[i][2]) * 0.5;

      // Calculate time to flip point
      let t1 = i * turns_to_secs;
      let t2 = t1 * 0.5;

      // Convert seconds to hours
      let hrs = t1 / secs_per_hr;

      // Calculate acceleration required to reach flip point
      let a = S / (t2 * t2) * 0.5;

      if (a <= max) {
        time = hrs,
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
