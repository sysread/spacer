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
    var Frame = /** @class */ (function () {
        function Frame(position, central, time) {
            this.position = position;
            this.central = central;
            this.time = time;
        }
        Object.defineProperty(Frame.prototype, "relative", {
            get: function () {
                return this.position;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Frame.prototype, "absolute", {
            get: function () {
                var ref = [0, 0, 0];
                if (this.central != undefined)
                    ref = this.central.getPositionAtTime(this.time).position;
                return V.add(this.position, ref);
            },
            enumerable: true,
            configurable: true
        });
        Frame.prototype.relativeToTime = function (time) {
            return new Frame(this.position, this.central, time);
        };
        return Frame;
    }());
    exports.Frame = Frame;
    var Path = /** @class */ (function () {
        function Path(frames) {
            this.frames = frames;
        }
        Object.defineProperty(Path.prototype, "relative", {
            get: function () { return this.frames.map(function (p) { return p.position; }); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Path.prototype, "absolute", {
            get: function () { return this.frames.map(function (p) { return p.absolute; }); },
            enumerable: true,
            configurable: true
        });
        Path.prototype.relativeToTime = function (time) {
            return new Path(this.frames.map(function (f) { return f.relativeToTime(time); }));
        };
        return Path;
    }());
    exports.Path = Path;
    var Orbit = /** @class */ (function () {
        function Orbit(body, start) {
            this.body = body;
            this.start = start;
            this.period = this.body.period(this.start);
            this.msPerRadian = (this.period * 1000) / 360;
        }
        Object.defineProperty(Orbit.prototype, "central", {
            get: function () {
                if (CelestialBody_1.isCelestialBody(this.body)) {
                    return this.body.central;
                }
                return;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Orbit.prototype, "frames", {
            get: function () {
                if (!this._frames) {
                    var central = this.central;
                    var path = [];
                    var date = this.start;
                    for (var i = 0; i < 360; ++i) {
                        path.push(this.body.getPositionAtTime(date));
                        date += this.msPerRadian;
                    }
                    this._frames = path;
                }
                return this._frames;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Orbit.prototype, "path", {
            get: function () { return new Path(this.frames); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Orbit.prototype, "relative", {
            get: function () { return this.path.relative; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Orbit.prototype, "absolute", {
            get: function () { return this.path.absolute; },
            enumerable: true,
            configurable: true
        });
        Orbit.prototype.relativeToTime = function (time) {
            return new Path(this.frames.map(function (f) { return f.relativeToTime(time); }));
        };
        return Orbit;
    }());
    exports.Orbit = Orbit;
});
