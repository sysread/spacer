import { SpaceThing, isLaGrangePoint, isCelestialBody } from './CelestialBody';
import * as V from '../vector';


export class Frame {
  constructor(
    public position: V.Point,
    public central:  SpaceThing | undefined,
    public time:     number,
  ) {}

  get relative(): V.Point {
    return this.position;
  }

  get absolute(): V.Point {
    let ref: V.Point = [0, 0, 0];

    if (this.central != undefined)
      ref = this.central.getPositionAtTime(this.time).position;

    return V.add(this.position, ref);
  }

  relativeToTime(time: number): Frame {
    return new Frame(this.position, this.central, time);
  }
}


export class Path {
  constructor(
    public frames: Frame[],
  ) {}

  get relative(): V.Point[]  { return this.frames.map(p => p.position) }
  get absolute(): V.Point[]  { return this.frames.map(p => p.absolute) }

  relativeToTime(time: number): Path {
    return new Path(this.frames.map(f => f.relativeToTime(time)));
  }
}


export class Orbit {
  body:        SpaceThing; // orbiting body
  start:       number;     // ms timestamp (since epoch) to calculate orbit from
  period:      number;     // time for a complete orbit
  msPerRadian: number;
  _frames?:    Frame[];

  constructor(body: SpaceThing, start: number) {
    this.body        = body;
    this.start       = start;
    this.period      = this.body.period(this.start);
    this.msPerRadian = (this.period * 1000) / 360;
  }

  get central() {
    if (isCelestialBody(this.body)) {
      return this.body.central;
    }

    return;
  }

  get frames(): Frame[] {
    if (!this._frames) {
      const central = this.central;
      const path = [];
      let date = this.start;

      for (let i = 0; i < 359; ++i) {
        path.push(this.body.getPositionAtTime(date));
        date += this.msPerRadian;
      }

      path.push(this.body.getPositionAtTime(this.start));

      this._frames = path;
    }

    return this._frames;
  }

  get path(): Path { return new Path(this.frames) }
  get relative(): V.Point[] { return this.path.relative }
  get absolute(): V.Point[] { return this.path.absolute }

  relativeToTime(time: number): Path {
    return new Path(this.frames.map(f => f.relativeToTime(time)));
  }
}
