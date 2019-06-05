"use strict"

define(function(require, exports, module) {
  const util   = require('util');
  const Vue    = require('vue');
  const Hammer = require('vendor/hammer.min');
  const Layout = require('layout').Layout;

  require('gsap');

  return {
    data() {
      return {
        layout:           null,  // the layout object
        layout_scaling:   false, // whether to inject handlers for pan & zoom
        layout_target_id: null,  // element to control size of
        layout_mc:        null,  // HammerJS instance for element
      };
    },

    directives: {
      layout: {
        inserted(el, binding, vnode) {
          vnode.context.layout = new Layout(
            vnode.context.layout_target_id,
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

    watch: {
      'layout.elt': function() {
        if (this.layout.elt) {
          this.layout_mc = new Hammer(this.layout.elt);
          this.layout_install_handlers();
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

      layout_install_handlers() {
        window.addEventListener('resize', () => this.layout.update_width());

        if (!this.layout_scaling)
          return;


        /*
         * Scale the map using the mouse wheel
         */
        let wheel_tween;
        this.layout.elt.addEventListener('wheel', ev => {
          ev.stopPropagation();

          const inc = this.layout.fov_au / 10;
          const amount = ((ev.deltaX + ev.deltaY) / 2) > 0 ? inc : -inc;

          if (wheel_tween)
            wheel_tween.kill();

          wheel_tween = TweenMax.to(this.layout, 0.1, {
            fov_au: util.clamp(this.layout.fov_au + amount, Layout.SCALE_MIN_AU, Layout.SCALE_MAX_AU),
            ease: Linear.easeNone,
          });
        });


        /*
         * Scale the map on pinch and wheel events
         */
        this.layout_mc.get('pinch').set({ enable: true });

        let pinch_tween;
        this.layout_mc.on('pinch', ev => {
          let amount = ev.scale;

          if (amount > 1) {         // movement out <--*-->
            amount = -(amount - 1); // "spreads out" the map by zooming in to a smaller scale in AU
          } else {                  // movement in -->*<--
            amount = 1 - amount;    // zooms out by increasing the scale to a larger value in AU
          }

          amount = amount * this.layout.fov_au / 10; // reduce to a reasonable fractional value

          if (pinch_tween)
            pinch_tween.kill();

          pinch_tween = TweenMax.to(this.layout, 0.1, {
            fov_au: util.clamp(this.layout.fov_au + amount, Layout.SCALE_MIN_AU, Layout.SCALE_MAX_AU),
            ease: Linear.easeNone,
          });
        });


        /*
         * Pan the map using dragging
         */
        this.layout_mc.get('pan').set({
          direction: Hammer.DIRECTION_UP
                   | Hammer.DIRECTION_DOWN
                   | Hammer.DIRECTION_LEFT
                   | Hammer.DIRECTION_RIGHT,
        });

        let pan_tween;
        this.layout_mc.on('pan', ev => {
          if (ev.isFirst) {
            this.layout.init_x = this.layout.offset_x;
            this.layout.init_y = this.layout.offset_y;
          }

          if (pan_tween)
            pan_tween.kill();

          // Update the node's offset values
          pan_tween = TweenMax.to(this.layout, 0.1, {
            offset_x: this.layout.init_x + ev.deltaX,
            offset_y: this.layout.init_y + ev.deltaY,
            ease: Linear.easeNone,
          });

          // Reset initial positions on final event
          if (ev.isFinal) {
            this.layout.init_x = this.layout.offset_x;
            this.layout.init_y = this.layout.offset_y;
          }
        });


        console.debug('layout: handlers installed');
      },
    },
  };
});
