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

  require('component/commerce');
  require('component/common');
  require('component/exchange');
  require('component/modal');
  require('component/summary');
  require('component/card');

  function plotWidth() {
    const elt = document.getElementById('map-root');
    if (!elt) return 0;
    const frameTop  = elt.getBoundingClientRect().top + window.scrollY;
    const statusbar = $('#spacer-status').outerHeight();
    const nav       = $('#spacer-navbar').outerHeight();
    const controls  = $('#map-controls').outerHeight() || 0;
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
      current_loc:  function() { return game.here.name },
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
    <th>FoV</th>
    <td>{{fov}}</td>
    <th>Loc</th>
    <td>{{current_loc}}</td>
  </tr>
  <tr>
    <th>Dist</th>
    <td>{{transit_dist|R(2)|unit('AU')}}</td>
    <th>Time</th>
    <td>{{transit_time[0]}} days, {{transit_time[1]}} hours</td>
  </tr>
  <tr>
    <th>V<sub>max</sub></th>
    <td>{{transit_maxv|R(2)|unit('km/s')}}</td>
    <th>Accel</th>
    <td>{{transit_acc}}</td>
  </tr>
  <tr>
    <th>Fuel</th>
    <td colspan="3">{{transit_fuel|R(2)}} tonnes (cap: {{fuel|R(2)}})</td>
  </tr>
</table>
<table v-else class="w-100 table table-sm" style="font-size:0.75rem;font-family:mono">
  <tr>
    <th>Field of view</th>
    <td>{{fov}}</td>
    <th>Current location</th>
    <td>{{current_loc}}</td>
  </tr>
  <tr v-if="dest">
    <th>No routes</th>
    <td colspan="3">Transit &lt; 1 year | Fuel &lt; {{fuel}} tonnes</td>
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
    props: ['name', 'pos', 'zero', 'scale', 'offsetX', 'offsetY', 'max', 'color', 'no_label', 'yes_label'],

    computed: {
      body()      { return System.body(this.name) },
      radius()    { return this.body.radius },
      diameter()  { return this.radius * 2 },
      fov()       { return Physics.AU * this.scale },
      ratio()     { return this.diameter / this.fov },
      width()     { return Math.max(5, this.max * this.ratio) },
      isMoon()    { return this.name !== 'sun' && System.central(this.name) !== 'sun' },
      positionX() { return scaleX(this.truePosition[0], this.zero, this.scale, this.offsetX) - this.width / 2},
      positionY() { return scaleY(this.truePosition[1], this.zero, this.scale, this.offsetY) - this.width / 2},
      position()  { return [this.positionX, this.positionY] },

      truePosition() {
        if (this.pos) {
          return this.pos;
        } else if (this.name == 'sun') {
          return [0, 0];
        } else {
          return System.position(this.name);
        }
      },

      showLabel() {
        if (this.yes_label) return true;
        if (this.no_label)  return false;
        if (this.isMoon)    return this.scale < 0.25;
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


  Vue.component('dest-picker', {
    data: function() {
      return {
        selected: null,
      };
    },

    computed: {
      bodies() { return Object.keys(data.bodies) },
    },

    methods: {
      name(b)    { return System.name(b)           },
      faction(b) { return System.faction(b)        },
      central(b) { return System.central(b)        },
      kind(b)    { return System.kind(b)           },
      isMoon(b)  { return System.type(b) == 'moon' },
      isHere(b)  { return game.locus == b          },

      dist(b) {
        const p0 = System.position(game.locus);
        const p1 = System.position(b);
        const d  = Physics.distance(p0, p1);

        if (d < Physics.AU * 0.01) {
          return util.csn(util.R(d / 1000)) + ' km';
        } else {
          return util.R(d / Physics.AU, 2) + ' AU';
        }
      },

      style(b) {
        let color;

        switch (this.faction(b)) {
          case 'UN':     color = 'text-info';      break;
          case 'MC':     color = 'text-danger';    break;
          case 'JFT':    color = 'text-warning';   break;
          case 'TRANSA': color = 'text-secondary'; break;
          case 'CERES':  color = 'text-success';   break;
          default:       color = '';               break;
        }

        return color + ' text-left';
      }
    },

    template: `
<modal @close="$emit('close', selected)" title="Select destination" xclose=true close="Choose">
  <btn v-for="body of bodies" :key="body" @click="selected=body" block=1 close=1 :disabled="isHere(body) || selected" :class="style(body)">
    {{name(body)}}
    <badge right=1 class="ml-1">{{dist(body)}}</badge>
    <badge right=1 class="ml-1 d-none d-sm-inline">{{faction(body)}}</badge>
    <badge right=1 v-if="isMoon(body)" class="ml-1 d-none d-sm-inline">{{kind(body)}}</badge>
  </btn>
</modal>
    `,
  });



  Vue.component('focus-picker', {
    props: ['dest', 'orig', 'init-fov'],

    data: function() {
      return {
        focus: null,
        fov:   this.initFov,
      };
    },

    computed: {
      bodies()  { return Object.keys(data.bodies) },
      min_fov() { return 0.1 },
      max_fov() { return SCALE_MAX_AU },
      result()  { return {focus: this.focus, fov: this.fov} },
    },

    template: `
<modal @close="$emit('close', result)" title="Map view controls" xclose=true close="Choose">
  <def split=5 class="p-0 m-0">
    <span slot="term">
      Field of view: {{ fov|R(1) }} AU
    </span>
    <span slot="def">
      <slider :value.sync="fov" step=0.1 :min="min_fov" :max="max_fov" />
    </span>
  </def>

  <card title="Focus map center">
    <card-text>
      <btn :muted="focus!='path'" block=1 class="text-left m-1" @click="focus='path'" v-if="dest">Transit Path</btn>
      <btn :muted="body!=focus" class="text-left col-5 m-1" @click="focus=body" v-for="body in bodies" :key="body">
        {{body|caps}}
        <span v-if="body == dest" class="text-warning">&target;</span>
        <span v-else-if="body == orig" class="text-success">&#9055;</span>
      </btn>
    </card-text>
  </card>
</modal>
    `,
  });

  Vue.component('plot-menu', {
    props: ['dest', 'fov', 'legend', 'relprices', 'show_all', 'fuel'],

    data: function() {
      return {
        show:   null,
        result: {
          view:       'map',
          relprices:  this.relprices,
          dest:       this.dest,
          focus:      null,
          fov:        this.fov,
          legend:     this.legend,
          all_routes: this.show_all,
          fuel:       this.fuel,
        },
      };
    },

    computed: {
      player()       { return game.player                                                    },
      playerHome()   { return game.planets[this.player.home]                                 },
      playerDeltaV() { return util.R(this.player.maxAcceleration()  / Physics.G, 3)          },
      shipDeltaV()   { return util.R(this.player.shipAcceleration() / Physics.G, 3)          },
      shipMass()     { return util.csn(util.R(this.player.ship.currentMass()))               },
      shipFuelMass() { return util.R(this.player.ship.fuel, 3)                               },
      shipBurnTime() { return util.csn(this.player.ship.maxBurnTime() * data.hours_per_turn) },
      playerLocus()  { return game.locus                                                     },
      max_fuel()     { return game.player.ship.fuel                                          },
      origin()       { return game.locus                                                     },

      destination() {
        if (this.result.dest)
          return System.short_name(this.result.dest);

        if (this.dest)
          return System.short_name(this.dest);

        return;
      }
    },

    methods: {
      setDest(dest) {
        this.show = null;

        if (dest) {
          this.result.dest = dest;
          this.result.focus = 'path';
          this.result.fov = null;
        }
      },

      setFocus(opt) {
        this.show = null;
        this.result.fov = opt.fov;

        if (opt.focus) {
          this.result.focus = opt.focus;
        }
      },
    },

    template: `
<div>
  <modal title="NavComp Controls" close="Done" @close="$emit('close', result)">
    <p>Your navigational computer automatically calculates the optimal trajectory from your current location to the other settlements in the system.</p>
    <p>Being born on {{playerHome.name}}, your body is adapted to {{playerHome.gravity|R(3)}}G, allowing you to endure a sustained burn of {{playerDeltaV}}G.</p>
    <p>Your ship is capable of {{shipDeltaV}}Gs of acceleration with her current load out ({{shipMass}} metric tonnes of materiél). With {{shipFuelMass}} tonnes of fuel, your ship has a maximum burn time of {{shipBurnTime}} hours at maximum thrust.</p>

    <btn block=1 close=1 @click="result.view='map'">Show system map</btn>

    <btn block=1 @click="show='dest'">Set destination</btn>

    <btn block=1 close=1 v-if="dest || result.dest" @click="result.view='info'">Information about {{destination}}</btn>
    <btn block=1 close=1 v-if="dest || result.dest" @click="result.relprices=false;result.view='market'">Relative market prices on {{destination}}</btn>
    <btn block=1 close=1 v-if="dest || result.dest" @click="result.relprices=true;result.view='market'">Absolute market prices on {{destination}}</btn>

    <btn block=1 close=1 v-if="result.legend" @click="result.legend=false">Map legend enabled</btn>
    <btn block=1 close=1 v-else @click="result.legend=true">Map legend disabled</btn>

    <btn block=1 @click="show='fuel'">Fuel consumption</btn>

    <btn block=1 @click="show='focus'">Map view controls</btn>
  </modal>

  <modal v-if="show=='fuel'" @close="show=null" title="Fuel usage" xclose=true close="Confirm">
    <p>The navigation computer is capable of customizing routes based on optimal fuel usage.</p>

    <p v-if="!result.all_routes">It is currently configured to build trajectories requiring no more than {{result.fuel|R(2)}} tonnes of fuel.</p>
    <p v-else>It is currently configured to show all trajectories.</p>

    <def term="Fuel" split=3 class="p-0 m-0">
      <btn slot="def" @click="result.all_routes=!result.all_routes">
        <span v-if="result.all_routes">All routes</span>
        <span v-else>Fuel constrained</span>
      </btn>
    </def>

    <def v-if="!result.all_routes" term="Fuel" split=3 class="p-0 m-0">
      <slider slot="def" :value.sync="result.fuel" step=1 min=1 :max="max_fuel" />
    </def>
  </modal>

  <dest-picker  v-if="show=='dest'"  @close="setDest" />
  <focus-picker v-if="show=='focus'" @close="setFocus" :dest="result.dest || dest" :orig="origin" :init-fov="result.fov" />
</div>
    `,
  });


  Vue.component('plot', {
    props: ['controls', 'plan', 'focus'],

    data: function() {
      window.addEventListener('resize', this.resize);

      const dests = System.bodies().filter(n => {return n != game.locus});

      return {
        scale:     SCALE_DEFAULT_AU,      // map scale
        width:     null,                  // plot width in pixels
        dests:     dests,                 // list of destination names
        navcomp:   new NavComp,           // nav computer
        origin:    game.locus,            // name of initial body for transit
        dest:      this.plan              // name of destination body for transit
                     ? this.plan.dest
                     : "",
        index:     0,                     // zero-based index of selected transit in transit list (computed 'transits')
        show_all:  false,                 // flag passed to NavComp to include all routes rather than skipping inefficient ones
        max_fuel:  game.player.ship.fuel, // contrains fuel usage in NavComp calculations
        fuel:      game.player.ship.fuel, // player-supplied constraint for fuel usage
        show:      'menu',                // currently displayed view
        relprices: false,                 // toggle relative prices in market view
        legend:    true,                  // toggle visibility of legend
        offsetX:   0,                     // offset from zero-zero point when panning map
        offsetY:   0,                     // offset from zero-zero point when panning map
        initX:     0,                     // initial position when panning
        initY:     0,                     // initial position when panning

        transit_cache: {},

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
          vnode.context.center();
        }
      },
    },

    computed: {
      centerPoint: function() {
        if (this.focus) {
          return this.focus;
        }

        if (this.transit) {
          return this.transitCenterPoint();
        }

        return [0, 0, 0];
      },

      planet: function() {
        if (this.dest) {
          return game.planets[this.dest];
        }
      },

      transits: function() {
        if (!this.dest) return;
        if (!this.show == 'map') return;

        if (!this.transit_cache[this.dest]) {
          this.transit_cache[this.dest] = this.navcomp.getTransitsTo(this.dest);
        }

        return this.transit_cache[this.dest];
      },

      transit: function() {
        if (this.plan) {
          return this.plan;
        }

        if (this.dest && this.transits.length > 0) {
          return this.transits[this.index];
        }

        return;
      },

      path: function() {
        const transit = this.transit;

        if (transit) {
          const points = transit.path.map(p => {return this.point(p.position.point)});
          const path   = [];

          let each = 1;
          while (points.length / each > 100) {
            each += 3;
          }

          for (let i = 0; i < points.length; i += each) {
            path.push( points[i] );
          }

          if (points.length % each != 0) {
            path.push( points[ points.length - 1 ] );
          }

          return path;
        }
      },

      targetPath: function() {
        const transit = this.transit;

        if (transit) {
          const path     = [];
          const filtered = this.filterPath(System.orbit_by_turns(transit.dest));
          const points   = this.points(filtered);

          for (const [turn, point] of points) {
            if (turn > transit.turns) {
              break;
            }

            path.push(point);
          }

          return path;
        }
      },
    },

    methods: {
      setView: function(view) {
        this.show = view;
      },

      resize:  function() { this.width = plotWidth() },
      adjustX: function(n, offset=true) { return scaleX(n, this.zero(), this.scale, offset ? this.offsetX : 0) },
      adjustY: function(n, offset=true) { return scaleY(n, this.zero(), this.scale, offset ? this.offsetY : 0) },

      zero: function() {
        // subtract two for border width
        return (this.width - 2) / 2;
      },

      point: function(pos, offset=true) {
        return [ this.adjustX(pos[0], offset), this.adjustY(pos[1], offset) ];
      },

      points: function*(path) {
        for (const [turn, point] of path) {
          yield [ turn, this.point(point) ];
        }
      },

      filterPath: function*(path) {
        const min = this.scale * Physics.AU / 30;
        let mark = path[0];

        yield [0, path[0]];

        for (let i = 1; i < path.length - 1; ++i) {
          // Distance from last visible plotted point is greater than minimum
          // resolution.
          if (Physics.distance(mark, path[i]) > min) {
            yield [i, path[i]];
            mark = path[i];
          }
        }

        yield [path.length - 1, path[path.length - 1]];
      },

      bodies: function() {
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

      setDest: function(body, target) {
        this.show = 'map';

        if (this.plan) {
          return;
        }

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

      transitCenterPoint() {
        const transit = this.transit;

        if (transit) {
          return transit.path[Math.ceil(transit.turns / 2)].position.point;
        }

        return;
      },

      autoScale: function() {
        const center = this.centerPoint;

        const rels = [
          Physics.AU,
          Physics.distance(center, [0, 0, 0]),
          Physics.distance(center, System.position(this.origin)),
        ];

        if (this.transit) {
          for (const p of this.transit.path) {
            rels.push( Physics.distance(center, p.position.point) );
          }
        }

        const scale = Math.max(...rels) / Physics.AU * 1.2;
        this.setScale(util.R(Math.min(Math.max(scale, SCALE_MIN_AU), SCALE_MAX_AU), 3));
      },

      center: function() {
        const z = this.zero();
        const [x, y] = this.point(this.centerPoint, false);
        this.offsetX = z - x;
        this.offsetY = z - y;
        this.initX   = this.offsetX;
        this.initY   = this.offsetY;
      },

      setTarget: function(focus, fov) {
        const center = focus == 'path' ? this.transitCenterPoint()
                     : focus == 'sun'  ? [0, 0, 0]
                     : focus           ? System.position(focus)
                                       : System.position(game.locus);

        const point = this.point(center, false);
        const zero  = this.zero();

        this.initX = this.offsetX = zero - point[0];
        this.initY = this.offsetY = zero - point[1];

        if (fov) {
          this.setScale(util.R(Math.min(Math.max(fov, SCALE_MIN_AU), SCALE_MAX_AU), 3));
        } else {
          this.autoScale();
        }
      },

      beginTransit: function() {
        $('#spacer').data('info', this.transit);
        game.open('transit');
        $('#spacer').data('state', 'transit');
      },

      onMenuClosed: function(opt) {
        if (opt.all_routes != this.all_routes) {
          this.show_all = opt.all_routes;
          this.fuel     = opt.fuel;
          this.index    = 0;
          this.navcomp  = new NavComp(this.fuel, this.show_all);
        }

        if (this.dest != opt.dest) {
          this.setDest(opt.dest, !!opt.focus);
        }

        this.setTarget(opt.focus, opt.fov);

        this.show = opt.view;
        this.legend = opt.legend;
        this.relprices = opt.relprices;
      },
    },

    template: `
<card id="map-root" nopad=1>
  <card-header>
    <h3>
      NavComp
      <btn @click="beginTransit" v-if="transit">Engage</btn>
      <btn @click="show='menu'"  v-if="controls">Menu</btn>
    </h3>
  </card-header>


  <plot-menu
    v-if="show=='menu'"
    @close="onMenuClosed"
    :dest="dest"
    :fov="scale"
    :legend="legend"
    :relprices="relprices"
    :show_all="show_all"
    :fuel="fuel" />


  <card v-if="show=='info'">
    <card-subtitle>
      Showing
      <span v-if="relprices">relative</span>
      <span v-else>absolute</span>
      prices on {{dest|caps}}
    </card-subtitle>

    <planet-summary mini=true :planet="planet" class="p-3" />
  </card>


  <market-report
    v-if="show=='market'"
    :relprices="relprices"
    :body="dest"
    class="m-3 p-1 bg-black" />


  <div v-resizable
       v-show="show=='map'"
       id="plot-root"
       class="plot-root p-0 m-0"
       :style="{'position': 'relative', 'width': width + 'px', 'height': width + 'px'}">

    <plot-planet
      key="sun"
      name="sun"
      :zero="zero()"
      :scale="scale"
      :offsetX="offsetX"
      :offsetY="offsetY"
      :max="width"
      color="yellow"
      no_label=true />

    <plot-planet v-for="(pos, name) of bodies()"
      :pos="pos"
      :key="name"
      :name="name"
      :zero="zero()"
      :scale="scale"
      :offsetX="offsetX"
      :offsetY="offsetY"
      :max="width"
      :yes_label="name == origin || name == dest"
      @click="setDest(name)" />

    <plot-point v-for="(p, idx) in path"
        :key="'path-' + idx"
        v-if="path"
        :pos="p"
        :max="width"
        :style="{'font-size': 0.75+'rem'}"
        :class="plan ? 'text-muted' : 'text-success'">
      .
    </plot-point>

    <plot-point v-for="(p, idx) in targetPath"
        :key="'target-path-' + idx"
        v-if="targetPath"
        :pos="p"
        :max="width"
        :style="{'font-size': 0.75+'rem'}"
        class="text-danger">
      .
    </plot-point>

    <plot-point
        v-if="transit"
        key="dest"
        :pos="point(transit.end)"
        :max="width"
        class="text-warning">
      &target;
    </plot-point>

    <plot-point
        v-if="focus"
        label="Ship"
        key="focus"
        :pos="point(focus)"
        :max="width"
        class="text-success">
      &#9652
    </plot-point>

    <plot-transit-legend
      v-if="controls && legend"
      :dest="dest"
      :scale="scale"
      :transit="transit"
      :fuel="fuel" />
  </div>

  <slider
    v-if="controls && dest && show=='map'"
    @change="center"
    id="transit-time"
    class="my-1"
    :style="{'width': width + 'px'}"
    slot="def"
    :value.sync="index"
    step=1
    min=0
    :max="transits.length- 1" />
</card>
    `,
  });

});
