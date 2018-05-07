define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const Hammer  = require('vendor/hammer.min');
  const Physics = require('physics');
  const System  = require('system');
  const NavComp = require('navcomp');
  const data    = require('data');
  const util    = require('util');

  const SCALE_DEFAULT_AU = 6;
  const SCALE_MIN_AU     = 1;
  const SCALE_MAX_AU     = 35;

  require('component/common');
  require('component/exchange');
  require('component/summary');
  require('component/commerce');


  Vue.component('plot-transit-legend', {
    props: ['scale', 'dest', 'transit', 'fuel'],

    computed: {
      transit_dist: function() { if (this.transit) return this.transit.au; },
      transit_maxv: function() { if (this.transit) return this.transit.maxVelocity / 1000; },
      transit_time: function() { if (this.transit) return this.transit.days_hours; },

      transit_fuel: function() {
        if (this.transit) {
          return this.transit.fuel;
        }
      },

      transit_acc:  function() {
        if (this.transit) {
          if (this.transit.accel >= 1) {
            return util.R(this.transit.accel / Physics.G, 3) + ' G';
          } else {
            return util.R(this.transit.accel, 3) + ' m/s/s';
          }
        }
      },

      target_date: function() {
        if (this.transit) {
          const date = new Date(game.date);
          date.setHours(date.getHours() + Math.ceil(this.transit.turns * data.hours_per_turn));
          return date;
        }
      },
    },

    template: `
<table v-if="transit" class="w-100 table table-sm" style="font-size:0.75rem;font-family:mono">
  <tr>
    <th>Scale</th>
    <td>{{scale|R(2)|unit('AU')}}</td>
    <th>Time</th>
    <td>{{transit_time[0]}} days, {{transit_time[1]}} hours</td>
  </tr>
  <tr>
    <th>Dist.</th>
    <td>{{transit_dist|R(2)|unit('AU')}}</td>
    <th>Max vel.</th>
    <td>{{transit_maxv|R(2)|unit('km/s')}}</td>
  </tr>
  <tr>
    <th>Max accel.</th>
    <td>{{transit_acc}}</td>
    <th>Fuel</th>
    <td>{{transit_fuel|R(2)}} tonnes (cap: {{fuel}})</td>
  </tr>
</table>
<table v-else class="w-100 table table-sm" style="font-size:0.75rem;font-family:mono">
  <tr>
    <th>Scale</th>
    <td>{{scale|R(2)|unit('AU')}}</td>
  </tr>
  <tr v-if="dest">
    <th>No routes</th>
    <td>Transit &lt; 1 year | Fuel &lt; {{fuel}} tonnes</td>
  </tr>
</table>
    `,
  });


  Vue.component('plot-point', {
    props: ['pos', 'label', 'max'],

    computed: {
      isVisible: function() {
        const [x, y, z] = this.pos;
        if (x <= 0) return false;
        if (y <= 0) return false;
        if (x >= this.max) return false;
        if (y >= this.max) return false;
        return true;
      },

      showLabel: function() {
        if (!this.label) return false;
        const zero = this.max / 2;
        const r = Physics.distance(this.pos, [zero, zero]);
        return (r / this.max) > 0.1;
      },
    },

    template: `
<span @click="$emit('click')" v-if="isVisible" class="plot-point" :style="{left: pos[0] + 'px', top: pos[1] + 'px'}">
  <slot />

  <badge v-if="isVisible && showLabel" class="m-1">
    {{label|caps}}
  </badge>
</span>
    `,
  });


  Vue.component('plot', {
    props: ['controls', 'plan'],

    data: function() {
      window.addEventListener('resize', this.resize);

      const dests = System.bodies().filter(n => {return n != game.locus});

      return {
        scale:     SCALE_DEFAULT_AU,      // map scale
        width:     null,                  // plot width in pixels
        dests:     dests,                 // list of destination names
        navcomp:   new NavComp,           // nav computer
        origin:    game.locus,            // name of initial body for transit
        dest:      "",                    // name of destination body for transit
        index:     0,                     // zero-based index of selected transit in transit list (computed 'transits')
        show_all:  false,                 // flag passed to NavComp to include all routes rather than skipping inefficient ones
        max_fuel:  game.player.ship.fuel, // contrains fuel usage in NavComp calculations
        fuel:      game.player.ship.fuel, // player-supplied constraint for fuel usage
        show:      'map',                 // currently displayed view
        relprices: false,                 // for market prices, display relative prices when true
        offsetX:   0,                     // offset from zero-zero point when panning map
        offsetY:   0,                     // offset from zero-zero point when panning map
        initX:     0,                     // initial position when panning
        initY:     0,                     // initial position when panning

        SCALE_DEFAULT_AU: SCALE_DEFAULT_AU,
        SCALE_MIN_AU: SCALE_MIN_AU,
        SCALE_MAX_AU: SCALE_MAX_AU,
      };
    },

    directives: {
      'resizable': {
        inserted: function(el, binding, vnode) {
          const elt = document.getElementById('plot-root');
          const mc  = new Hammer(elt);

          // Drag the map on pan events
          mc.get('pan').set({
            direction: Hammer.DIRECTION_UP | Hammer.DIRECTION_DOWN | Hammer.DIRECTION_LEFT | Hammer.DIRECTION_RIGHT,
          });

          mc.on('pan', ev => {
            // Set initial position on first event
            if (ev.isFirst) {
              vnode.context.initX = vnode.context.offsetX;
              vnode.context.initY = vnode.context.offsetY;
            }

            // Update the node's offset values
            vnode.context.offsetX = vnode.context.initX + ev.deltaX;
            vnode.context.offsetY = vnode.context.initY + ev.deltaY;

            // Reset initial positions on final event
            if (ev.isFinal) {
              vnode.context.initX = vnode.context.offsetX;
              vnode.context.initY = vnode.context.offsetY;
            }
          });

          // Scale the map on pinch and wheel events
          mc.get('pinch').set({ enable: true });

          mc.on('pinch', ev => {
            let amount = ev.scale;

            if (amount > 1) {         // movement out <--*-->
              amount = -(amount - 1); // "spreads out" the map by zooming in to a smaller scale in AU
            } else {                  // movement in -->*<--
              amount = 1 - amount;    // zooms out by increasing the scale to a larger value in AU
            }

            amount /= 10;             // reduce to a reasonable fractional value

            vnode.context.scale = util.R(Math.max(SCALE_MIN_AU, Math.min(SCALE_MAX_AU, vnode.context.scale + amount)), 2);
          });

          elt.addEventListener('wheel', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            let amount = ev.deltaY / 10;
            vnode.context.scale = util.R(Math.max(SCALE_MIN_AU, Math.min(SCALE_MAX_AU, vnode.context.scale + amount)), 2);
          });

          // Set initial scale
          vnode.context.resize();
          vnode.context.autoScale();
        }
      },
    },

    computed: {
      planet: function() {
        if (this.dest) return game.planets[this.dest];
      },

      zero: function() {
        return Math.ceil(this.width / 2);
      },

      positions: function() {
        const bodies = {};

        for (let body of System.bodies()) {
          const central = System.central(body);

          if (central !== 'sun') {
            body = central;
          }

          if (!bodies.hasOwnProperty(body)) {
            bodies[body] = System.position(body);
          }
        }

        return bodies;
      },

      bodies: function() {
        const bodies = {};
        const positions = this.positions;

        for (const body of Object.keys(positions)) {
          const p = positions[body];
          bodies[body] = [this.adjustX(p[0]), this.adjustY(p[1])];
        }

        return bodies;
      },

      destination: function() {
        const t = this.transit;

        if (t) {
          const p = System.position(t.dest, this.target_date);
          return [this.adjustX(p[0]), this.adjustY(p[1])];
        }
      },

      transits: function() {
        if (this.dest) {
          return this.navcomp.getTransitsTo(this.dest);
        }
      },

      transit: function() {
        if (this.plan) {
          return this.plan;
        }

        if (this.dest) {
          const transits = this.transits;
          if (transits.length > 0) {
            return transits[this.index];
          }
        }

        return;
      },

      path: function() {
        const transit = this.transit;

        if (transit) {
          return transit.path.map(p => {
            return [
              this.adjustX(p.position.x),
              this.adjustY(p.position.y),
            ];
          });
        }
      },

      targetPath: function() {
        const transit = this.transit;

        if (transit) {
          const orbit = System.orbit_by_turns(transit.dest);
          const path  = [];

          for (let i = 0; i < transit.turns; ++i) {
            if (i == 0 || Physics.distance(path[path.length - 1], orbit[i]) > (Physics.AU / 10)) {
              path.push(orbit[i]);
            }
          }

          return path.map(p => {
            return [
              this.adjustX(p[0]),
              this.adjustY(p[1]),
            ];
          });
        }
      },
    },

    methods: {
      resize: function() {
        const frameTop  = Math.ceil(this.$el.getBoundingClientRect().top + window.scrollY);
        const statusbar = $('#spacer-status').outerHeight();
        const nav       = $('#spacer-navbar').outerHeight();
        const height    = window.innerHeight - frameTop - statusbar - nav;
        const width     = $('.plot-root').parent().width();
        this.width = Math.ceil(Math.min(width, height));
      },

      adjustX: function(n, offset=true) {
        const zero = this.zero;
        const pct  = n / (this.scale * Physics.AU);
        let x = Math.floor(zero + (zero * pct));
        if (offset) x += this.offsetX;
        return x;
      },

      adjustY: function(n, offset=true) {
        const zero = this.zero;
        const pct  = n / (this.scale * Physics.AU);
        let y = Math.floor(zero - (zero * pct));
        if (offset) y += this.offsetY;
        return y;
      },

      setDest: function(body, autoScale) {
        window.setTimeout(() => {this.resize()}, 500);

        if (body) {
          const satellites = System.body(body).satellites;

          const dests = this.dests.filter(d => {
            return satellites[d] || d == body;
          });

          if (this.dest && dests.length > 1) {
            let done = false;

            for (let i = 0; i < dests.length; ++i) {
              if (this.dest == dests[i]) {
                let idx = i + 1;

                if (dests.length <= idx) {
                  idx = 0;
                }

                this.dest = dests[idx];
                done = true;
                break;
              }
            }

            if (!done) {
              this.dest = dests[0];
            }
          }
          else if (dests.length > 0) {
            this.dest = dests[0];
          }
          else {
            this.dest = "";
          }
        }

        this.index = 0;

        if (autoScale) {
          this.autoScale();
        }
      },

      orbitalRadiusAU: function(body) {
        const r = Physics.distance(System.position(body), [0,0,0]);
        return r / Physics.AU;
      },

      onConstraintChange: function() {
        this.index = 0;
        this.navcomp = new NavComp(this.fuel, this.show_all);
      },

      nextRoute: function(inc=1) {
        if (this.index + inc >= this.transits.length)
          this.index = 0;
        else if (this.index + inc <= 0)
          this.index = 0;
        else
          this.index += inc;
      },

      autoScale: function() {
        if (this.transit) {
          this.scale = Math.max(
            Physics.distance([0, 0, 0], this.transit.end),
            Physics.distance([0, 0, 0], this.transit.start),
            Physics.distance([0, 0, 0], System.position(game.locus)),
          ) / Physics.AU * 1.25;
        }
        else if (this.dest) {
          this.scale = Math.max(
            Physics.distance([0, 0, 0], System.position(this.dest)),
            Physics.distance([0, 0, 0], System.position(game.locus)),
          ) / Physics.AU * 1.25;
        }
        else {
          this.scale = SCALE_DEFAULT_AU;
        }
      },

      resetScale: function() {
        this.autoScale();
        this.offsetX = 0;
        this.offsetY = 0;
      },

      centerOnDest: function() {
        if (this.dest) {
          this.autoScale();
          const z = this.zero;
          const p = System.position(this.dest, this.target_date);
          const [x, y] = [this.adjustX(p[0], false), this.adjustY(p[1], false)];
          this.offsetX = z - x;
          this.offsetY = z - y;
        }
        else {
          this.resetScale();
        }
      },

      beginTransit: function() {
        $('#spacer').data('info', this.transit);
        $('#spacer').data('state', 'transit');
      },
    },

    template: `
<card nopad=1 id="map-root">
  <card-header slot="header">
    <div class="btn-toolbar">
      <div class="btn-group my-2 mr-3">
        <btn :disabled="!dest" @click="show='map'">&#8982;</btn>
        <btn :disabled="!dest" @click="show='info'">?</btn>
        <btn :disabled="!dest" @click="show='market';relprices=false">$</btn>
        <btn :disabled="!dest" @click="show='market';relprices=true">$&plusmn;</btn>
      </div>

      <div class="btn-group my-2">
        <btn @click="resetScale()" class="text-warning">&#9055;</btn>
        <btn :disabled="!dest" @click="centerOnDest()" class="text-warning">&target;</btn>
        <btn v-if="!dest" @click="setDest(dests[0], true)">Destination</btn>

        <btn v-for="(name, idx) of dests" :key="name" v-if="name == dest" @click="setDest(dests[idx + 1], true)">
          {{name|caps}}
        </btn>
      </div>
    </div>
  </card-header>

  <planet-summary v-if="show=='info'" mini=true :planet="planet" class="p-3" />

  <market-report v-if="show=='market'" :relprices="relprices" :body="dest" class="m-3 p-1 bg-black" />

  <div v-if="show=='map'" v-resizable id="plot-root" class="plot-root p-0 m-0" :style="{'position': 'relative', 'width': width + 'px', 'height': width + 'px'}">
    <plot-transit-legend :dest="dest" :scale="scale" :transit="transit" :fuel="fuel" />

    <plot-point v-for="(pos, name) of bodies"
        :key="name"
        :style="{'font-size': (3.0 - scale / SCALE_MAX_AU) + 'rem'}"
        :pos="pos"
        :max="width"
        :label="name"
        @click="setDest(name)">
      .
    </plot-point>

    <plot-point :pos="[adjustX(0), adjustY(0)]" :max="width"
        :style="{'font-size': (5.0 - (3 * scale / SCALE_MAX_AU)) + 'rem'}"
        class="text-warning">
      &bull;
    </plot-point>

    <plot-point v-for="(p, idx) in path"
        :key="'path-' + idx"
        v-if="path"
        :pos="p"
        :max="width"
        style="font-size:0.5+'rem'"
        :class="this.plan ? 'text-muted' : 'text-success'">
      .
    </plot-point>

    <plot-point v-for="(p, idx) in targetPath"
        :key="'target-path-' + idx"
        v-if="targetPath"
        :pos="p"
        :max="width"
        style="font-size:0.25+'rem'"
        class="text-muted">
      .
    </plot-point>
  </div>

  <card-footer v-if="dest" slot="footer">
    <def v-if="transit" term="Time" split=3 class="p-0 m-0">
      <slider slot="def" :value.sync="index" step=1 min=0 :max="transits.length - 1" />
    </def>

    <def v-if="dest" term="Fuel" split=3 class="p-0 m-0">
      <slider slot="def" :value.sync="fuel" step=1 min=1 :max="max_fuel" @change="onConstraintChange()" />
    </def>

    <def v-if="dest" term="Routes" split=3 class="p-0 m-0">
      <btn slot="def" @click="show_all=!show_all;onConstraintChange()">
        <span v-if="show_all">All</span>
        <span v-else>Best</span>
      </btn>
    </def>
  </card-footer>
</card>
    `,
  });
});
