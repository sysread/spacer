define(function(require, exports, module) {
  "use strict"

  const Vue     = require('vendor/vue');
  const Physics = require('physics');
  const util    = require('util');
  const NavComp = require('navcomp').NavComp;
  const Layout  = require('component/layout');
  const svgpath = require('svgpath');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/modal');
  require('component/commerce');
  require('component/summary');


  Vue.component('NavBtn', {
    props: ['name', 'active', 'disabled'],

    computed: {
      src()       { return 'img/' + this.name + '.png' },
      width()     { return 50                          },
      btn_width() { return 50                          },
      img_width() { return this.btn_width - 12         }, // less padding px

      btn_style() {
        const style = {
          width: this.btn_width + 'px',
          height: this.btn_width + 'px',
          padding: '0 6px 0 6px',
          border: '1px solid black',
          'background-color': '#161616',
          'border-bottom': '1px solid rgb(200,0,0)',
        };

        if (this.disabled) {
          style['background-color'] = '#202020';
        }

        if (this.active) {
          style['background-color'] = '#790000';
        }

        return style;
      },

      img_style() {
        const style = {
          width: this.img_width + 'px',
          height: this.img_width + 'px',
          filter: 'invert(100%)',
        };

        if (this.disabled) {
          style.filter += ' opacity(0.25)';
        }

        return style;
      },
    },

    template: `
      <button type="button" :style="btn_style" class="btn-dark" @click="$emit('click')" :disabled="disabled">
        <img :src="src" :style="img_style" />
      </button>
    `,
  });


  Vue.component('NavComp', {
    mixins: [ Layout ],

    data() {
      return {
        show:    'map',
        dest:    null,
        rel:     true,
        navcomp: null,
        transit: null,
        confirm: false,
        layout_target_id: 'navcomp-map-root',
        layout_scaling: true,
        is_ready: false,
      };
    },

    /*
     * This, along with data.is_ready, is an elaborate workaround to force the
     * layout to refresh its dimensions once the navbar has finished
     * collapsing. The collapsing navbar prevents the layout from getting an
     * accurate size of the navbar's height, which would otherwise cause the
     * view port for the nav map to be shortened by whatever the mid-collapse
     * navbar's height was at the time.
     */
    mounted() {
      this.navcomp = new NavComp(this.game.player, game.locus);

      if ($('#spacer-nav').hasClass('collapsing')) {
        $('#spacer-nav').one('hidden.bs.collapse', () => {
          this.is_ready = true;
        });
      }
      else {
        this.is_ready = true;
      }
    },

    watch: {
      dest() {
        if (this.dest) {
          const transits = this.navcomp.getTransitsTo(this.dest);

          if (transits.length > 0) {
            this.transit = transits[0];
          }
        }
        else {
          this.transit = null;
        }

        this.layout_resize();
      },

      is_ready() {
        if (this.is_ready && this.show == 'map') {
          this.$nextTick(() => {
            this.layout.update_width();
          });
        }
      },

      layout() {
        if (this.show == 'map') {
          this.$nextTick(() => {
            this.layout.update_width();
          });
        }
      },
    },

    computed: {
      show_map()       { return this.show == 'map' },
      show_dest_menu() { return this.show == 'dest' },
      show_info()      { return this.show == 'info' },
      show_market()    { return this.show == 'market' },
      show_routes()    { return this.show == 'routes' },

      planet() {
        const dest = this.dest || this.next_dest();
        return this.game.planets[dest];
      },

      map_center_point() {
        if (this.dest) {
          return this.map_center_point_transit;
        }

        const central = this.system.central(this.game.locus);
        const is_moon = central != 'sun';
        return is_moon ? this.system.position(central) : [0, 0];
      },

      map_center_point_transit() {
        let center;

        const dest_central = this.system.central(this.dest);
        const orig_central = this.system.central(this.game.locus);
        const bodies = [];

        // Moon to moon in same system
        if (dest_central == orig_central && dest_central != 'sun') {
          bodies.push(this.system.position(dest_central));
        }
        // Planet to its own moon
        else if (this.game.locus == dest_central) {
          bodies.push(this.system.position(this.game.locus));
        }
        // Moon to it's host planet
        else if (this.dest == orig_central) {
          bodies.push(this.system.position(this.dest));
        }
        // Cross system path
        else {
          bodies.push(this.system.position(this.dest));
          bodies.push(this.system.position(this.game.locus));
        }

        // Figure in transit
        if (this.transit) {
          bodies.push(this.transit.flip_point);
          bodies.push(this.transit.start);
          bodies.push(this.transit.end);
        }

        return Physics.centroid(...bodies);
      },

      map_fov_au() {
        if (this.dest) {
          return this.map_fov_au_transit;
        }

        const distance = this.system.distance(this.game.locus, 'sun');
        return distance / Physics.AU * 1.5;
      },

      map_fov_au_transit() {
        let center = this.map_center_point;
        const points = [];

        const dest_central = this.system.central(this.dest);
        const orig_central = this.system.central(this.game.locus);

        // Moon to moon in same system
        if (dest_central == orig_central && dest_central != 'sun') {
          for (const body of this.system.bodies()) {
            if (this.system.central(body) == dest_central) {
              points.push(this.system.position(body));
            }
          }
        }
        // Planet to its own moon
        else if (this.game.locus == dest_central) {
          for (const body of this.system.bodies()) {
            if (this.system.central(body) == dest_central) {
              points.push(this.system.position(body));
            }
          }
        }
        // Moon to it's host planet
        else if (this.dest == orig_central) {
          for (const body of this.system.bodies()) {
            if (this.system.central(body) == orig_central) {
              points.push(this.system.position(body));
            }
          }
        }
        // Cross system path
        else {
          points.push(this.system.position(this.game.locus));
          points.push(this.system.position(this.dest));
        }

        const max = Math.max(...points.map(p => Physics.distance(p, center)));
        return max / Physics.AU * 1.2;
      },
    },

    methods: {
      layout_set() {
        this.reflow_plot();
      },

      layout_resize() {
        this.reflow_plot();
      },

      reflow_plot() {
        this.layout.set_center(this.map_center_point);
        this.layout.set_fov_au(this.map_fov_au);
      },

      go_map() {
        if (!this.transit) {
          this.dest = null;
        }

        this.show = 'map';
        this.$nextTick(() => this.layout_resize());
      },

      go_dest_menu()   { this.show = 'dest' },
      go_info()        { this.show = 'info' },
      go_market()      { this.show = 'market' },
      go_routes()      { this.show = 'routes' },
      is_here(body)    { return body == this.game.locus },
      is_moon(body)    { return this.is_moon_of(body) != 'sun' },
      is_moon_of(body) { return this.system.central(body) },

      set_transit(transit, go_home) {
        this.transit = transit;

        if (go_home) {
          this.go_map();
        }
      },

      set_transit_return(transit) {
        this.set_transit(transit, true);
      },

      set_dest(dest) {
        // Player clicked on central body from wide fov; find the next dest for
        // that sub-system.
        if (!dest
         || !this.data.bodies.hasOwnProperty(dest)
         || this.dest == dest
         || this.game.locus == dest)
        {
          if (this.system.central(dest) != 'sun') {
            dest = this.system.central(dest);
          }

          dest = this.next_dest(dest);
        }

        if (!this.is_here(dest)) {
          this.dest = dest;
          this.transit = null;

          if (this.dest) {
            // Select the first transit path for that destination
            this.transit = this.navcomp.getFastestTransitTo(this.dest);

            if (this.transit) {
              this.go_map();
            }
            else {
              this.go_routes();
            }
          }
        }
      },

      next_dest(system) {
        const bodies = system
          ? this.system.bodies().filter((b) => this.system.central(b) == system)
          : this.system.bodies();

        if (this.data.bodies.hasOwnProperty(system)) {
          bodies.push(system);
        }

        let done = false;

        for (let i = 0; i < bodies.length; ++i) {
          if (this.dest == bodies[i]) {
            for (let j = i; j < bodies.length; ++j) {
              const idx = j + 1 == bodies.length ? 0 : j + 1;

              if (this.is_here(bodies[idx])) {
                continue;
              }
              else {
                this.dest = bodies[idx];
                done = true;
                return this.dest;
              }
            }
          }
        }

        if (!done) {
          this.dest = bodies[this.game.locus == bodies[0] ? 1 : 0];
          return this.dest;
        }
      },

      confirm_transit(yes) {
        this.confirm = false;

        if (yes) {
          this.game.set_transit_plan(this.transit);
          this.$emit('open', 'transit');
          this.game.freeze();
        }
      },
    },

    template: `
      <card id="navcomp" nopad=1>
        <div class="btn-toolbar" id="navcomp-toolbar">
          <div class="btn-group">
            <NavBtn :active="show_map" name="compass"  @click="go_map" />
            <NavBtn :active="show_dest_menu" name="planet"  @click="go_dest_menu" />
            <NavBtn :disabled="!dest" :active="show_routes" name="target" @click="go_routes" />
            <NavBtn :disabled="!dest" :active="show_info" name="summary" @click="go_info" />
            <NavBtn :disabled="!dest" :active="show_market" name="market"  @click="go_market" />
            <NavBtn :disabled="!transit" :active="confirm" name="launch"  @click="confirm=true" />
          </div>
        </div>

        <div class="p-2" v-if="!show_map">
          <NavDestMenu
              title="Select a destination"
              v-if="show_dest_menu"
              :prev="dest"
              @answer="set_dest" />

          <NavRoutePlanner
              v-if="show_routes"
              :dest="dest || next_dest()"
              :navcomp="navcomp"
              @route="set_transit_return" />

          <div v-if="show_info">
            <h5>{{planet.name}}</h5>
            <planet-summary :planet="planet" />
          </div>

          <div v-if="show_market">
            <btn block=1 v-if="rel" @click="rel=false">Relative prices</btn>
            <btn block=1 v-if="!rel" @click="rel=true">Absolute prices</btn>
            <market-report :relprices="rel" :body="dest || next_dest()" />
          </div>
        </div>

        <confirm v-if="confirm" yes="Yes" no="No" @confirm="confirm_transit">
          <h4>{{game.here.name}} to {{planet.name|caps}}</h4>
          <def split=4 term="Duration"     :def="transit.str_arrival" />
          <def split=4 term="Distance"     :def="transit.auRemaining()|R(2)|unit('AU')" />
          <def split=4 term="Max Velocity" :def="(transit.maxVelocity/1000)|R|csn|unit('km/s')" />
          <def split=4 term="Fuel"         :def="transit.fuel|R(2)|unit('tonnes')" />
        </confirm>

        <NavPlot v-layout v-if="show_map" :layout="layout" :transit="transit" :style="layout_css_dimensions">
          <template slot="svg">
            <NavBodies :layout="layout" :focus="dest || game.locus" @click="set_dest" />
            <SvgTransitPath v-if="transit" :layout="layout" :transit="transit" />
            <SvgDestinationPath v-if="transit" :layout="layout" :transit="transit" :body="transit.dest" :turns="transit.left+1" />
          </template>
        </NavPlot>

      </card>
    `,
  });


  Vue.component('NavDestOpt', {
    'props': ['body'],

    'computed': {
      name()    { return this.system.name(this.body)           },
      faction() { return this.system.faction(this.body)        },
      central() { return this.system.central(this.body)        },
      kind()    { return this.system.kind(this.body)           },
      is_moon() { return this.system.type(this.body) == 'moon' },
      is_here() { return this.game.locus == this.body          },

      dist() {
        const p0 = this.system.position(this.game.locus);
        const p1 = this.system.position(this.body);
        const d  = Physics.distance(p0, p1);

        if (d < Physics.AU * 0.01) {
          return util.csn(util.R(d / 1000)) + ' km';
        } else {
          return util.R(d / Physics.AU, 2) + ' AU';
        }
      },

      color() {
        let color;

        switch (this.faction) {
          case 'UN':     color = 'text-success';   break;
          case 'MC':     color = 'text-danger';    break;
          case 'JFT':    color = 'text-warning';   break;
          case 'TRANSA': color = 'text-secondary'; break;
          case 'CERES':  color = 'text-info';      break;
          default:       color = '';               break;
        }

        return color;
      },
    },

    'template': `
      <Opt :val="body" final=1 :disabled="is_here" :class="color">
        <Flag :width="35" :faction="faction" class="m-1 d-none d-sm-inline" />

        <span class="d-inline d-sm-none">{{body|caps}}</span>
        <span class="d-none d-sm-inline">{{name}}</span>

        <slot />

        <badge right=1 class="ml-1">{{dist}}</badge>
        <badge right=1 v-if="is_moon" class="ml-1">{{kind}}</badge>
      </Opt>
    `,
  });


  Vue.component('NavDestMenu', {
    'props': ['prev', 'title'],

    'computed': {
      bodies() { return this.system.bodies() },
    },

    'template': `
      <Menu title="Select a destination">
        <NavDestOpt v-for="body in bodies" :key="body" :body="body" @answer="$emit('answer', body)">
          <span v-if="body == prev" class="m-1 text-warning font-weight-bold">&target;</span>
        </NavDestOpt>
      </Menu>
    `,
  });


  Vue.component('NavRoutePlanner', {
    'props': ['dest', 'navcomp'],

    data() {
      return {
        'selected': 0,
      };
    },

    'computed': {
      home()           { return this.game.player.home },
      gravity()        { return this.game.player.homeGravity },
      max_accel()      { return this.game.player.maxAcceleration() / Physics.G },
      ship_accel()     { return this.game.player.shipAcceleration() / Physics.G },
      ship_mass()      { return this.game.player.ship.currentMass() },
      ship_fuel()      { return this.game.player.ship.fuel },
      ship_burn_time() { return this.game.player.ship.maxBurnTime() * this.data.hours_per_turn },
      transits()       { return this.navcomp.getTransitsTo(this.dest) },
      has_route()      { return this.transits.length > 0 },
      num_routes()     { return this.transits.length },
      transit()        { if (this.has_route) return this.transits[this.selected] },
      distance()       { if (this.has_route) return this.transit.au },
    },

    'template': `
      <div>
        <p>
          Your navigational computer automatically calculates the optimal
          trajectory from your current location to the other settlements in the
          system.
        </p>

        <p>
          Being born on {{home|caps}}, your body is adapted to
          {{gravity|R(2)}}G, allowing you to endure a maximum sustained burn of
          {{max_accel|R(2)}}G.
        </p>

        <p>
          Carrying {{ship_mass|R|csn|unit('metric tonnes')}}, your ship is
          capable of {{ship_accel|R(2)|unit('G')}} of acceleraction. With
          {{ship_fuel|R(2)|csn}} tonnes of fuel, your ship has a maximum burn
          time of {{ship_burn_time|R|csn}} hours at maximum thrust.
        </p>

        <div v-if="has_route">
          <def split="4" term="Destination"  :def="transit.dest|caps" />
          <def split="4" term="Distance"     :def="distance|R(2)|unit('AU')" />
          <def split="4" term="Acceleration" :def="transit.accel_g|R(3)|unit('G')" />
          <def split="4" term="Max velocity" :def="(transit.maxVelocity/1000)|R|csn|unit('km/s')" />
          <def split="4" term="Fuel"         :def="transit.fuel|R(2)|unit('tonnes')" />
          <def split="4" term="Time"         :def="transit.str_arrival" />

          <row y=1>
            <cell size=12>
              <slider minmax=true step="1" min="0" :max="num_routes - 1" :value.sync="selected" />
            </cell>
          </row>

          <row y=1>
            <cell size=12>
              <btn @click="$emit('route', transit)" block=1 close=1>Select this route</btn>
            </cell>
          </row>
        </div>
        <p v-else class="text-warning font-italic">
          Your ship, as loaded, cannot reach this destination in less than 1 year with available fuel.
        </p>
      </div>
    `,
  });


  Vue.component('SvgPlot', {
    'props': ['layout'],

    'computed': {
      view_box() {
        return '0 0 '
             + this.layout.width_px
             + ' '
             + this.layout.height_px;
      },
    },

    //<image xlink:href="img/milkyway.jpg" x="0" y="0" :width="layout.width_px" :height="layout.height_px" />
    'template': `
      <svg :viewBox="view_box"
           fill="none"
           style="position:absolute;display:inline;z-index:0"
           xmlns="http://www.w3.org/2000/svg"
           xmlns:xlink="http://www.w3.org/1999/xlink">
        <slot />
      </svg>
    `
  });


  Vue.component('SvgPath', {
    'props': ['points', 'color'],

    'computed': {
      svg_path() {
        return svgpath(this.points);
      }
    },

    'template': `
      <path fill="none" :stroke="color" stroke-width="0.75px" :d="svg_path" />
    `,
  });


  Vue.component('SvgDestinationPath', {
    props: ['color', 'layout', 'body', 'turns', 'transit'],

    computed: {
      path() {
        const path = this.system.orbit_by_turns(this.body).slice(0, this.turns);
        return this.layout.scale_path(path);
      },
    },

    template: `
      <SvgPath :points="path" :color="color || '#8B8B8B'" />
    `,
  });


  Vue.component('SvgTransitPath', {
    props: ['transit', 'color', 'layout'],

    computed: {
      path() {
        if (this.transit) {
          const path = [];

          path.push(this.layout.scale_point(this.system.position(this.transit.origin)));

          for (let i = this.transit.currentTurn; i < this.transit.turns; ++i) {
            path.push(this.layout.scale_point(this.transit.path[i].position));
          }

          return path;
        }
      },
    },

    template: `
      <SvgPath :points="path" :color="color || '#A01B1B'" />
    `,
  });


  Vue.component('SvgPlotPoint', {
    props: ['layout', 'label', 'pos', 'diameter', 'img', 'focus'],

    computed: {
      label_x() { return this.pos[0] + this.diameter + 10 },
      label_y() { return this.pos[1] + this.diameter / 3  },

      text_style() {
        return {
          'font': '14px monospace',
          'fill': this.focus ? '#7FDF3F' : '#EEEEEE',
        };
      },

      show_label() {
        if (this.label) {
          if (this.diameter >= this.layout.width_px * 0.75) {
            return false;
          }

          return true;
        }

        return false;
      },
    },

    methods: {
      click() {
        this.$emit('click');
      },
    },

    template: `
      <g @click="click">
        <image v-if="img" :xlink:href="img" :height="diameter" :width="diameter" :x="pos[0]" :y="pos[1]" />
        <text v-show="show_label" :style="text_style" :x="label_x" :y="label_y">{{label|caps}}</text>
      </g>
    `,
  });


  Vue.component('NavBodies', {
    props: ['focus', 'layout'],

    computed: {
      fov() { return this.layout.fov_au },

      bodies() {
        const seen   = {};
        const bodies = [];

        for (const body of this.system.bodies()) {
          if (!seen[body]) {
            seen[body] = true;
            bodies.push(body);

            const central = this.system.central(body);
            if (central != 'sun' && !seen[central]) {
              seen[central] = true;
              bodies.push(central);
            }
          }
        }

        return bodies;
      },

      plot_points() {
        if (this.layout) {
          const t = this.system.system.time;
          const bodies = {};

          const d_sun = this.layout.scale_body_diameter('sun');
          const p_sun = this.layout.scale_point([0, 0]);
          p_sun[0] -= d_sun / 2;
          p_sun[1] -= d_sun / 2;

          bodies.sun = {
            point:    p_sun,
            diameter: d_sun,
            label:    false,
            patrol:   0,
          };

          for (const body of this.bodies) {
            const d = this.layout.scale_body_diameter(body);
            const p = this.layout.scale_point( this.system.position(body, t) );
            p[0] -= d / 2;
            p[1] -= d / 2;

            const patrol_radius = this.game.planets[body]
              ? this.game.planets[body].patrolRadius() * Physics.AU
              : 0;

            bodies[body] = {
              point:    p,
              diameter: d,
              label:    this.show_label(body) ? this.system.name(body) : '',
              patrol:   this.layout.scale_length(patrol_radius),
            };
          }

          return bodies;
        }
      },
    },

    methods: {
      show_label(body) {
        const central = this.system.central(body);

        if (this.focus == body) {
          return true;
        }

        if (this.system.central(this.focus) == body) {
          return false;
        }

        const position = this.system.position(body);
        const center   = central == 'sun' ? [0, 0] : this.system.position(central);
        const distance = Physics.distance(position, center) / Physics.AU;
        return distance > this.layout.fov_au / 5;
      },

      is_focus(body) {
        return body == this.focus;
      },

      click(body) {
        this.$emit('click', body);
      },
    },

    template: `
      <g>
        <circle
          v-for="(info, body) of plot_points"
          v-if="info.patrol > 0"
          :key="body + '_patrol_radius'"
          :cx="info.point[0]"
          :cy="info.point[1]"
          :r="info.patrol"
          stroke="green"
          stroke-width="0.5"
          fill="green"
          fill-opacity="0.025" />

        <SvgPlotPoint
          v-for="(info, body) of plot_points"
          :key="body"
          :layout="layout"
          :label="info.label"
          :diameter="info.diameter"
          :pos="info.point"
          :img="'img/' + body + '.png'"
          :focus="is_focus(body)"
          @click="click(body)" />
      </g>
    `,
  });


  Vue.component('NavPlot', {
    props: ['layout', 'transit'],

    methods: {
      bg_css() {
        return {
          width:  this.layout ? this.layout.width_px  + 'px' : '100%',
          height: this.layout ? this.layout.height_px + 'px' : '100%',
        };
      },
    },

    template: `
      <div id="navcomp-map-root" class="plot-root border border-dark">
        <div class="plot-root-bg" :style="bg_css()"></div>

        <SvgPlot v-if="layout" :layout="layout">
          <text style="fill:red;font:12px monospace" x=5 y=17>FoV:&nbsp;&nbsp;{{layout.fov_au * 2|R(4)|unit('AU')}}</text>
          <text v-if="transit" style="fill:red;font:12px monospace" x=5 y=34>Dest.&nbsp;{{transit.dest|caps}}</text>
          <text v-if="transit" style="fill:red;font:12px monospace" x=5 y=51>Dist.&nbsp;{{transit.segment_au|R(4)|unit('AU')}}</text>
          <text v-if="transit" style="fill:red;font:12px monospace" x=5 y=68>&Delta;V:&nbsp;&nbsp;&nbsp;{{transit.accel_g|R(3)|unit('G')}}</text>
          <text v-if="transit" style="fill:red;font:12px monospace" x=5 y=85>MaxV:&nbsp;{{(transit.maxVelocity/1000)|R|csn|unit('km/s')}}</text>
          <text v-if="transit" style="fill:red;font:12px monospace" x=5 y=102>Fuel:&nbsp;{{transit.fuel|R(2)}}</text>
          <text v-if="transit" style="fill:red;font:12px monospace" x=5 y=119>Time:&nbsp;{{transit.str_arrival}}</text>

          <slot name="svg" />
        </SvgPlot>

        <slot />
      </div>
    `,
  });
});
