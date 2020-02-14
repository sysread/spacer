import data from './data';
import Physics from './physics';
import { NavComp, Trajectory, Acceleration, Body, calculate_trajectory } from './navcomp';
import { Point, length } from './vector';
import * as util from './util';
import * as t from './common';
import * as FastMath from './fastmath';

declare var window: {
  game: {
    date: Date;
    strdate: (date: Date) => string;
  };
}

export interface NewTransitPlanArgs {
  turns:  number;
  acc:    Acceleration;
  fuel:   number;
  start:  Point;
  end:    Point;
  origin: t.body;
  dest:   t.body;
  dist:   number;
  initial: Body;
  final:   Body;
}

export interface SavedTransitPlan extends NewTransitPlanArgs {
  current_turn: number;
  _course: Trajectory;
}

type TransitPlanArgs = SavedTransitPlan | NewTransitPlanArgs;

function isNewTransitPlan(opt: TransitPlanArgs): opt is NewTransitPlanArgs {
  return (<SavedTransitPlan>opt).current_turn == undefined;
}

function isSavedTransitPlan(opt: TransitPlanArgs): opt is SavedTransitPlan {
  return (<SavedTransitPlan>opt).current_turn != undefined;
}

export class TransitPlan {
  turns:        number;
  fuel:         number;
  start:        Point;
  end:          Point;
  origin:       t.body;
  dest:         t.body;
  dist:         number;
  acc:          Acceleration;
  _course?:     Trajectory;
  current_turn: number;

  initial: Body;
  final:   Body;

  constructor(opt: TransitPlanArgs) {
    this.turns        = opt.turns;  // total turns to complete trip
    this.fuel         = opt.fuel;   // fuel used during trip
    this.start        = opt.start;  // start point of transit
    this.end          = opt.end;    // final point of transit
    this.origin       = opt.origin; // origin body name
    this.dest         = opt.dest;   // destination body name
    this.dist         = opt.dist;   // trip distance in meters
    this.acc          = opt.acc;
    this.current_turn = 0;

    this.initial = opt.initial;
    this.final   = opt.final;

    if (isSavedTransitPlan(opt)) {
      this.current_turn = opt.current_turn;
      this._course = opt._course;
    }
  }

  get maxVelocity()      { return this.course.max_velocity }
  get path()             { return this.course.path }
  get accel()            { return this.acc.length } // m/s/s
  get accel_g()          { return this.accel / Physics.G }
  get hours()            { return this.turns * data.hours_per_turn } // hours
  get left()             { return this.turns - this.current_turn }
  get currentTurn()      { return this.current_turn }
  get turnpct()          { return 100 / this.turns } // percent of trip per turn
  get is_started()       { return this.current_turn > 0 }
  get is_complete()      { return this.left <= 0 }
  get pct_complete()     { return 100 - (this.left * this.turnpct) }
  get segment()          { return Physics.distance(this.start, this.end) }
  get segment_au()       { return this.segment / Physics.AU }
  get flip_point()       { return this.path[FastMath.floor(this.turns / 2)].position }
  get coords()           { return this.path[this.current_turn].position }
  get velocity()         { return this.path[this.current_turn].velocity }
  get au()               { return this.dist / Physics.AU }
  get km()               { return this.dist / 1000 }
  get initial_velocity() { return this.path[0].vector }
  get final_velocity()   { return this.path[this.turns - 1].vector }
  get current_velocity() { return this.path[this.current_turn].vector }

  get course() {
    if (this._course == undefined) {
      this._course = calculate_trajectory(this.turns, this.initial, this.final);
    }

    return this._course;
  }

  get days_left() {
    return FastMath.ceil(this.left * data.hours_per_turn / 24);
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

  get str_arrival_date() {
    const date = new Date();
    const left = this.days_left * 24 * 60 * 60 * 1000; // ms
    date.setTime(window.game.date.getTime() + left);
    const strdate = window.game.strdate(date);
    return `${this.str_arrival} [ ${strdate} ]`;
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
