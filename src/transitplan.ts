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
  turns:         number;
  accel:         Vector;
  path():        PathSegment[];
  maxVelocity(): number;
}

export interface NewTransitPlanArgs {
  course:      Course;

  fuel:        number;
  start:       PointArray;
  end:         PointArray;
  origin:      t.body;
  dest:        t.body;
  dist:        number;
}

export interface SavedTransitPlan {
  fuel:        number;
  start:       PointArray;
  end:         PointArray;
  origin:      t.body;
  dest:        t.body;
  dist:        number;

  turns:       number;
  accel:       number;
  accel_g:     number;
  maxVelocity: number;
  path:        PathSegment[];

  left:        number;
  coords:      PointArray;
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
  fuel:        number;
  start:       PointArray;
  end:         PointArray;
  origin:      t.body;
  dest:        t.body;
  dist:        number;

  turns:       number;
  accel:       number;
  accel_g:     number;
  maxVelocity: number;
  path:        PathSegment[];

  left:        number;     // remaining turns in transit; updated by turn()
  coords:      PointArray; // current position; updated by turn()
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
      this.turns       = opt.turns;
      this.accel       = opt.accel;
      this.maxVelocity = opt.maxVelocity;
      this.path        = opt.path;
      this.left        = opt.left;
      this.coords      = opt.coords;
      this.velocity    = opt.velocity;
      this.au          = opt.au;
      this.km          = opt.dist;

    }
    else if (isNewTransitPlan(opt)) {
      this.turns       = opt.course.turns;
      this.accel       = opt.course.accel.length;
      this.maxVelocity = opt.course.maxVelocity();
      this.path        = opt.course.path();
      this.left        = opt.course.turns;
      this.coords      = this.start;
      this.velocity    = 0;
      this.au          = this.dist / Physics.AU;
      this.km          = this.dist / 1000;
    }
    else {
      throw new Error('invalid transit plan args');
    }

    this.accel_g     = this.accel / Physics.G;
  }

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
