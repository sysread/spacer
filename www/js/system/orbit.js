var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
        Frame.prototype.absolute = function () {
            return __awaiter(this, void 0, void 0, function () {
                var ref;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ref = [0, 0, 0];
                            if (!(this.central != undefined)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.central.getPositionAtTimeSoon(this.time)];
                        case 1:
                            ref = (_a.sent()).position;
                            _a.label = 2;
                        case 2: return [2 /*return*/, V.add(this.position, ref)];
                    }
                });
            });
        };
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
        Path.prototype.absolute = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.frames.map(function (p) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, p.absolute];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        }); }); })];
                });
            });
        };
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
        Orbit.prototype.frames = function () {
            return __awaiter(this, void 0, void 0, function () {
                var central, path, date, i, _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!!this._frames) return [3 /*break*/, 5];
                            central = this.central;
                            path = [];
                            date = this.start;
                            i = 0;
                            _c.label = 1;
                        case 1:
                            if (!(i < 360)) return [3 /*break*/, 4];
                            _b = (_a = path).push;
                            return [4 /*yield*/, this.body.getPositionAtTimeSoon(date)];
                        case 2:
                            _b.apply(_a, [_c.sent()]);
                            date += this.msPerRadian;
                            _c.label = 3;
                        case 3:
                            ++i;
                            return [3 /*break*/, 1];
                        case 4:
                            this._frames = path;
                            _c.label = 5;
                        case 5: return [2 /*return*/, this._frames];
                    }
                });
            });
        };
        Orbit.prototype.path = function () {
            return __awaiter(this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = Path.bind;
                        return [4 /*yield*/, this.frames()];
                    case 1: return [2 /*return*/, new (_a.apply(Path, [void 0, _b.sent()]))()];
                }
            }); });
        };
        Orbit.prototype.relative = function () {
            return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.path()];
                    case 1: return [2 /*return*/, (_a.sent()).relative];
                }
            }); });
        };
        Orbit.prototype.absolute = function () {
            return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.path()];
                    case 1: return [4 /*yield*/, (_a.sent()).absolute()];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            }); });
        };
        Orbit.prototype.relativeToTime = function (time) {
            return __awaiter(this, void 0, void 0, function () {
                var frames;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.frames()];
                        case 1:
                            frames = _a.sent();
                            return [2 /*return*/, new Path(frames.map(function (f) { return f.relativeToTime(time); }))];
                    }
                });
            });
        };
        return Orbit;
    }());
    exports.Orbit = Orbit;
});
