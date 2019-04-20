var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./CelestialBody", "../vector"], function (require, exports, CelestialBody_1, V) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    V = __importStar(V);
    class Frame {
        constructor(position, central, time) {
            this.position = position;
            this.central = central;
            this.time = time;
        }
        get relative() {
            return this.position;
        }
        get absolute() {
            let ref = [0, 0, 0];
            if (this.central != undefined)
                ref = this.central.getPositionAtTime(this.time).position;
            return V.add(this.position, ref);
        }
        relativeToTime(time) {
            return new Frame(this.position, this.central, time);
        }
    }
    exports.Frame = Frame;
    class Path {
        constructor(frames) {
            this.frames = frames;
        }
        get relative() { return this.frames.map(p => p.position); }
        get absolute() { return this.frames.map(p => p.absolute); }
        relativeToTime(time) {
            return new Path(this.frames.map(f => f.relativeToTime(time)));
        }
    }
    exports.Path = Path;
    class Orbit {
        constructor(body, start) {
            this.body = body;
            this.start = start;
            this.period = this.body.period(this.start);
            this.msPerRadian = (this.period * 1000) / 360;
        }
        get central() {
            if (CelestialBody_1.isCelestialBody(this.body)) {
                return this.body.central;
            }
            return;
        }
        get frames() {
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
        get path() { return new Path(this.frames); }
        get relative() { return this.path.relative; }
        get absolute() { return this.path.absolute; }
        relativeToTime(time) {
            return new Path(this.frames.map(f => f.relativeToTime(time)));
        }
    }
    exports.Orbit = Orbit;
});
