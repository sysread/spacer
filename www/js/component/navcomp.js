define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const Physics = require('physics');
  const util    = require('util');
  const Layout  = require('layout');
  const NavComp = require('navcomp');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/modal');
  require('component/commerce');
  require('component/summary');


  Vue.component('NavComp', {
    mixins: [ Layout.LayoutMixin ],

    data() {
      return {
        show:    'home',
        dest:    null,
        rel:     false,
        transit: null,
        confirm: false,
        layout_target_id: 'navcomp-map-root',
        layout_scaling: true,
      };
    },

    watch: {
      dest() { this.transit = null },
    },

    computed: {
      show_home_menu() { return this.show == 'home'   },
      show_dest_menu() { return this.show == 'dest'   },
      show_map()       { return this.show == 'map'    },
      show_info()      { return this.show == 'info'   },
      show_market()    { return this.show == 'market' },
      show_routes()    { return this.show == 'routes' },

      planet() {
        if (this.dest) {
          return this.game.planets[this.dest];
        }
      },

      map_center_point() {
        const points = [ [0, 0], this.system.position(this.game.locus) ];

        if (this.dest) {
          points.push(this.system.position(this.dest));
        }

        return Physics.centroid(...points);
      },

      map_fov_au() {
        if (this.transit) {
          return this.transit.segment_au;
        }

        const bodies = [
          this.system.position(this.game.locus),
        ];

        if (this.dest) {
          bodies.push(this.system.position(this.dest));
        }

        const orbits = bodies.map(b => Physics.distance(b, [0, 0]));
        const max = Math.max(...orbits);
        const fov = (max + (Physics.AU / 2)) / Physics.AU;
        return fov;
      },
    },

    methods: {
      go_home_menu() { this.show = 'home'   },
      go_dest_menu() { this.show = 'dest'   },
      go_map()       { this.show = 'map'    },
      go_info()      { this.show = 'info'   },
      go_market()    { this.show = 'market' },
      go_routes()    { this.show = 'routes' },

      is_here(body) {
        return body == this.game.locus;
      },

      set_transit(transit, go_home) {
        this.transit = transit;

        if (go_home) {
          this.go_home_menu();
        }
      },

      set_transit_return(transit) {
        this.set_transit(transit, true);
      },

      set_dest(dest, go_home) {
        if (!this.is_here(dest)) {
          this.dest = dest;
        }

        if (go_home) {
          this.go_home_menu();
        }
      },

      set_dest_return(dest) {
        this.set_dest(dest, true);
      },

      next_dest() {
        let done = false;

        for (let i = 0; i < this.system.bodies().length; ++i) {
          if (this.dest == this.system.bodies()[i]) {
            for (let j = i; j < this.system.bodies().length; ++j) {
              const idx = j + 1 == this.system.bodies().length ? 0 : j + 1;

              if (this.is_here(this.system.bodies()[idx])) {
                continue;
              }
              else {
                this.dest = this.system.bodies()[idx];
                done = true;
                return this.dest;
              }
            }
          }
        }

        if (!done) {
          this.dest = this.system.bodies()[this.game.locus == this.system.bodies()[0] ? 1 : 0];
          return this.dest;
        }
      },

      confirm_transit(yes) {
        this.confirm = false;

        if (yes) {
          $('#spacer').data('info', this.transit);
          this.$emit('open', 'transit');
          this.game.freeze = true;
        }
      },
    },

    template: `
      <card id="navcomp" nopad=1>
        <card-header class="px-0">
          <h3 class="p-2">
            NavComp

            <btn v-if="!show_home_menu" @click="go_home_menu">
              Back
            </btn>

            <btn @click="confirm=true" v-if="transit" right=1 class="mx-1">
              Launch
            </btn>
          </h3>
        </card-header>

        <div class="p-2" v-if="!show_map">
          <Menu title="Navigation" v-show="show_home_menu">
            <Opt @click="go_dest_menu">
              <span v-if="!dest">
                Set destination
              </span>
              <span v-else>
                Change destination
                <badge right=1>{{dest|caps}}</badge>
              </span>
            </Opt>

            <Opt @click="go_routes" :disabled="!dest">
              <span v-if="!transit">
                Plan route
              </span>
              <span v-else>
                Modify route
                <badge right=1 v-if="transit">{{transit.str_arrival}}</badge>
              </span>
            </Opt>

            <Opt @click="go_map">System map</Opt>

            <Opt @click="go_info" :disabled="!dest">System info</Opt>
            <Opt @click="go_market" :disabled="!dest">Market prices</Opt>
          </Menu>

          <NavDestMenu
              title="Select a destination"
              v-if="show_dest_menu"
              :prev="dest"
              @answer="set_dest_return" />

          <NavRoutePlanner
              v-if="show_routes"
              :dest="dest"
              @route="set_transit_return" />

          <div v-if="show_market">
            <Menu>
              <NavDestOpt @answer="next_dest" :body="dest" />
              <Opt @click="rel=false" v-if="rel">Relative prices</Opt>
              <Opt @click="rel=true" v-if="!rel">Absolute prices</Opt>
            </Menu>

            <market-report :relprices="rel" :body="dest" />
          </div>

          <div v-if="show_info">
            <Menu>
              <NavDestOpt @answer="next_dest" :body="dest || next_dest()" />
            </Menu>
            <planet-summary mini=true :planet="planet" />
          </div>
        </div>

        <confirm v-if="confirm" yes="Yes" no="No" @confirm="confirm_transit">
          <h3>Confirm trip details</h3>
          <def split=4 term="Origin"      :def="transit.origin|caps" />
          <def split=4 term="Destination" :def="transit.dest|caps" />
          <def split=4 term="Duration"    :def="transit.str_arrival" />
          <def split=4 term="Fuel"        :def="transit.fuel|R(2)|unit('tonnes')" />
        </confirm>

        <NavPlot v-if="show_map"
                 v-layout
                 :layout="layout"
                 :style="layout_css_dimensions"
                 :transit="transit">

          <NavBodies slot="svg"
                     :layout="layout"
                     :focus="dest" />

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
        {{name}}

        <span v-if="is_here" class="m-1 text-warning font-weight-bold">&#128907;</span>

        <slot />

        <badge right=1 class="ml-1">{{dist}}</badge>
        <badge right=1 class="ml-1 d-none d-sm-inline">{{faction}}</badge>
        <badge right=1 v-if="is_moon" class="ml-1">{{kind}}</badge>
      </Opt>
    `,
  });


  Vue.component('NavDestMenu', {
    'props': ['prev', 'title'],

    'computed': {
      bodies() { return this.system.bodies() },
    },

    'methods': {
      on_answer(dest) {
        this.$emit('answer', dest);
      },
    },

    'template': `
      <Menu title="Select a destination">
        <NavDestOpt v-for="body in bodies" :key="body" :body="body" @answer="on_answer">
          <span v-if="body == prev" class="m-1 text-warning font-weight-bold">&target;</span>
        </NavDestOpt>
      </Menu>
    `,
  });


  Vue.component('NavRoutePlanner', {
    'props': ['dest'],

    data() {
      return {
        'selected': 0,
        'navcomp':  new NavComp,
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
          <def split="4" term="Total"        :def="distance|R(2)|unit('AU')" />
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
             + this.layout.width_px;
      },
    },

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

    'methods': {
      svg_path() {
        const path = this.points.map(p => p.map(n => Math.ceil(n)).join(' '));

        let cmd = [ `M${path[0]}` ];

        let i = 1;
        for (i = 0; i + 1 < path.length; ++i) {
          const p1 = path[i];
          const p2 = path[i + 1];
          cmd.push(`Q${p1}, ${p2}`);
        }

        if (i < path.length) {
          for (i; i < path.length; ++i) {
            cmd.push(`L${path[i]}`);
          }
        }

        return cmd.join(' ');
      },

    },

    'template': `
      <path fill="none"
        :stroke="color"
        stroke-width="0.5px"
        :d="svg_path()" />
    `,
  });


  Vue.component('SvgDestinationPath', {
    props: ['transit', 'color', 'layout'],

    computed: {
      path() {
        if (this.transit) {
          return this.layout.scale_path(
            this.system
              .orbit_by_turns(this.transit.dest)
              .slice(0, this.transit.left + 1)
          );
        }
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
    props: ['label', 'pos', 'diameter', 'img'],
    template: `
      <g>
        <image ref="img" v-if="img" :xlink:href="img" :height="diameter" :width="diameter" :x="pos[0]" :y="pos[1]" />

        <text ref="lbl" v-show="label" style="font:12px monospace; fill:#EEEEEE;" :x="pos[0]+diameter+10" :y="pos[1]+diameter/2">
          {{label|caps}}
        </text>
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

          for (const body of this.bodies) {
            const d = this.diameter(body);
            const p = this.layout.scale_point( this.system.position(body, t) );
            p[0] -= d / 2;
            p[1] -= d / 2;

            bodies[body] = {
              point:    p,
              diameter: d,
              label:    this.show_label(body),
            };
          }

          const d_sun = this.diameter('sun');
          const p_sun = this.layout.scale_point([0, 0]);
          p_sun[0] -= d_sun / 2;
          p_sun[1] -= d_sun / 2;

          bodies.sun = {
            point:    p_sun,
            diameter: d_sun,
            label:    false,
          };

          return bodies;
        }
      },
    },

    methods: {
      diameter(body) {
        const min = body == 'sun' ? 10 : this.system.central(body) != 'sun' ? 1 : 5;

        if (this.layout) {
          const d   = this.system.body(body).radius * 2;
          const w   = this.layout.width_px * (d / (this.layout.fov_au * Physics.AU));
          return Math.max(min, Math.ceil(w));
        } else {
          return min;
        }
      },

      show_label(body) {
        const central = this.system.central(body);

        if (this.focus == body && central == 'sun') {
          return true;
        }

        const position = this.system.position(body);
        const center   = central == 'sun' ? [0, 0] : this.system.position(central);
        const distance = Physics.distance(position, center) / Physics.AU;
        return distance > this.layout.fov_au / 10;
      },
    },

    template: `
      <g>
        <SvgPlotPoint
          v-for="(info, body) of plot_points"
          :key="body"
          :layout="layout"
          :label="info.label ? body : ''"
          :diameter="info.diameter"
          :pos="info.point"
          :img="'img/' + body + '.png'" />
      </g>
    `,
  });


  Vue.component('NavPlot', {
    props: ['transit', 'layout'],

    template: `
      <div id="navcomp-map-root" class="plot-root border border-dark">
        <SvgPlot v-if="layout" :layout="layout">
          <SvgDestinationPath v-if="transit" :layout="layout" :transit="transit" />
          <SvgTransitPath     v-if="transit" :layout="layout" :transit="transit" />
          <slot name="svg" />
        </SvgPlot>

        <slot />
      </div>
    `,
  });
});
