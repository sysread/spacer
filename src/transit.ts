import Physics from './physics';
import system from './system';
import Layout from './layout';

import { Point } from './vector';
import { TransitPlan } from './transitplan';
import { Person } from './person';

import * as t from './common';


declare var window: {
  game: {
    player: Person;
    locus:  t.body;
    turn:   (turns?: number, nosave?: boolean) => void;
  };
};


interface Body {
  coords:   Point;
  diameter: number;
}


class Transit {
  plan:        TransitPlan;
  layout:      Layout;
  bodies:      { [key: string]: Body };
  orbits:      { [key: string]: Point[] };
  full_orbits: { [key: string]: Point[] };

  constructor(plan: TransitPlan, layout: Layout) {
    this.plan        = plan;
    this.layout      = layout;
    this.bodies      = {};
    this.orbits      = {};
    this.full_orbits = {};

    this.layout.set_center(this.center);
    this.layout.set_fov_au(this.fov);
    this.update_bodies();
  }

  ship_velocity(): number {
    return this.plan.velocity;
  }

  diameter(body: string): number {
    if (body == 'ship')
      return 0;

    return this.layout.scale_body_diameter(body);
  }

  position(body: string): Point {
    let point: Point;

    switch (body) {
      case 'sun':
        point = [0, 0, 0];
        break;

      case 'ship':
        point = this.plan.coords;
        break;

      default:
        if (this.orbits[body] == undefined)
          throw new Error(`body not tracked: ${body}`);

        point = this.orbits[body][this.plan.current_turn];
        break;
    }

    return this.layout.scale_point(point);
  }

  body(body: string): Body {
    if (this.bodies[body] == undefined)
      throw new Error(`body not tracked: ${body}`);

    return this.bodies[body];
  }

  path(body: string): Point[] {
    switch (body) {
      case 'ship':
        return this.layout.scale_path(this.plan.path.map(p => p.position));

      case 'sun':
        return [this.layout.scale_point([0, 0, 0])];

      default:
        return this.layout.scale_path( this.full_orbits[body] );
    }
  }

  // TODO bodies positions are taken from orbits using current_turn. If the
  // transit is continued after the game is restarted, the position at index 0
  // in orbits won't correspond to current_turn, since orbit_by_turns starts at
  // the current game turn.
  update_bodies(): void {
    if (Object.keys(this.orbits).length == 0) {
      for (const body of system.all_bodies()) {
        this.orbits[body] = system.orbit_by_turns(body);
        this.full_orbits[body] = system.full_orbit(body);
      }
    }

    this.bodies['ship'] = {
      coords:   this.position('ship'),
      diameter: this.diameter('ship'),
    };

    this.bodies['sun'] = {
      coords:   this.position('sun'),
      diameter: this.diameter('sun'),
    }

    for (const body of system.all_bodies()) {
      this.bodies[body] = {
        coords:   this.position(body),
        diameter: this.diameter(body),
      }
    }
  }

  turn(): void {
    this.plan.turn();
    window.game.player.ship.burn(this.plan.accel);
    window.game.turn(1, true);
    this.update_bodies();
  }

  /**
   * Returns the ideal centerpoint of the view as a point in meters.
   */
  get center(): Point {
    let center;

    const dest_central = system.central(this.plan.dest);
    const orig_central = system.central(this.plan.origin);
    const bodies = [];

    // Moon to moon in same system
    if (dest_central == orig_central && dest_central != 'sun') {
      bodies.push(system.position(dest_central));
      bodies.push(this.plan.flip_point);
      bodies.push(this.plan.start);
    }
    // Planet to its own moon
    else if (window.game.locus == dest_central) {
      bodies.push(system.position(this.plan.origin));
      bodies.push(this.plan.flip_point);
      bodies.push(this.plan.start);
    }
    // Moon to it's host planet
    else if (this.plan.dest == orig_central) {
      bodies.push(system.position(this.plan.dest));
      bodies.push(this.plan.flip_point);
      bodies.push(this.plan.start);
    }
    // Cross system path
    else {
      bodies.push(system.position(this.plan.dest));
      bodies.push(system.position(this.plan.origin));
      bodies.push(this.plan.coords);
    }

    bodies.push(this.plan.end);

    return Physics.centroid(...bodies);
  }

  get fov(): number {
    const points = [];

    const dest_central = system.central(this.plan.dest);
    const orig_central = system.central(this.plan.origin);

    // Moon to moon in same system
    if (dest_central == orig_central && dest_central != 'sun') {
      points.push(this.plan.start);
      points.push(system.position(dest_central));
    }
    // Planet to its own moon
    else if (this.plan.origin == dest_central) {
      points.push(this.plan.start);
      for (const body of system.bodies()) {
        if (system.central(body) == dest_central) {
          points.push(system.position(body));
        }
      }
    }
    // Moon to it's host planet
    else if (this.plan.dest == orig_central) {
      points.push(this.plan.start);
      for (const body of system.bodies()) {
        if (system.central(body) == orig_central) {
          points.push(system.position(body));
        }
      }
    }
    // Cross system path
    else {
      points.push(Physics.centroid(this.plan.start, this.plan.coords));
    }

    points.push(this.plan.end);

    const max = Math.max(...points.map(p => Physics.distance(p, this.center)));
    return max / Physics.AU * 1.2;
  }
}

export = Transit;
