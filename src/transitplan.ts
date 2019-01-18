import data  from './data';
import Physics from './physics';
import { NavComp, Course, SavedCourse } from './navcomp';
import { Point } from './vector';
import * as util from './util';
import * as t from './common';

export interface NewTransitPlanArgs {
  course:      Course;
  fuel:        number;
  start:       Point;
  end:         Point;
  origin:      t.body;
  dest:        t.body;
  dist:        number;
}

export interface SavedTransitPlan {
  course:      SavedCourse;

  fuel:        number;
  start:       Point;
  end:         Point;
  origin:      t.body;
  dest:        t.body;
  dist:        number;

  left:        number;
  coords:      Point;
  velocity:    number;
  au:          number;
  km:          number;
}

type TransitPlanArgs = SavedTransitPlan | NewTransitPlanArgs;

function isNewTransitPlan(opt: TransitPlanArgs): opt is NewTransitPlanArgs {
  return (<NewTransitPlanArgs>opt).course != undefined;
}

function isSavedTransitPlan(opt: TransitPlanArgs): opt is SavedTransitPlan {
  return (<SavedTransitPlan>opt).left != undefined;
}

export class TransitPlan {
  course:      Course;

  fuel:        number;
  start:       Point;
  end:         Point;
  origin:      t.body;
  dest:        t.body;
  dist:        number;

  left:        number;     // remaining turns in transit; updated by turn()
  coords:      Point; // current position; updated by turn()
  velocity:    number;     // current ship velocity; updated by turn()
  au:          number;
  km:          number;

  constructor(opt: TransitPlanArgs) {
    this.fuel        = opt.fuel;   // fuel used during trip
    this.start       = opt.start;  // start point of transit
    this.end         = opt.end;    // final point of transit
    this.origin      = opt.origin; // origin body name
    this.dest        = opt.dest;   // destination body name
    this.dist        = opt.dist;   // trip distance in meters

    if (isSavedTransitPlan(opt)) {
      this.course      = Course.import(opt.course);
      this.left        = opt.left;
      this.coords      = opt.coords;
      this.velocity    = opt.velocity;
      this.au          = opt.au;
      this.km          = opt.dist;
    }
    else if (isNewTransitPlan(opt)) {
      this.course      = opt.course;
      this.left        = opt.course.turns;
      this.coords      = this.start;
      this.velocity    = 0;
      this.au          = this.dist / Physics.AU;
      this.km          = this.dist / 1000;
    }
    else {
      throw new Error('invalid transit plan args');
    }
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
