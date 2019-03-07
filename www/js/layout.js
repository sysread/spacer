var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./physics", "system", "./util"], function (require, exports, physics_1, system_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    physics_1 = __importDefault(physics_1);
    system_1 = __importDefault(system_1);
    util = __importStar(util);
    var Layout = /** @class */ (function () {
        function Layout(id, on_scale, on_pan, on_resize) {
            this.init_set = false;
            this.id = id;
            this.on_scale = on_scale;
            this.on_pan = on_pan;
            this.on_resize = on_resize;
            this._fov_au = Layout.SCALE_DEFAULT_AU;
            this.width_px = 0;
            this.height_px = 0;
            this.init_x = 0;
            this.init_y = 0;
            this.offset_x = 0;
            this.offset_y = 0;
            this.init_set = false;
        }
        Object.defineProperty(Layout.prototype, "scale_px", {
            get: function () {
                return Math.min(this.width_px, this.height_px);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Layout.prototype, "zero_x", {
            get: function () {
                if (this._zero_x == null) {
                    this._zero_x = this.width_px / 2;
                }
                return this._zero_x;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Layout.prototype, "zero_y", {
            get: function () {
                if (this._zero_y == null) {
                    this._zero_y = this.height_px / 2;
                }
                return this._zero_y;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Layout.prototype, "zero", {
            get: function () {
                return Math.min(this.zero_x, this.zero_y);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Layout.prototype, "elt", {
            get: function () {
                if (this._elt == null) {
                    var elt = document.getElementById(this.id);
                    if (elt != null) {
                        this._elt = elt;
                    }
                }
                return this._elt;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Layout.prototype, "px_per_meter", {
            get: function () {
                return this.scale_px / (this.fov_au * physics_1.default.AU);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Layout.prototype, "center", {
            get: function () {
                return [this.offset_x, this.offset_y, 0];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Layout.prototype, "fov_au", {
            get: function () {
                return this._fov_au;
            },
            set: function (au) {
                this.set_fov_au(au);
            },
            enumerable: true,
            configurable: true
        });
        Layout.prototype.set_fov_au = function (au) {
            var new_fov;
            if (au === undefined) {
                new_fov = Layout.SCALE_DEFAULT_AU;
            }
            else {
                new_fov = util.R(util.clamp(au, Layout.SCALE_MIN_AU, Layout.SCALE_MAX_AU), 6);
            }
            var old_fov = this.fov_au;
            this._fov_au = new_fov;
            this.offset_x -= ((this.offset_x * new_fov) - (this.offset_x * old_fov)) / new_fov;
            this.offset_y -= ((this.offset_y * new_fov) - (this.offset_y * old_fov)) / new_fov;
            this.init_x = this.offset_x;
            this.init_y = this.offset_y;
            if (this.on_scale) {
                this.on_scale();
            }
        };
        Layout.prototype.set_center = function (point) {
            var _a = __read(this.scale_point(point, true), 2), x = _a[0], y = _a[1];
            this.offset_x = this.zero_x - x;
            this.offset_y = this.zero_y - y;
            this.init_x = this.offset_x;
            this.init_y = this.offset_y;
            if (this.on_pan) {
                this.on_pan();
            }
        };
        Layout.prototype.clear_zero = function () {
            this._zero_x = undefined;
            this._zero_y = undefined;
        };
        Layout.prototype.scale = function (n) {
            var fov_m = this.fov_au * physics_1.default.AU;
            return n / fov_m * this.zero;
        };
        Layout.prototype.scale_x = function (n, no_offset) {
            if (no_offset === void 0) { no_offset = false; }
            var n_scaled = this.zero_x + this.scale(n);
            return no_offset ? n_scaled : n_scaled + this.offset_x;
        };
        Layout.prototype.scale_y = function (n, no_offset) {
            if (no_offset === void 0) { no_offset = false; }
            var n_scaled = this.zero_y - this.scale(n);
            return no_offset ? n_scaled : n_scaled + this.offset_y;
        };
        Layout.prototype.scale_point = function (p, no_offset) {
            if (no_offset === void 0) { no_offset = false; }
            return [
                this.scale_x(p[0], no_offset),
                this.scale_y(p[1], no_offset),
                0,
            ];
        };
        Layout.prototype.scale_path = function (points, max) {
            if (max === undefined) {
                max = points.length;
            }
            var path = [];
            var each = 1;
            while (points.length / each > max) {
                each += 1;
            }
            var pos;
            for (var i = 0; i < points.length; ++i) {
                pos = points[i];
                if (i % each == 0) {
                    path.push(this.scale_point(pos));
                }
            }
            if (pos && path.length % each != 0) {
                path.push(this.scale_point(pos));
            }
            return path;
        };
        Layout.prototype.scale_length = function (meters) {
            return meters * this.px_per_meter;
        };
        Layout.prototype.scale_body_diameter = function (body) {
            var diameter = system_1.default.body(body).radius * 2;
            var is_tiny = diameter < 3200000;
            var is_huge = diameter > 10000000;
            var adjust = body == 'sun' ? 1
                : is_huge ? 10
                    : is_tiny ? 200
                        : 80;
            var factor = this.fov_au + Math.log2(Math.max(1, this.fov_au));
            var amount = util.clamp(adjust * factor, 1);
            var min = is_tiny ? 1 : 3;
            var result = util.clamp(diameter * this.px_per_meter * amount, min, this.scale_px);
            return result;
        };
        Layout.prototype.is_visible = function (pos) {
            var p = this.scale_point(pos);
            if (p[0] < 0 || p[1] < 0)
                return false;
            if (p[0] > this.width_px || p[1] > this.height_px)
                return false;
            return true;
        };
        Layout.prototype.is_within_fov = function (target) {
            var _a = __read(this.scale_point(target), 2), x = _a[0], y = _a[1];
            if (x < 0 || x > this.width_px)
                return false;
            if (y < 0 || y > this.height_px)
                return false;
            return true;
        };
        Layout.prototype.update_width = function () {
            if (!this.elt)
                return 0;
            var height = window.innerHeight
                + window.scrollY
                - this.elt.getBoundingClientRect().top
                - ($('#spacer-status').height() || 0)
                - ($('#spacer-navbar').height() || 0)
                - ($('#navcomp-toolbar').height() || 0)
                - ($('#navcomp-transit-info').outerHeight() || 0);
            /*
            const height = window.innerHeight
              - ($('#spacer-status').outerHeight() || 0)
              - ($('#spacer-navbar').outerHeight() || 0)
              - ($('#navcomp-toolbar').outerHeight() || 0)
            */
            var width = $(this.elt).parent().width() || 0;
            var changed = width != this.width_px || height != this.height_px;
            this.clear_zero();
            this.width_px = width;
            this.height_px = height;
            console.debug('layout: width updated to', this.width_px, 'x', this.height_px);
            if (this.init_set && changed && this.on_resize) {
                this.on_resize();
            }
            this.init_set = true;
        };
        Layout.SCALE_DEFAULT_AU = 2;
        Layout.SCALE_MIN_AU = 0.00001; // 1/2 true value which is per quadrant
        Layout.SCALE_MAX_AU = 35; // 1/2 true value which is per quadrant
        return Layout;
    }());
    exports.Layout = Layout;
});
