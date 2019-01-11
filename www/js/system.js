"use strict"

define(function(require, exports, module) {
  const data = require('data');
  const Physics = require('physics');
  const SolarSystem = require('vendor/solaris-model.min');

  const System = class {
    constructor() {
      this.system = new SolarSystem;
      this.cache  = {}; // orbit cache
      this.pos    = {}; // position cache
    }

    get_date() {
      return this.system.time.getDate();
    }

    set_date(date) {
      const dt = new Date(date + ' 00:00:00');
      const ts = dt.valueOf();

      if (dt.getDate() !== this.get_date()) {
        this.cache = {};

        for (const key of Object.keys(this.pos)) {
          if (key < ts)
            delete this.pos[key];
        }
      }

      this.system.setTime(date);
    }

    bodies() {
      return Object.keys(data.bodies);
    }

    forEach(fn) {
      this.bodies().forEach((name) => {fn(name, this.body(name))});
    }

    body(name) {
      if (name == 'trojans') {
        const jupiter = this.system.bodies.jupiter;
        return {
          name:    'Trojans',
          type:    'asteroids',
          central: this.system.bodies.sun,
          kind:    'Asteroid field',
          gravity: 0.01,
          radius:  jupiter.radius,

          getPositionAtTime: (date) => {
            const p = jupiter.getPositionAtTime(date);
            const r = Physics.distance(p, [0, 0, 0]);
            const t = -1.0472; // 60 degrees in radians
            const x = (p[0] * Math.cos(t)) - (p[1] * Math.sin(t));
            const y = (p[0] * Math.sin(t)) + (p[1] * Math.cos(t));
            return [x, y, 0];
          },
        };
      }

      return this.system.bodies[name];
    }

    short_name(name) {
      if (name === 'moon') return 'Luna';
      return this.body(name).name;
    }

    name(name) {
      if (data.bodies.hasOwnProperty(name))
        return data.bodies[name].name;
      return this.body(name).name;
    }

    faction(name) {
      return data.bodies[name].faction;
    }

    type(name) {
      const type = this.body(name).type;
      if (type === 'dwarfPlanet') return 'dwarf';
      return type;
    }

    central(name) {
      let body = this.body(name);
      if (body.central) return body.central.key;
      return;
    }

    kind(name) {
      let body = this.body(name);
      let type = this.type(name);

      if (type == 'dwarf') {
        type = 'Dwarf';
      }
      else if (body.central && body.central.name != 'The Sun') {
        type = body.central.name;
      }
      else {
        type = 'Planet';
      }

      return type;
    }

    gravity(name) {
      // Artificial gravity (spun up, orbital)
      if (data.bodies.hasOwnProperty(name) && data.bodies[name].hasOwnProperty('gravity')) {
        return data.bodies[name].gravity;
      }

      const grav   = 6.67e-11;
      const body   = this.body(name);
      const mass   = body.mass;
      const radius = body.radius;
      return (grav * mass) / Math.pow(radius, 2) / Physics.G;
    }

    ranges(point) {
      const ranges = {};

      for (const body of this.bodies()) {
        ranges[body] = Physics.distance(point, this.position(body));
      }

      return ranges;
    }

    closestBodyToPoint(point) {
      let dist, closest;

      for (const body of this.bodies()) {
        const d = Physics.distance(point, this.position(body));
        if (dist === undefined || d < dist) {
          dist = d;
          closest = body;
        }
      }

      return [closest, dist];
    }

    addPoints(p1, p2) {
      const [x0, y0, z0] = p1;
      const [x1, y1, z1] = p2;
      return [x1 + x0, y1 + y0, z1 + z0];
    }

    position(name, date) {
      if (name == 'sun') {
        return [0, 0, 0];
      }

      date = date || this.system.time;
      const key = date.valueOf();

      if (!this.pos.hasOwnProperty(key))
        this.pos[key] = {};

      if (!this.pos[key].hasOwnProperty(name)) {
        const body = this.body(name);
        let pos = body.getPositionAtTime(date);

        if (body.central.key !== 'sun') {
          pos = this.addPoints(pos, body.central.getPositionAtTime(date));
        }

        this.pos[key][name] = pos;
      }

      return this.pos[key][name];
    }

    orbit(name) {
      const key = `${name}.orbit`;

      if (!this.cache.hasOwnProperty(key)) {
        const date  = new Date(this.system.time);
        const orbit = [this.position(name)];

        for (let day = 1; day < 365; ++day) {
          date.setDate(date.getDate() + 1);
          orbit.push(this.position(name, date));
        }

        this.cache[key] = orbit;
      }

      return this.cache[key];
    }

    orbit_by_turns(name) {
      const key = `${name}.orbit.byturns`;

      if (!this.cache.hasOwnProperty(key)) {
        const tpd = 24 / data.hours_per_turn;
        const orbit = this.orbit(name);

        let point = orbit[0];
        const path = [point];

        for (let day = 1; day < orbit.length; ++day) {
          const next = orbit[day];
          const dx = Math.ceil((next[0] - point[0]) / tpd);
          const dy = Math.ceil((next[1] - point[1]) / tpd);
          const dz = Math.ceil((next[2] - point[2]) / tpd);

          for (let i = 1; i <= tpd; ++i) {
            path.push([
              point[0] + (i * dx),
              point[1] + (i * dy),
              point[2] + (i * dz),
            ]);
          }

          point = next;
        }

        this.cache[key] = path;
      }

      return this.cache[key];
    }

    distance(origin, destination) {
      return Physics.distance(
        this.position(origin),
        this.position(destination)
      );
    }

    plot() {
      let abs    = Math.abs;
      let ceil   = Math.ceil;
      let floor  = Math.floor;
      let max    = Math.max;
      let min    = Math.min;
      let round  = Math.round;
      let bodies = this.bodies();
      let pos    = {};

      // Get coordinates and hypot for each body, scaled down
      for (let name of bodies) {
        let [x, y, z] = this.position(name);
        x = ceil(x / 1000);
        y = ceil(y / 1000);
        pos[name] = {x:x, y:y};
      }

      // Calculate max values for x and y
      let max_x = Math.ceil(1.2 * Object.values(pos).reduce((acc, val) => {return max(acc, abs(val.x))}, 0));
      let max_y = Math.ceil(1.2 * Object.values(pos).reduce((acc, val) => {return max(acc, abs(val.y))}, 0));

      // Calculate scaled coordinates
      let plot   = [['sun', 0, 0]];
      let points = {'sun': [0, 0]};

      for (let name of bodies) {
        let p = pos[name];
        let pct_x = 0;
        let pct_y = 0;

        if (p.x !== 0) pct_x = p.x / max_x * 100;
        if (p.y !== 0) pct_y = p.y / max_y * 100;

        points[name] = [pct_x, pct_y];
        plot.push([name, pct_x, pct_y]);
      }

      return {
        max_x  : max_x,
        max_y  : max_y,
        points : points
      };
    }
  };

  return new System;
});
