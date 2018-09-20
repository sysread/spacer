define(function(require, exports, module) {
  const Physics = require('physics');
  const Hammer  = require('vendor/hammer.min');
  const util    = require('util');

  const Layout = class {
    static get SCALE_DEFAULT_AU() { return 2       }
    static get SCALE_MIN_AU()     { return 0.00001 };
    static get SCALE_MAX_AU()     { return 35      };

    constructor() {
      this.fov_au   = Layout.SCALE_DEFAULT_AU;
      this.width_px = 0;
      this.init_x   = 0;
      this.init_y   = 0;
      this.offset_x = 0;
      this.offset_y = 0;
      this.update_width();
    }

    get zero() {
      if (!this._zero) {
        this._zero = this.width_px / 2;
      }

      return this._zero;
    }

    get elt() {
      if (!this._elt) {
        this._elt = document.getElementById('navcomp-map-root');

        if (this._elt) {
          console.debug('layout: navcomp-map-root found');

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
    }

    set_center(point) {
      const [x, y]  = this.scale_point(point, true);
      this.offset_x = this.zero - x;
      this.offset_y = this.zero - y;
      this.init_x   = this.offset_x;
      this.init_y   = this.offset_y;
    }

    clear_zero() {
      this._zero = null;
    }

    clear_mc() {
      this._mc = null;
    }

    scale(n) {
      const fov_m = this.fov_au * Physics.AU;
      return n / fov_m * this.zero;
    }

    scale_x(n, no_offset) {
      const n_scaled = this.zero + this.scale(n);
      return no_offset ? n_scaled : n_scaled + this.offset_x;
    }

    scale_y(n, no_offset) {
      const n_scaled = this.zero - this.scale(n);
      return no_offset ? n_scaled : n_scaled + this.offset_y;
    }

    scale_point(p, no_offset) {
      return [
        this.scale_x(p[0], no_offset),
        this.scale_y(p[1], no_offset),
      ];
    }

    update_width() {
      if (!this.elt) {
        return 0;
      }

      const height
        = window.innerHeight
        + window.scrollY
        - this.elt.getBoundingClientRect().top
        - $('#spacer-status').outerHeight()
        - $('#spacer-navbar').outerHeight();

      const width = $(this.elt).parent().width();

      this.clear_zero();
      this.width_px = Math.min(width, height);

      console.debug('layout: width updated to', this.width_px);
    }

    install_handlers() {
      window.addEventListener('resize', () => {
        this.update_width();
      });

      this.elt.addEventListener('wheel', ev => {
        ev.preventDefault();
        ev.stopPropagation();

        const inc    = this.fov_au / 10;
        const amount = ((ev.deltaX + ev.deltaY) / 2) > 0 ? inc : -inc;

        this.set_fov_au(this.fov_au + amount);
      });

      // Scale the map on pinch and wheel events
      this.mc.get('pinch').set({ enable: true });

      this.mc.on('pinch', ev => {
        let amount = ev.scale;

        if (amount > 1) {         // movement out <--*-->
          amount = -(amount - 1); // "spreads out" the map by zooming in to a smaller scale in AU
        } else {                  // movement in -->*<--
          amount = 1 - amount;    // zooms out by increasing the scale to a larger value in AU
        }

        amount /= 10;             // reduce to a reasonable fractional value

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

  return Layout;
});
