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
    class Layout {
        constructor(id, on_scale, on_pan, on_resize) {
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
        get scale_px() {
            return Math.min(this.width_px, this.height_px);
        }
        get zero_x() {
            if (this._zero_x == null) {
                this._zero_x = this.width_px / 2;
            }
            return this._zero_x;
        }
        get zero_y() {
            if (this._zero_y == null) {
                this._zero_y = this.height_px / 2;
            }
            return this._zero_y;
        }
        get zero() {
            return Math.min(this.zero_x, this.zero_y);
        }
        get elt() {
            if (this._elt == null) {
                const elt = document.getElementById(this.id);
                if (elt != null) {
                    this._elt = elt;
                }
            }
            return this._elt;
        }
        get px_per_meter() {
            return this.scale_px / (this.fov_au * physics_1.default.AU);
        }
        get center() {
            return [this.offset_x, this.offset_y, 0];
        }
        get fov_au() {
            return this._fov_au;
        }
        set fov_au(au) {
            this.set_fov_au(au);
        }
        set_fov_au(au) {
            let new_fov;
            if (au === undefined) {
                new_fov = Layout.SCALE_DEFAULT_AU;
            }
            else {
                new_fov = util.R(util.clamp(au, Layout.SCALE_MIN_AU, Layout.SCALE_MAX_AU), 6);
            }
            const old_fov = this.fov_au;
            this._fov_au = new_fov;
            this.offset_x -= ((this.offset_x * new_fov) - (this.offset_x * old_fov)) / new_fov;
            this.offset_y -= ((this.offset_y * new_fov) - (this.offset_y * old_fov)) / new_fov;
            this.init_x = this.offset_x;
            this.init_y = this.offset_y;
            if (this.on_scale) {
                this.on_scale();
            }
        }
        set_center(point) {
            const [x, y] = this.scale_point(point, true);
            this.offset_x = this.zero_x - x;
            this.offset_y = this.zero_y - y;
            this.init_x = this.offset_x;
            this.init_y = this.offset_y;
            if (this.on_pan) {
                this.on_pan();
            }
        }
        clear_zero() {
            this._zero_x = undefined;
            this._zero_y = undefined;
        }
        scale(n) {
            const fov_m = this.fov_au * physics_1.default.AU;
            return n / fov_m * this.zero;
        }
        scale_x(n, no_offset = false) {
            const n_scaled = this.zero_x + this.scale(n);
            return no_offset ? n_scaled : n_scaled + this.offset_x;
        }
        scale_y(n, no_offset = false) {
            const n_scaled = this.zero_y - this.scale(n);
            return no_offset ? n_scaled : n_scaled + this.offset_y;
        }
        scale_point(p, no_offset = false) {
            return [
                this.scale_x(p[0], no_offset),
                this.scale_y(p[1], no_offset),
                0,
            ];
        }
        scale_path(points, max) {
            if (max === undefined) {
                max = points.length;
            }
            const path = [];
            let each = 1;
            while (points.length / each > max) {
                each += 1;
            }
            let pos;
            for (let i = 0; i < points.length; ++i) {
                pos = points[i];
                if (i % each == 0) {
                    path.push(this.scale_point(pos));
                }
            }
            if (pos && path.length % each != 0) {
                path.push(this.scale_point(pos));
            }
            return path;
        }
        scale_length(meters) {
            return meters * this.px_per_meter;
        }
        scale_body_diameter(body) {
            const diameter = system_1.default.body(body).radius * 2;
            const is_tiny = diameter < 3200000;
            const is_huge = diameter > 10000000;
            const adjust = body == 'sun' ? 1
                : is_huge ? 10
                    : is_tiny ? 200
                        : 80;
            const factor = this.fov_au + Math.log2(Math.max(1, this.fov_au));
            const amount = util.clamp(adjust * factor, 1);
            const min = is_tiny ? 1 : 3;
            const result = util.clamp(diameter * this.px_per_meter * amount, min, this.scale_px);
            return result;
        }
        is_visible(pos) {
            const p = this.scale_point(pos);
            if (p[0] < 0 || p[1] < 0)
                return false;
            if (p[0] > this.width_px || p[1] > this.height_px)
                return false;
            return true;
        }
        is_within_fov(target) {
            const [x, y] = this.scale_point(target);
            if (x < 0 || x > this.width_px)
                return false;
            if (y < 0 || y > this.height_px)
                return false;
            return true;
        }
        update_width() {
            if (!this.elt)
                return 0;
            const height = window.innerHeight
                + window.scrollY
                - this.elt.getBoundingClientRect().top
                - ($('#spacer-status').height() || 0)
                - ($('#spacer-navbar').height() || 0)
                - ($('#navcomp-toolbar').height() || 0)
                - ($('#navcomp-transit-info').outerHeight() || 0);
            const width = $(this.elt).parent().width() || 0;
            const changed = width != this.width_px || height != this.height_px;
            this.clear_zero();
            this.width_px = width;
            this.height_px = height;
            console.debug('layout: width updated to', this.width_px, 'x', this.height_px);
            if (this.init_set && changed && this.on_resize) {
                this.on_resize();
            }
            this.init_set = true;
        }
    }
    Layout.SCALE_DEFAULT_AU = 2;
    Layout.SCALE_MIN_AU = 0.00001; // 1/2 true value which is per quadrant
    Layout.SCALE_MAX_AU = 35; // 1/2 true value which is per quadrant
    exports.Layout = Layout;
});
