/**
 * layout - 2D viewport mapping from solar system space to screen pixels.
 *
 * Translates 3D orbital positions (in meters) into 2D pixel coordinates for
 * the navcomp and transit SVG displays. Supports pan and zoom via offset and
 * fov_au (field of view in AU).
 *
 * ## Coordinate system
 *
 * Solar system coordinates are in meters, centered on the sun at [0,0,0].
 * Screen coordinates are in pixels, with [0,0] at the top-left of the element.
 * The solar system origin maps to [zero_x, zero_y] (the center of the viewport).
 *
 * Positive Y in solar system space maps to negative Y on screen (Y is flipped).
 * Pan is applied via offset_x/offset_y, which shift the origin from center.
 *
 * ## Scaling
 *
 * fov_au is the field-of-view radius in AU (half the visible width/height).
 * px_per_meter = scale_px / (fov_au * AU), where scale_px = min(width, height).
 * scale(meters) converts a distance in meters to pixels at the current zoom.
 *
 * ## Body diameter display
 *
 * scale_body_diameter applies non-linear scaling so that bodies remain visible
 * at all zoom levels. Tiny bodies (< 3200km diameter) get a 200x boost; huge
 * bodies (> 10000km) get a 10x boost. The sun uses no boost. All are clamped
 * to [min_px, scale_px].
 *
 * ## Width management
 *
 * update_width() reads the DOM element's size, accounts for other fixed UI
 * elements (status bar, navbar, toolbar), and fires on_resize if dimensions
 * changed. Depends on jQuery ($) for element sizing.
 *
 * NOTE: layout.ts imports `game` directly - this creates a circular dependency
 * risk that should be resolved when migrating to ESM.
 */

import Physics from './physics';
import system from './system';
import { Point } from './vector';
import * as util from './util';


export class Layout {
  static SCALE_DEFAULT_AU = 2;
  static SCALE_MIN_AU     = 0.00001;  // minimum fov (zoomed in); note: half the true minimum
  static SCALE_MAX_AU     = 35;       // maximum fov (zoomed out); note: half the true maximum

  id:         string;
  on_scale?:  Function;   // callback fired when fov changes
  on_pan?:    Function;   // callback fired when offset changes
  on_resize?: Function;   // callback fired when viewport dimensions change

  _fov_au:    number;     // field of view radius in AU

  width_px:   number;
  height_px:  number;

  init_x:     number;     // initial offset_x (saved on pan/scale for reset)
  init_y:     number;

  offset_x:   number;     // pan offset in pixels from viewport center
  offset_y:   number;

  init_set:   boolean=false;  // true after first update_width() call

  _zero_x?:   number;     // cached center x (width/2)
  _zero_y?:   number;     // cached center y (height/2)
  _elt?:      HTMLElement;

  constructor(id: string, on_scale?: Function, on_pan?: Function, on_resize?: Function) {
    this.id        = id;
    this.on_scale  = on_scale;
    this.on_pan    = on_pan;
    this.on_resize = on_resize;
    this._fov_au   = Layout.SCALE_DEFAULT_AU;
    this.width_px  = 0;
    this.height_px = 0;
    this.init_x    = 0;
    this.init_y    = 0;
    this.offset_x  = 0;
    this.offset_y  = 0;
    this.init_set  = false;
  }

  /** The smaller of width and height; used as the base pixel scale. */
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

  /** The smaller of zero_x and zero_y; the effective viewport radius. */
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

  /** Pixels per meter at current zoom level. */
  get px_per_meter() {
    const fov_m = this.fov_au * Physics.AU;
    if (!fov_m) return 0;
    return this.scale_px / fov_m;
  }

  /** Current viewport center as a 3D point [offset_x, offset_y, 0]. */
  get center(): Point {
    return [this.offset_x, this.offset_y, 0];
  }

  get fov_au() {
    return this._fov_au;
  }

  set fov_au(au: number) {
    this.set_fov_au(au);
  }

  /**
   * Sets the field of view, clamped to [SCALE_MIN_AU, SCALE_MAX_AU].
   * Adjusts offsets proportionally so the viewport center stays stable
   * during zoom.
   */
  set_fov_au(au: number) {
    let new_fov;
    if (au === undefined) {
      new_fov = Layout.SCALE_DEFAULT_AU;
    } else {
      new_fov = util.R( util.clamp(au, Layout.SCALE_MIN_AU, Layout.SCALE_MAX_AU), 6 );
    }

    const old_fov  = this.fov_au;
    this._fov_au    = new_fov;
    this.offset_x -= ((this.offset_x * new_fov) - (this.offset_x * old_fov)) / new_fov;
    this.offset_y -= ((this.offset_y * new_fov) - (this.offset_y * old_fov)) / new_fov;
    this.init_x    = this.offset_x;
    this.init_y    = this.offset_y;

    if (this.on_scale) {
      this.on_scale();
    }
  }

  /**
   * Pans the viewport so that the given solar system point is centered.
   * Updates offset and fires on_pan.
   */
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

  /** Invalidates the cached center coordinates. Call after viewport resize. */
  clear_zero() {
    this._zero_x = undefined;
    this._zero_y = undefined;
  }

  /** Converts a distance in meters to pixels at the current zoom level. */
  scale(n: number): number {
    const fov_m = this.fov_au * Physics.AU;
    if (!fov_m || !this.zero) return 0;
    const result = n / fov_m * this.zero;
    return isFinite(result) ? result : 0;
  }

  scale_x(n: number, no_offset: boolean=false): number {
    const n_scaled = this.zero_x + this.scale(n);
    return no_offset ? n_scaled : n_scaled + this.offset_x;
  }

  scale_y(n: number, no_offset: boolean=false): number {
    const n_scaled = this.zero_y - this.scale(n);  // Y axis flipped
    return no_offset ? n_scaled : n_scaled + this.offset_y;
  }

  scale_point(p: Point, no_offset: boolean=false): Point {
    return [
      this.scale_x(p[0], no_offset),
      this.scale_y(p[1], no_offset),
      0,
    ];
  }

  /**
   * Scales a path of 3D points to screen coordinates, decimating to at most
   * `max` points if the path is longer. This keeps SVG path strings manageable
   * when rendering full orbital tracks at high resolution.
   */
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

  /**
   * Computes a display-appropriate pixel diameter for a body.
   * Real diameters are far too small to see at system scale, so this applies
   * non-linear boosts based on body size and current zoom level. The sun uses
   * its true scaled size; moons and asteroids get a large boost to remain
   * visible when zoomed out.
   */
  /**
   * Displayed body diameter in pixels. Uses a logarithmic scale for the
   * minimum display size so bodies are always visible and proportional to
   * each other, regardless of zoom level. When zoomed in close enough that
   * the body's real physical size exceeds the log minimum, the real size
   * takes over seamlessly.
   *
   * This replaces the old boost-factor approach (200x/80x/10x) which was
   * brittle and caused moons to appear as large as their parent planets
   * at close zoom. The log scale naturally compresses the enormous diameter
   * range (Phobos 22km → Sun 1.4M km) into a manageable pixel range while
   * preserving relative proportions.
   *
   * Hierarchy: displayed = max(pixel_floor, log_scaled, real_physical)
   *   - Zoomed out: log_scaled wins (always visible, proportional)
   *   - Medium zoom: still log_scaled
   *   - Close zoom: real_physical takes over naturally
   *   - Any zoom: pixel_floor prevents sub-pixel invisibility
   */
  scale_body_diameter(body: string) {
    const diameter = system.body(body).radius * 2; // meters
    const is_tiny  = diameter < 3200000;

    // Absolute minimum pixel size to ensure visibility at any zoom
    const floor = is_tiny ? 1 : 3;

    // Log-scaled minimum: maps the body's physical diameter to a
    // proportional pixel size. log10 compresses the range:
    //   Phobos (22km):       log10(22000)      ≈ 4.3  →  ~1px
    //   Moon (3,474km):      log10(3474000)     ≈ 6.5  →  ~2px
    //   Mars (6,779km):      log10(6779000)     ≈ 6.8  →  ~5px
    //   Earth (12,742km):    log10(12742000)    ≈ 7.1  →  ~9px
    //   Jupiter (139,820km): log10(139820000)   ≈ 8.1  →  ~25px
    //   Sun (1,392,000km):   log10(1392000000)  ≈ 9.1  →  ~40px
    const logDiam = Math.log10(Math.max(diameter, 1));
    const logMin = 4.0;   // log10 of smallest tracked body (~10km)
    const logMax = 9.5;   // log10 of the sun
    const pxMin  = 1;     // pixels at the smallest log value
    const pxMax  = 40;    // pixels at the largest log value

    const t = util.clamp((logDiam - logMin) / (logMax - logMin), 0, 1);
    const rawLogScaled = pxMin + (pxMax - pxMin) * t;

    // Scale the log minimum by FOV to prevent overlap at wider views.
    // At close zoom (FOV < 0.02 AU) the full log sizes apply — you're
    // looking at one body or a tight cluster. As FOV grows, the log sizes
    // shrink so bodies separate visually. At wide FOV (> 5 AU) bodies
    // approach their pixel floor.
    //
    //   FOV 0.02 → 1.00 (full log size)
    //   FOV 0.1  → 0.45 (Saturn visible, moons distinct)
    //   FOV 0.5  → 0.20 (inner solar system)
    //   FOV 1.0  → 0.14
    //   FOV 5.0  → 0.06
    //   FOV 34   → 0.02
    const fovScale = Math.min(1, 0.02 / Math.pow(Math.max(this.fov_au, 0.02), 0.7));
    const logScaled = Math.max(floor, rawLogScaled * fovScale);

    // Real physical pixel size at the current zoom level
    const realPx = diameter * this.px_per_meter;

    // Use whichever is larger: the proportional log minimum or the real size.
    // Capped at scale_px so bodies can't exceed the viewport.
    return util.clamp(Math.max(floor, logScaled, realPx), floor, this.scale_px);
  }

  /** Returns true if the scaled screen position is within the viewport bounds. */
  is_visible(pos: Point): boolean {
    const p = this.scale_point(pos);

    if (p[0] < 0 || p[1] < 0)
      return false;

    if (p[0] > this.width_px || p[1] > this.height_px)
      return false;

    return true;
  }

  is_within_fov(target: Point): boolean {
    const [x, y] = this.scale_point(target);

    if (x < 0 || x > this.width_px)
      return false;

    if (y < 0 || y > this.height_px)
      return false;

    return true;
  }

  /**
   * Reads the DOM element's current pixel dimensions, subtracting fixed UI
   * elements (status bar, navbar, toolbar) from the available height.
   * Fires on_resize if dimensions changed. Uses jQuery for element sizing.
   */
  update_width() {
    if (!this.elt)
      return 0;

    const elHeight = (id: string) => document.getElementById(id)?.getBoundingClientRect().height || 0;

    const height
      = window.innerHeight
      + window.scrollY
      - this.elt.getBoundingClientRect().top
      - elHeight('spacer-status')
      - elHeight('spacer-navbar')
      - elHeight('navcomp-toolbar')
      - elHeight('navcomp-transit-info');

    const width = this.elt.parentElement?.getBoundingClientRect().width || 0;
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
