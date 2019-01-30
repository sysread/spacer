import Layout from './layout';
import system from './system';

import { Point } from './vector';
import { TransitPlan } from './transitplan';
import { Person } from './person';

import * as t from './common';


declare var window: {
  game: {
    player: Person;
    turn:   (turns?: number, nosave?: boolean) => void;
  };
};


interface Body {
  coords:   Point;
  diameter: number;
}


class Transit {
  plan:   TransitPlan;
  layout: Layout;
  orbits: { [key: string]: Point[] };
  bodies: { [key: string]: Body };

  constructor(plan: TransitPlan, layout: Layout) {
    this.plan   = plan;
    this.layout = layout;
    this.bodies = {};
    this.orbits = {};

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

  // TODO bodies positions are taken from orbits using current_turn. If the
  // transit is continued after the game is restarted, the position at index 0
  // in orbits won't correspond to current_turn, since orbit_by_turns starts at
  // the current game turn.
  update_bodies(): void {
    if (Object.keys(this.orbits).length == 0) {
      for (const body of system.all_bodies()) {
        this.orbits[body] = system.orbit_by_turns(body);
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
}

export = Transit;
