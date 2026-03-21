/**
 * transitplan - a planned or in-progress transit between two bodies.
 *
 * A TransitPlan captures everything needed to execute and track a transit:
 * the origin/destination bodies, the computed trajectory, fuel budget, and
 * progress (current_turn). It is created by NavComp and stored on game while
 * the player is in transit.
 *
 * The trajectory (course) is lazy: calculate_trajectory is called once on
 * first access, avoiding the expense of computing all path segments up front.
 * The _course is persisted in the save state so transit resumes correctly
 * across sessions.
 *
 * Two construction modes:
 *   NewTransitPlanArgs  - fresh plan; current_turn starts at 0
 *   SavedTransitPlan    - restored from localStorage; current_turn and _course
 *                         are loaded from saved state
 *
 * Key properties:
 *   turns         - total turns to complete the transit
 *   current_turn  - turns elapsed so far (incremented by turn())
 *   left          - turns remaining
 *   coords        - ship's current 3D position (from path[current_turn])
 *   segment       - straight-line distance from start to end (meters)
 *   flip_point    - position at the halfway point (deceleration begins here)
 *   accel         - acceleration magnitude in m/s²
 */

import data from './data';
import Physics from './physics';
import { Trajectory, Acceleration, Body, calculate_trajectory } from './navcomp';
import { Point } from './vector';
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
  turns:   number;
  acc:     Acceleration;
  fuel:    number;
  start:   Point;
  end:     Point;
  origin:  t.body;
  dest:    t.body;
  dist:    number;
  initial: Body;
  final:   Body;
}

export interface SavedTransitPlan extends NewTransitPlanArgs {
  current_turn: number;
  _course: Trajectory;
}

type TransitPlanArgs = SavedTransitPlan | NewTransitPlanArgs;

function isSavedTransitPlan(opt: TransitPlanArgs): opt is SavedTransitPlan {
  return (<SavedTransitPlan>opt).current_turn != undefined;
}

export class TransitPlan {
  turns:        number;   // total turns to complete the transit
  fuel:         number;   // total fuel consumed during transit
  start:        Point;    // starting position (meters, 3D)
  end:          Point;    // ending position (meters, 3D)
  origin:       t.body;
  dest:         t.body;
  dist:         number;   // straight-line trip distance (meters)
  acc:          Acceleration;
  _course?:     Trajectory;
  current_turn: number;

  initial: Body;  // origin body position and velocity at departure
  final:   Body;  // destination body position and velocity at arrival

  constructor(opt: TransitPlanArgs) {
    this.turns        = opt.turns;
    this.fuel         = opt.fuel;
    this.start        = opt.start;
    this.end          = opt.end;
    this.origin       = opt.origin;
    this.dest         = opt.dest;
    this.dist         = opt.dist;
    this.acc          = opt.acc;
    this.current_turn = 0;
    this.initial      = opt.initial;
    this.final        = opt.final;

    if (isSavedTransitPlan(opt)) {
      this.current_turn = opt.current_turn;
      this._course = opt._course;
    }
  }

  get maxVelocity()      { return this.course.max_velocity }
  get path()             { return this.course.path }
  get accel()            { return this.acc.length }             // m/s²
  get accel_g()          { return this.accel / Physics.G }      // in units of g
  get hours()            { return this.turns * data.hours_per_turn }
  get left()             { return this.turns - this.current_turn }
  get currentTurn()      { return this.current_turn }
  get turnpct()          { return 100 / this.turns }            // % of trip per turn
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

  /** Lazy trajectory: computed once on first access, then cached. */
  get course() {
    if (this._course == undefined) {
      this._course = calculate_trajectory(this.turns, this.initial, this.final);
    }

    return this._course;
  }

  get days_left() {
    return FastMath.ceil(this.left * data.hours_per_turn / 24);
  }

  /** Returns [total_days_rounded, remaining_hours] for display. */
  get days_hours() {
    const d = this.hours / 24;
    const h = this.hours % 24;
    return [util.R(d), h];
  }

  /** Human-readable arrival time string: "N days, H hours". */
  get str_arrival() {
    const [d, h] = this.days_hours;
    return `${d} days, ${h} hours`;
  }

  /** Human-readable arrival string including the calendar date. */
  get str_arrival_date() {
    const date = new Date();
    const left = this.days_left * 24 * 60 * 60 * 1000; // ms
    date.setTime(window.game.date.getTime() + left);
    const strdate = window.game.strdate(date);
    return `${this.str_arrival} [ ${strdate} ]`;
  }

  /** Advances the transit by one turn if not already complete. */
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
