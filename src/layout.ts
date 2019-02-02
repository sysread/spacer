import Physics from './physics';
import system from 'system';
import { Point } from './vector';
import * as util from './util';
import * as t from './common';

class Layout {
  static SCALE_DEFAULT_AU = 2;
  static SCALE_MIN_AU     = 0.00001; // 1/2 true value which is per quadrant
  static SCALE_MAX_AU     = 35;      // 1/2 true value which is per quadrant

  id:         string;
  on_scale?:  Function;
  on_pan?:    Function;
  on_resize?: Function;

  fov_au:     number; // *radius* of field of view in meters

  width_px:   number;
  height_px:  number;

  init_x:     number;
  init_y:     number;

  offset_x:   number;
  offset_y:   number;

  init_set:   boolean=false;

  _zero_x?:   number;
  _zero_y?:   number;
  _elt?:      HTMLElement;

  constructor(id: string, on_scale?: Function, on_pan?: Function, on_resize?: Function) {
    this.id        = id;
    this.on_scale  = on_scale;
    this.on_pan    = on_pan;
    this.on_resize = on_resize;
    this.fov_au    = Layout.SCALE_DEFAULT_AU;
    this.width_px  = 0;
    this.height_px = 0;
    this.init_x    = 0;
    this.init_y    = 0;
    this.offset_x  = 0;
    this.offset_y  = 0;
    this.init_set  = false;
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
      const elt = document.getElementById(this.id)

      if (elt != null) {
        this._elt = elt;
      }
    }

    return this._elt;
  }

  get px_per_meter() {
    return this.scale_px / (this.fov_au * Physics.AU);
  }

  get center(): Point {
    return [this.offset_x, this.offset_y, 0];
  }

  set_fov_au(au: number) {
    let new_fov;
    if (au === undefined) {
      new_fov = Layout.SCALE_DEFAULT_AU;
    } else {
      new_fov = util.R( util.clamp(au, Layout.SCALE_MIN_AU, Layout.SCALE_MAX_AU), 6 );
    }

    const old_fov  = this.fov_au;
    this.fov_au    = new_fov;
    this.offset_x -= ((this.offset_x * new_fov) - (this.offset_x * old_fov)) / new_fov;
    this.offset_y -= ((this.offset_y * new_fov) - (this.offset_y * old_fov)) / new_fov;
    this.init_x    = this.offset_x;
    this.init_y    = this.offset_y;

    if (this.on_scale) {
      this.on_scale();
    }
  }

  set_center(point: Point) {
    const [x, y]  = this.scale_point(point, true);
    this.offset_x = this.zero_x - x;
    this.offset_y = this.zero_y - y;
    this.init_x   = this.offset_x;
    this.init_y   = this.offset_y;

    if (this.on_pan) {
      this.on_pan();
    }
  }

  clear_zero() {
    this._zero_x = undefined;
    this._zero_y = undefined;
  }

  scale(n: number): number {
    const fov_m = this.fov_au * Physics.AU;
    return n / fov_m * this.zero;
  }

  scale_x(n: number, no_offset: boolean=false): number {
    const n_scaled = this.zero_x + this.scale(n);
    return no_offset ? n_scaled : n_scaled + this.offset_x;
  }

  scale_y(n: number, no_offset: boolean=false): number {
    const n_scaled = this.zero_y - this.scale(n);
    return no_offset ? n_scaled : n_scaled + this.offset_y;
  }

  scale_point(p: Point, no_offset: boolean=false): Point {
    return [
      this.scale_x(p[0], no_offset),
      this.scale_y(p[1], no_offset),
      0,
    ];
  }

  scale_path(points: Point[], max?: number) {
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

  scale_length(meters: number): number {
    return meters * this.px_per_meter;
  }

  scale_body_diameter(body: string) {
    const diameter = system.body(body).radius * 2;
    const is_tiny  = diameter < 3200000;

    const adjust = body == 'sun' ? 1
                 : body.match(/jupiter|saturn|uranus|neptune|trojans/) ? 10
                 : is_tiny ? 200
                 : 80;

    const factor = this.fov_au + Math.log2(Math.max(1, this.fov_au));
    const amount = util.clamp(adjust * factor, 1);
    const min    = is_tiny ? 1 : 3;
    const result = util.clamp(diameter * this.px_per_meter * amount, min, this.scale_px);
    return result;
  }

  is_within_fov(target: Point): boolean {
    const [x, y] = this.scale_point(target);

    if (x < 0 || x > this.width_px)
      return false;

    if (y < 0 || y > this.height_px)
      return false;

    return true;
  }

  update_width() {
    if (!this.elt) {
      return 0;
    }

    const status_bar_height = Math.max(0, screen.height - window.innerHeight);

    const height
      = window.innerHeight
      + window.scrollY
      - status_bar_height
      - this.elt.getBoundingClientRect().top
      - ($('#spacer-status').height() || 0)
      - ($('#spacer-navbar').height() || 0)
      - ($('#navcomp-toolbar').height() || 0);

    const width   = $(this.elt).parent().width() || 0;
    const changed = width != this.width_px || height != this.height_px;

    this.clear_zero();
    this.width_px  = width;
    this.height_px = height;

    console.debug('layout: width updated to', this.width_px, 'x', this.height_px);

    if (this.init_set && changed && this.on_resize) {
      this.on_resize();
    }

    this.init_set = true;
  }
}

export = Layout;
