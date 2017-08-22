class System {
  constructor() {
    this.system = new SolarSystem;
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

  type(name) {
    return this.system.bodies[name].type;
  }

  kind(name) {
    let body = this.body(name);
    let type = this.type(name);

    if (type == 'dwarfPlanet') {
      type = 'Dwarf Planet';
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

  p2p_distance(p1, p2) {
    let [x1, y1, z1] = p1;
    let [x2, y2, z2] = p2;
    let v = Math.pow(x1 - x2, 2);
    let h = Math.pow(y1 - y2, 2);
    return Math.sqrt(h + v);
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

  travel_time(origin, target, gravities) {
    let acc = 9.80665 * gravities;
    let b1  = this.body(origin);
    let b2  = this.body(target);
    let p1, p2;

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
      [b1, b2] = b2, b1;
      p1 = [0, 0, 0];
    }
    else {
      if (b1.type == 'moon') {
        b1 = b1.central;
      }

      if (b2.type == 'moon') {
        b2 = b2.central;
      }

      p1 = b1.position;
    }

    let orbit = b2.getOrbitPath();
    let dist;
    let time;

    for (var i = 0; i < orbit.length; ++i) {
      let m = this.p2p_distance(p1, orbit[i]);
      let a = acc/2;
      let c = -(m / 2);
      let t = Math.sqrt(-4 * a * c) / (2 * a);

      if (time === undefined || t < time) {
        time = t;
        dist = m;
      }
    }

    let hours = time / 60 / 60;

    return [dist * 2, hours * 2];
  }
}

const system = new System;
