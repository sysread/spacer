define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const Hammer  = require('vendor/hammer.min');
  const Physics = require('physics');
  const System  = require('system');
  const NavComp = require('navcomp');
  const data    = require('data');
  const util    = require('util');

  const SCALE_DEFAULT_AU = 2;
  const SCALE_MIN_AU     = 0.00001;
  const SCALE_MAX_AU     = 35;

  require('component/common');
  require('component/exchange');
  require('component/summary');
  require('component/commerce');
  require('vendor/jsspline');

  function plotWidth() {
    const elt = document.getElementById('map-root');
    if (!elt) return 0;
    const frameTop  = elt.getBoundingClientRect().top + window.scrollY;
    const statusbar = $('#spacer-status').outerHeight();
    const nav       = $('#spacer-navbar').outerHeight();
    const controls  = $('#map-controls').outerHeight();
    const slider    = $('#transit-time').outerHeight() || 0;
    const height    = window.innerHeight - frameTop - statusbar - nav - controls - slider;
    const width     = $('.plot-root').parent().width();
    return Math.min(width, height);
  }

  function scaleX(n, zero, scale, offset=0) {
    const pct = n / (scale * Physics.AU);
    return (zero + (zero * pct)) + offset;
  }

  function scaleY(n, zero, scale, offset=0) {
    const pct = n / (scale * Physics.AU);
    return (zero - (zero * pct)) + offset;
  }

  function scaleFont(n, scale) {
    return util.R(n - scale / SCALE_MAX_AU / 10) + 'px';
  }


  Vue.component('plot-transit-legend', {
    props: ['scale', 'dest', 'transit', 'fuel'],

    computed: {
      transit_dist: function() { if (this.transit) return this.transit.au; },
      transit_maxv: function() { if (this.transit) return this.transit.maxVelocity / 1000; },
      transit_time: function() { if (this.transit) return this.transit.days_hours; },

      fov: function() {
        const km = this.scale * Physics.AU / 1000;
        if (km < 1000000) {
          return util.csn(util.R(km)) + ' km';
        } else {
          return util.R(this.scale, 5) + ' AU';
        }
      },

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
<table v-if="transit" class="bg-black w-100 table table-sm" style="position:relative;z-index:10;font-size:0.75rem;font-family:mono">
  <tr>
    <th>Field of view</th>
    <td>{{fov}}</td>
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
    <th>Field of view</th>
    <td>{{fov}}</td>
  </tr>
  <tr v-if="dest">
    <th>No routes</th>
    <td>Transit &lt; 1 year | Fuel &lt; {{fuel}} tonnes</td>
  </tr>
</table>
    `,
  });


  Vue.component('plot-point', {
    props: ['pos', 'label', 'max', 'min'],

    computed: {
      zero: function() { return this.max / 2 },
      left: function() { return this.pos[0] },
      top:  function() { return this.pos[1] },

      isVisible: function() {
        const [x, y, z] = this.pos;
        if (x <= this.min || 0) return false;
        if (y <= this.min || 0) return false;
        if (x >= this.max) return false;
        if (y >= this.max) return false;
        return true;
      },

      showLabel: function() {
        if (!this.label) return false;
        return true;
        const zero = this.zero;
        const r = Physics.distance(this.pos, [zero, zero]);
        return (r / this.max) > 0.1;
      },
    },

    template: `
<span @click="$emit('click')" v-show="isVisible" class="plot-point" :style="{left: left + 'px', top: top + 'px', 'z-index': 0}">
  <slot />

  <badge v-if="isVisible && showLabel" class="m-1">
    {{label|caps}}
  </badge>
</span>
    `,
  });


  Vue.component('plot-planet', {
    props: ['name', 'pos', 'zero', 'scale', 'offsetX', 'offsetY', 'max', 'color', 'no_label'],

    computed: {
      body()         { return System.body(this.name) },
      radius()       { return this.body.radius },
      diameter()     { return this.radius * 2 },
      fov()          { return Physics.AU * this.scale },
      ratio()        { return this.diameter / this.fov },
      width()        { return Math.max(5, this.max * this.ratio) },
      truePosition() { return this.pos ? this.pos : this.name == 'sun' ? [0, 0] : System.position(this.name) },
      positionX()    { return scaleX(this.truePosition[0], this.zero, this.scale, this.offsetX) - this.width / 2},
      positionY()    { return scaleY(this.truePosition[1], this.zero, this.scale, this.offsetY) - this.width / 2},
      position()     { return [this.positionX, this.positionY] },
      isMoon()       { return this.name !== 'sun' && System.central(this.name) !== 'sun' },

      showLabel() {
        if (this.no_label) return false;
        if (this.isMoon)   return this.scale < 0.25;
        const orbit = Physics.distance([0, 0, 0], this.truePosition) / Physics.AU;
        return this.scale / 6 < orbit;
      },

      shown() {
        if (this.name === 'sun') return true;
        if (this.isMoon) return this.showLabel;
        return true;
      },
    },

    template: `
<plot-point
    v-if="shown"
    :name="name"
    :pos="position"
    :max="max"
    :min="0 - width"
    :label="showLabel ? name : ''"
    @click="$emit('click')">

  <img class="plot-image" :src="'img/' + name + '.png'" :style="{'width': width + 'px'}" />

</plot-point>
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
      resizable: {
        inserted: function(el, binding, vnode) {
          const elt = document.getElementById('plot-root');
          const ui  = document.getElementById('ui');
          const mc  = new Hammer(elt);

          // Drag the map on pan events
          mc.get('pan').set({
            direction: Hammer.DIRECTION_UP | Hammer.DIRECTION_DOWN | Hammer.DIRECTION_LEFT | Hammer.DIRECTION_RIGHT,
          });

          mc.on('pan', ev => {
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

            const scale = util.R(Math.max(SCALE_MIN_AU, Math.min(SCALE_MAX_AU, vnode.context.scale + amount)), 6);
            vnode.context.setScale(scale);
          });

          elt.addEventListener('wheel', ev => {
            ev.preventDefault();
            ev.stopPropagation();

            const inc    = vnode.context.scale / 10;
            const amount = ((ev.deltaX + ev.deltaY) / 2) > 0 ? inc : -inc;
            const scale  = util.R(Math.max(SCALE_MIN_AU, Math.min(SCALE_MAX_AU, vnode.context.scale + amount)), 6);

            vnode.context.setScale(scale);
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
        // subtract two for border width
        return (this.width - 2) / 2;
      },

      positions: function() {
        const bodies = {};

        for (let body of System.bodies()) {
          const central = System.central(body);

          if (central !== 'sun' && !bodies.hasOwnProperty(central)) {
            bodies[central] = System.position(central);
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
          const min   = this.scale * Physics.AU / 30;
          const orbit = System.orbit_by_turns(transit.dest);
          const path  = [];
          let mark    = -1;

          for (let i = 1; i < transit.turns; ++i) {
            if (i == 1 || i == transit.turns - 1 || Physics.distance(path[mark], orbit[i]) > min) {
              path.push(orbit[i]);
              ++mark;
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
      resize: function() { this.width = plotWidth() },
      adjustX: function(n, offset=true) { return scaleX(n, this.zero, this.scale, offset ? this.offsetX : 0) },
      adjustY: function(n, offset=true) { return scaleY(n, this.zero, this.scale, offset ? this.offsetY : 0) },

      setDest: function(body, target) {
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
        else {
          this.dest = this.dests[0];
        }

        this.index = 0;

        if (target) {
          this.center();
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

      setScale: function(scale) {
        const oldScale = this.scale;
        const newScale = scale;
        this.scale    = scale;
        this.offsetX -= ((this.offsetX * newScale) - (this.offsetX * oldScale)) / newScale;
        this.offsetY -= ((this.offsetY * newScale) - (this.offsetY * oldScale)) / newScale;
        this.initX    = this.offsetX;
        this.initY    = this.offsetY;
      },

      resetScale: function() {
        this.autoScale();
        this.offsetX = 0;
        this.offsetY = 0;
        this.initX   = this.offsetX;
        this.initY   = this.offsetY;
      },

      autoScale: function() {
        let scale;
        const here = Physics.distance([0, 0, 0], System.position(game.locus));

        if (this.transit) {
          scale = Math.max(
            Physics.distance([0, 0, 0], this.transit.end),
            Physics.distance([0, 0, 0], this.transit.start),
            here,
          );
        }
        else if (this.dest) {
          scale = Math.max(
            Physics.distance([0, 0, 0], System.position(game.locus)),
            here,
          );
        }
        else {
          scale = here;
        }

        scale = scale / Physics.AU * 1.25;
        this.setScale(util.R(Math.min(Math.max(scale, SCALE_MIN_AU), SCALE_MAX_AU), 3));
      },

      center: function() {
        const body = this.dest || this.origin;
        const p = body == this.dest ? this.transit.end : System.position(body);
        const z = this.zero;
        const [x, y] = [this.adjustX(p[0], false), this.adjustY(p[1], false)];
        this.offsetX = z - x;
        this.offsetY = z - y;
        this.initX   = this.offsetX;
        this.initY   = this.offsetY;
      },

      beginTransit: function() {
        $('#spacer').data('info', this.transit);
        $('#spacer').data('state', 'transit');
      },
    },

    template: `
<div id="map-root">
  <div id="map-controls" class="btn-toolbar justify-content-between">
    <div class="btn-group btn-group-sm">
      <btn :disabled="!dest" @click="show='map'">&#8982;</btn>
      <btn :disabled="!dest" @click="show='info'">?</btn>
      <btn :disabled="!dest" @click="show='market';relprices=false">$</btn>
      <btn :disabled="!dest" @click="show='market';relprices=true">$&plusmn;</btn>
    </div>

    <div class="btn-group btn-group-sm">
      <btn v-if="!dest" @click="setDest(dests[0], true)">Destination</btn>
      <btn v-for="(name, idx) of dests" :key="name" v-if="name == dest" @click="setDest(dests[idx + 1], true)">{{name|caps}}</btn>
      <btn :disabled="!dest" @click="show='fuel'">Fuel</btn>
      <btn @click="resetScale()" class="text-warning">&#9055;</btn>
      <btn @click="center()" class="text-warning font-weight-bold">&target;</btn>
    </div>
  </div>

  <planet-summary v-if="show=='info'" mini=true :planet="planet" class="p-3" />

  <market-report v-if="show=='market'" :relprices="relprices" :body="dest" class="m-3 p-1 bg-black" />

  <div v-show="show=='map'" v-resizable id="plot-root" class="plot-root p-0 m-0" :style="{'position': 'relative', 'width': width + 'px', 'height': width + 'px'}">
    <plot-planet
      name="sun"
      :zero="zero"
      :scale="scale"
      :offsetX="offsetX"
      :offsetY="offsetY"
      :max="width"
      color="yellow"
      no_label=true
    />

    <plot-planet v-for="(pos, name) of bodies"
      v-if="name != dest"
      :key="name"
      :name="name"
      :zero="zero"
      :scale="scale"
      :offsetX="offsetX"
      :offsetY="offsetY"
      :max="width"
      @click="setDest(name)"
    />

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
        class="text-danger">
      .
    </plot-point>

    <plot-planet
      v-if="transit"
      :name="dest"
      :zero="zero"
      :scale="scale"
      :offsetX="offsetX"
      :offsetY="offsetY"
      :max="width"
      :pos="transit.end"
    />

    <plot-transit-legend :dest="dest" :scale="scale" :transit="transit" :fuel="fuel" />
  </div>

  <slider @change="center" id="transit-time" class="my-1 w-100" v-if="dest" slot="def" :value.sync="index" step=1 min=0 :max="transits.length - 1" />

  <modal v-if="show=='fuel'" @close="show='map'" title="Fuel usage" xclose=true close="Confirm">
    <p>The navigation computer is capable of customizing routes based on optimal fuel usage.</p>

    <p>It is currently configured to build trajectories requiring no more than {{fuel|R(2)}} tonnes of fuel.</p>

    <def v-if="dest" term="Fuel" split=3 class="p-0 m-0">
      <btn slot="def" @click="show_all=!show_all;onConstraintChange()">
        <span v-if="show_all">All routes</span>
        <span v-else>Fuel constrained</span>
      </btn>
    </def>

    <def v-if="dest && !show_all" term="Fuel" split=3 class="p-0 m-0">
      <slider slot="def" :value.sync="fuel" step=1 min=1 :max="max_fuel" @change="onConstraintChange()" />
    </def>
  </modal>
</div>
    `,
  });
});
