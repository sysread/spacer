import data  from './data';
import Physics from './physics';
import { Vector, PointArray, PointObject } from './vector';
import * as util from './util';
import * as t from './common';

interface PathSegment {
  position: PointArray;
  velocity: number;
}

interface Course {
  turns: number;
  accel: Vector;
  path(): PathSegment[];
  maxVelocity(): number;
}

interface TransitPlanArgs {
  fuel:   number;
  start:  PointArray;
  end:    PointArray;
  origin: t.body;
  dest:   t.body;
  dist:   number;
  course: Course;
}

class TransitPlan {
  fuel:     number;
  start:    PointArray;
  end:      PointArray;
  origin:   t.body;
  dest:     t.body;
  dist:     number;
  course:   any;

  left:     number;
  coords:   PointArray;
  velocity: number;
  au:       number;
  km:       number;

  constructor(opt: TransitPlanArgs) {
    this.fuel     = opt.fuel;           // fuel used during trip
    this.start    = opt.start;          // start point of transit
    this.end      = opt.end;            // final point of transit
    this.origin   = opt.origin;         // origin body name
    this.dest     = opt.dest;           // destination body name
    this.dist     = opt.dist;           // trip distance in meters
    this.course   = opt.course;         // NavComp.Course object

    this.left     = this.course.turns;  // remaining turns in transit; updated by turn()
    this.coords   = this.start;         // current position; updated by turn()
    this.velocity = 0;                  // current ship velocity; updated by turn()

    this.au = this.dist / Physics.AU;
    this.km = this.dist / 1000;
  }

  get turns()        { return this.course.turns                              } // turns
  get accel()        { return this.course.accel.length                       } // m/s/s
  get accel_g()      { return this.course.accel.length / Physics.G           }
  get path()         { return this.course.path()                             }
  get maxVelocity()  { return this.course.maxVelocity()                      }
  get hours()        { return this.turns * data.hours_per_turn               } // hours
  get currentTurn()  { return this.turns - this.left                         }
  get turnpct()      { return 100 / this.turns                               } // percent of trip per turn
  get is_complete()  { return this.left === 0                                }
  get pct_complete() { return 100 - (this.left * this.turnpct)               }
  get segment()      { return Physics.distance(this.start, this.end)         }
  get segment_au()   { return this.segment / Physics.AU                      }
  get flip_point()   { return this.path[Math.floor(this.turns / 2)].position }

  get days_left() {
    return Math.ceil(this.left * data.hours_per_turn / 24);
  }

  get days_hours() {
    const d = this.hours / 24;
    const h = this.hours % 24;
    return [util.R(d), h];
  }

  get str_arrival() {
    const [d, h] = this.days_hours;
    return `${d} days, ${h} hours`;
  }

  turn(turns=1) {
    if (!this.is_complete) {
      turns = Math.min(this.left, turns);
      const path = this.path[this.currentTurn + turns - 1];
      this.velocity = path.velocity;
      this.coords = path.position;
      this.left -= turns;
    }
  }

  distanceRemaining() {
    return Physics.distance(this.coords, this.end);
  }

  auRemaining() {
    return this.distanceRemaining() / Physics.AU;
  }
}

export = TransitPlan;
