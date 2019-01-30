import data  from './data';
import Physics from './physics';
import { NavComp, Course, SavedCourse } from './navcomp';
import { Point, length } from './vector';
import * as util from './util';
import * as t from './common';

export interface NewTransitPlanArgs {
  course: Course;
  fuel:   number;
  start:  Point;
  end:    Point;
  origin: t.body;
  dest:   t.body;
  dist:   number;
}

export interface SavedTransitPlan extends NewTransitPlanArgs {
  current_turn: number;
}

type TransitPlanArgs = SavedTransitPlan | NewTransitPlanArgs;

function isNewTransitPlan(opt: TransitPlanArgs): opt is NewTransitPlanArgs {
  return (<NewTransitPlanArgs>opt).course != undefined;
}

function isSavedTransitPlan(opt: TransitPlanArgs): opt is SavedTransitPlan {
  return (<SavedTransitPlan>opt).current_turn != undefined;
}

export class TransitPlan {
  course:       Course;
  fuel:         number;
  start:        Point;
  end:          Point;
  origin:       t.body;
  dest:         t.body;
  dist:         number;
  current_turn: number;

  constructor(opt: TransitPlanArgs) {
    this.fuel   = opt.fuel;   // fuel used during trip
    this.start  = opt.start;  // start point of transit
    this.end    = opt.end;    // final point of transit
    this.origin = opt.origin; // origin body name
    this.dest   = opt.dest;   // destination body name
    this.dist   = opt.dist;   // trip distance in meters

    if (isSavedTransitPlan(opt)) {
      this.course = Course.import(opt.course);
      this.current_turn = opt.current_turn;
    }
    else if (isNewTransitPlan(opt)) {
      this.course = opt.course;
      this.current_turn = 0;
    }
    else {
      throw new Error('invalid transit plan args');
    }
  }

  get turns()        { return this.course.turns } // turns
  get accel()        { return length(this.course.accel) } // m/s/s
  get accel_g()      { return this.accel / Physics.G }
  get path()         { return this.course.path() }
  get maxVelocity()  { return this.course.maxVelocity() }
  get hours()        { return this.turns * data.hours_per_turn } // hours
  get left()         { return this.turns - this.current_turn }
  get currentTurn()  { return this.current_turn }
  get turnpct()      { return 100 / this.turns } // percent of trip per turn
  get is_started()   { return this.current_turn > 0 }
  get is_complete()  { return this.left <= 0 }
  get pct_complete() { return 100 - (this.left * this.turnpct) }
  get segment()      { return Physics.distance(this.start, this.end) }
  get segment_au()   { return this.segment / Physics.AU }
  get flip_point()   { return this.path[Math.floor(this.turns / 2)].position }
  get coords()       { return this.path[this.current_turn].position }
  get velocity()     { return this.path[this.current_turn].velocity }
  get au()           { return this.dist / Physics.AU }
  get km()           { return this.dist / 1000 }

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

  turn() {
    if (!this.is_complete) {
      ++this.current_turn;
    }
  }

  distanceRemaining() {
    return Physics.distance(this.coords, this.end);
  }

  auRemaining() {
    return this.distanceRemaining() / Physics.AU;
  }
}
