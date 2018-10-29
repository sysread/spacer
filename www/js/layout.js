define(function(require, exports, module) {
  const Physics = require('physics');
  const Hammer  = require('vendor/hammer.min');
  const util    = require('util');
  const system  = require('system');


  const Layout = class {
    static get SCALE_DEFAULT_AU() { return 2       }
    static get SCALE_MIN_AU()     { return 0.00001 };
    static get SCALE_MAX_AU()     { return 35      };

    constructor(id, scaling, on_scale, on_pan, on_resize) {
      this.id        = id;
      this.scaling   = scaling;
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
      if (!this._zero_x) {
        this._zero_x = this.width_px / 2;
      }

      return this._zero_x;
    }

    get zero_y() {
      if (!this._zero_y) {
        this._zero_y = this.height_px / 2;
      }

      return this._zero_y;
    }

    get zero() {
      return Math.min(this.zero_x, this.zero_y);
    }

    get elt() {
      if (!this._elt) {
        this._elt = document.getElementById(this.id);

        if (this._elt) {
          console.debug(`layout: id ${this.id} found`);
          this.clear_mc();
          this.install_handlers();
        }
      }

      return this._elt;
    }

    get mc() {
      if (!this._mc) {
        if (!this.elt) {
          return;
        }

        this._mc = new Hammer(this.elt);
        console.debug('layout: hammer time');
      }

      return this._mc;
    }

    get center() {
      return [this.offset_x, this.offset_y];
    }

    set_fov_au(au) {
      let new_fov;
      if (au === undefined) {
        new_fov = Layout.SCALE_DEFAULT_AU;
      } else {
        new_fov = util.R(Math.max(Layout.SCALE_MIN_AU, Math.min(Layout.SCALE_MAX_AU, au)), 6);
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

    set_center(point) {
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
      this._zero_x = null;
      this._zero_y = null;
    }

    clear_mc() {
      this._mc = null;
    }

    scale(n) {
      const fov_m = this.fov_au * Physics.AU;
      return n / fov_m * this.zero;
    }

    scale_x(n, no_offset) {
      const n_scaled = this.zero_x + this.scale(n);
      return no_offset ? n_scaled : n_scaled + this.offset_x;
    }

    scale_y(n, no_offset) {
      const n_scaled = this.zero_y - this.scale(n);
      return no_offset ? n_scaled : n_scaled + this.offset_y;
    }

    scale_point(p, no_offset) {
      return [
        this.scale_x(p[0], no_offset),
        this.scale_y(p[1], no_offset),
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

      if (path.length % each != 0) {
        path.push(this.scale_point(pos));
      }

      return path;
    }

    scale_body_diameter(body) {
      const fov_m    = this.fov_au * Physics.AU;
      const px_per_m = this.scale_px / fov_m;
      const diameter = system.body(body).radius * 2;

      const adjust = body == 'sun' ? 1
                   : body.match(/jupiter|saturn|uranus|neptune/) ? 10
                   : 50;

      const factor = this.fov_au + Math.log2(Math.max(1, this.fov_au));
      const amount = util.clamp(adjust * factor, 1);
      return util.clamp(diameter * px_per_m * amount, 3, this.scale_px);
    }

    is_within_fov(target, reference_point) {
      const d = Physics.distance(target, reference_point) / Physics.AU;
      return d < 0.5 || d < this.fov_au;
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
        - $('#spacer-status').height()
        - $('#spacer-navbar').height();

      const width   = $(this.elt).parent().width();
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

    install_handlers() {
      window.addEventListener('resize', () => {
        this.update_width();
      });

      if (!this.scaling) {
        return;
      }

      this.elt.addEventListener('wheel', ev => {
        ev.stopPropagation();

        const inc    = this.fov_au / 10;
        const amount = ((ev.deltaX + ev.deltaY) / 2) > 0 ? inc : -inc;

        this.set_fov_au(this.fov_au + amount);
      }, {passive: true});

      // Scale the map on pinch and wheel events
      this.mc.get('pinch').set({ enable: true });

      this.mc.on('pinch', ev => {
        let amount = ev.scale;

        if (amount > 1) {         // movement out <--*-->
          amount = -(amount - 1); // "spreads out" the map by zooming in to a smaller scale in AU
        } else {                  // movement in -->*<--
          amount = 1 - amount;    // zooms out by increasing the scale to a larger value in AU
        }

        amount = amount * this.fov_au / 10; // reduce to a reasonable fractional value

        this.set_fov_au(this.fov_au + amount);
      });

      // Drag the map on pan events
      this.mc.get('pan').set({
        direction: Hammer.DIRECTION_UP
                 | Hammer.DIRECTION_DOWN
                 | Hammer.DIRECTION_LEFT
                 | Hammer.DIRECTION_RIGHT,
      });

      this.mc.on('pan', ev => {
        if (ev.isFirst) {
          this.init_x = this.offset_x;
          this.init_y = this.offset_y;
        }

        // Update the node's offset values
        this.offset_x = this.init_x + ev.deltaX;
        this.offset_y = this.init_y + ev.deltaY;

        // Reset initial positions on final event
        if (ev.isFinal) {
          this.init_x = this.offset_x;
          this.init_y = this.offset_y;
        }
      });

      console.debug('layout: handlers installed');
    }
  };


  exports.Layout = Layout;


  exports.LayoutMixin = {
    data() {
      return {
        layout:           null,  // the layout object
        layout_scaling:   false, // whether to inject handlers for pan & zoom
        layout_target_id: null,  // element to control size of
      };
    },

    directives: {
      layout: {
        inserted(el, binding, vnode) {
          vnode.context.layout = new Layout(
            vnode.context.layout_target_id,
            vnode.context.layout_scaling,
            () => { vnode.context.layout_scale()  },
            () => { vnode.context.layout_pan()    },
            () => { vnode.context.layout_resize() },
          );

          vnode.context.$emit('update:layout', vnode.context.layout);

          vnode.context.$nextTick(() => {
            vnode.context.layout.update_width();
            vnode.context.layout_set();
          });
        }
      },
    },

    computed: {
      layout_css_dimensions() {
        if (this.layout) {
          return {
            width:  this.layout.width_px  + 'px',
            height: this.layout.height_px + 'px',
          };
        }
      },
    },

    methods: {
      layout_set()    { },
      layout_scale()  { },
      layout_pan()    { },
      layout_resize() { },
    },
  };
});
