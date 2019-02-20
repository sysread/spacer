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

  async absolute() {
    let ref: V.Point = [0, 0, 0];

    if (this.central != undefined)
      ref = (await this.central.getPositionAtTimeSoon(this.time)).position;

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

  get relative() { return this.frames.map(p => p.position) }

  async absolute() {
    return this.frames.map(async (p) => await p.absolute);
  }

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

  async frames() {
    if (!this._frames) {
      const central = this.central;
      const path = [];
      let date = this.start;

      for (let i = 0; i < 360; ++i) {
        path.push(await this.body.getPositionAtTimeSoon(date));
        date += this.msPerRadian;
      }

      this._frames = path;
    }

    return this._frames;
  }

  async path() { return new Path(await this.frames()) }
  async relative() { return (await this.path()).relative }
  async absolute() { return await (await this.path()).absolute() }

  async relativeToTime(time: number) {
    const frames = await this.frames()
    return new Path(frames.map(f => f.relativeToTime(time)));
  }
}
