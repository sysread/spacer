define(function(require, exports, module) {
  "use strict"

  const Vue     = require('vendor/vue');
  const Physics = require('physics');
  const system  = require('system');
  const util    = require('util');
  const NavComp = require('navcomp').NavComp;
  const Layout  = require('component/layout');

  require('vendor/TweenMax.min');
  require('component/global');
  require('component/common');
  require('component/modal');
  require('component/commerce');
  require('component/summary');
  require('component/svg');


  function transit_display_distance(transit) {
    if (!transit)
      return;

    const au = util.R(transit.au, 2);

    if (au > 0)
      return au + ' AU';
    else
      return util.csn(util.R(transit.km, 0)) + ' km';
  }


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

      for (const contract of game.player.contracts) {
        if (contract.dest) {
          this.dest = contract.dest;
        }
      }

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
          this.transit = this.navcomp.getFastestTransitTo(this.dest) || null;
        } else {
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

      isSubSystemTransit() {
        if (this.dest) {
          const dest_central = system.central(this.dest);
          const orig_central = system.central(this.game.locus);

          if ((dest_central == orig_central && dest_central != 'sun') // moon to moon in same system
              || window.game.locus == dest_central                    // central to its own moon
              || this.dest == orig_central)                           // moon to its host planet
            return true;

          return false;
        }

        return false;
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

        if (this.isSubSystemTransit) {
          // For subsystem transits, center on the central body of the
          // subsystem, rather than the entire solar system.
          const central = dest_central == 'sun'
            ? orig_central
            : dest_central;

          bodies.push(this.system.position(central));
        }
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
        const points = [];
        const dest_central = this.system.central(this.dest);
        const orig_central = this.system.central(this.game.locus);

        if (this.isSubSystemTransit) {
          // Determine the central body of the subsystem transit
          const central = dest_central == 'sun'
            ? orig_central
            : dest_central;

          points.push(this.system.position(central));

          // Select all of the bodies orbiting that central body
          for (const body of this.system.all_bodies()) {
            if (system.central(body) == central) {
              points.push(this.system.position(body));
            }
          }
        }
        // Cross system path
        else {
          points.push(this.system.position(this.game.locus));
          points.push(this.system.position(this.dest));
        }

        if (this.transit) {
          points.push(this.transit.end);
        }

        // Lop off z to prevent it from affecting the distance calculation
        // since it's being displayed on a 2d map.
        const center    = this.map_center_point;
        const center_2d = [center[0], center[1], 0];
        const points_2d = points.map(p => [p[0], p[1], 0]);
        const distances = points_2d.map(p => Physics.distance(p, center_2d));
        const max       = Math.max(...distances);
        return 1.1 * (max / Physics.AU);
      },

      transit_display_distance() {
        return transit_display_distance(this.transit);
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
        if (this.show != 'map') {
          if (!this.transit) {
            this.dest = null;
          }

          this.show = 'map';
          this.$nextTick(() => this.layout_resize());
        }
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
      <Section id="navcomp" notitle=1>
        <div class="btn-toolbar" id="navcomp-toolbar">
          <div class="btn-group">
            <NavBtn :active="show_map" name="compass"  @click="go_map" />
            <NavBtn :active="show_dest_menu" name="planet"  @click="go_dest_menu" />
            <NavBtn :disabled="!dest" :active="show_routes" name="target" @click="go_routes" />
            <NavBtn :disabled="!dest" :active="show_info" name="summary" @click="go_info" />
            <NavBtn :disabled="!dest" :active="show_market" name="market" @click="go_market" />
            <NavBtn :disabled="!transit" :active="confirm" name="launch" @click="confirm=true" />
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

          <planet-summary v-if="show_info" :planet="planet" showtitle=1 />

          <div v-if="show_market">
            <btn block=1 v-if="rel" @click="rel=false">Relative prices</btn>
            <btn block=1 v-if="!rel" @click="rel=true">Absolute prices</btn>
            <market-report :relprices="rel" :body="dest || next_dest()" />
          </div>
        </div>

        <confirm v-if="confirm" yes="Yes" no="No" @confirm="confirm_transit">
          <h4>{{game.here.name}} to {{planet.name|caps}}</h4>
          <def split=4 term="Duration"     :def="transit.str_arrival" />
          <def split=4 term="Distance"     :def="transit_display_distance" />
          <def split=4 term="Max Velocity" :def="(transit.maxVelocity/1000)|R|csn|unit('km/s')" />
          <def split=4 term="Acceleration" :def="transit.accel_g|R(3)|unit('G')" />
          <def split=4 term="Fuel"         :def="transit.fuel|R(2)|unit('tonnes')" />
        </confirm>

        <NavPlot v-layout v-if="show_map" :layout="layout" :transit="transit" :style="layout_css_dimensions">
          <template slot="svg">
            <NavBodies :layout="layout" :focus="dest || game.locus" @click="set_dest" />
            <SvgTransitPath v-if="transit" :layout="layout" :transit="transit" />
          </template>
        </NavPlot>

      </Section>
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
      distance()       { return transit_display_distance(this.transit) },
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
          <def split="4" term="Distance"     :def="distance" />
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


  Vue.component('SvgOrbitPath', {
    props: ['layout', 'body'],

    computed: {
      path()  { return this.layout.scale_path(this.orbit) },
      color() { return '#333333' },

      orbit() {
        return this.system.orbit(this.body)
          .relativeToTime(this.game.date.getTime())
          .absolute
      },
    },

    template: `
      <SvgPath :points="path" :color="color" line="0.75px" :smooth="true" />
    `,
  });


  Vue.component('SvgTransitPath', {
    props: ['transit', 'layout'],

    computed: {
      path() {
        const points = this.transit.path.map(p => p.position);
        return this.layout.scale_path(points);
      },

      dest_path() {
        const orbit = this.system.orbit_by_turns(this.transit.dest);
        const path  = orbit.slice(0, this.transit.turns + 1);
        return this.layout.scale_path(path);
      },

      line() {
        const points = this.layout.scale_path(this.transit.path.map(p => p.position));
        return points.map(p => [p[0], p[1]]).map(p => p.join(',')).join(' ');
      },
    },

    // for troubleshooting paths:
    //    <polyline :points="line" style="fill:none; stroke:green; stroke-width:1; stroke-linejoin:round" />
    template: `
      <g>
        <SvgPath :points="dest_path" color="red" :smooth="true" />
        <SvgPath :points="path" color="green" :smooth="true" />
      </g>
    `,
  });


  Vue.component('SvgPlotPoint', {
    props: ['layout', 'body', 'label', 'img', 'focus', 'coords', 'intvl'],

    data() {
      const [x, y] = this.layout.scale_point(system.position(this.body));
      const d = this.layout.scale_body_diameter(this.body);
      return {
        x: x,
        y: y,
        d: d,
        label_x: 0,
        label_y: 0,
        tween: null,
      };
    },

    computed: {
      label_class() { return this.focus ? 'plot-label-hi' : 'plot-label' },
      diameter()    { return this.layout.scale_body_diameter(this.body) },

      point() {
        if (this.layout) {
          if (this.coords) {
            return this.layout.scale_point(this.coords);
          } else {
            return this.layout.scale_point(this.system.position(this.body))
          }
        }
        else {
          return [0, 0];
        }
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

      update() {
        const [x, y] = this.point;
        const d = this.diameter;

        if (this.tween)
          this.tween.kill();

        // this is too jerky to do in the main tween which may be killed
        //TweenMax.to(this.$data, this.intvl || 0, {d: d, ease: Linear.easeNone});

        this.tween = TweenMax.to(this.$data, this.intvl || 0, {
          d: d,
          x: x - (d / 2),
          y: y - (d / 2),
          label_x: x + d + 10,
          label_y: y + d / 3,
          ease: Linear.easeNone,
        });

        this.tween.play();
      },
    },

    watch: {
      point:    function() { this.update() },
      diameter: function() { this.update() },
    },

    template: `
      <g @click="click">
        <SvgImg v-if="img" :src="img" :height="d" :width="d" :x="x" :y="y" />

        <SvgText v-if="show_label" :class="label_class" :x="label_x" :y="label_y">
          {{body|caps}}
        </SvgText>
      </g>
    `,
  });


  Vue.component('NavBodies', {
    props: ['focus', 'layout'],

    computed: {
      fov() { return this.layout.fov_au },

      is_zoomed() {
        return this.layout.fov_au < 0.25;
      },

      bodies() {
        const seen   = {};
        const bodies = [];

        for (const body of this.system.bodies()) {
          if (!seen[body]) {
            seen[body] = true;

            if (this.is_visible(body))
              bodies.push(body);

            const central = this.system.central(body);

            if (central != 'sun' && !seen[central]) {
              seen[central] = true;

              if (this.is_visible(central))
                bodies.push(central);
            }
          }
        }

        return bodies;
      },

      plot_points() {
        if (this.layout) {
          const bodies = {};

          if (this.layout.is_visible([0, 0])) {
            const p_sun = this.layout.scale_point([0, 0]);
            const d_sun = this.layout.scale_body_diameter('sun');
            p_sun[0] -= d_sun / 2;
            p_sun[1] -= d_sun / 2;

            bodies.sun = {
              point:    p_sun,
              diameter: d_sun,
              label:    false,
            };
          }

          for (const body of this.bodies) {
            const pos = this.system.position(body);

            if (this.layout.is_visible(pos)) {
              const p = this.layout.scale_point(pos);
              const d = this.layout.scale_body_diameter(body);

              // center the point against the image
              p[0] -= d / 2;
              p[1] -= d / 2;

              bodies[body] = {
                point:    p,
                diameter: d,
                label:    this.show_label(body) ? this.system.name(body) : '',
              };
            }
          }

          return bodies;
        }
      },
    },

    methods: {
      is_visible(body) {
        const orbit = this.system.orbit(body).absolute;

        for (let i = 0; i < orbit.length; ++i) {
          if (this.layout.is_visible(orbit[i])) {
            return true;
          }
        }

        return false;
      },

      is_moon(body) {
        return this.system.central(body) != 'sun';
      },

      show_orbit(body) {
        if (this.game.options.hideOrbitPaths)
          return false;

        if (body == 'trojans')
          return false; // same as jupiter's

        if (this.is_moon(body))
          return this.is_zoomed;

        return !this.is_zoomed;
      },

      show_label(body) {
        if (this.is_focus(body))
          return true;

        const central = this.system.central(body);
        if (this.system.central(this.focus) == body)
          return false;

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
        <g v-for="body of bodies">
          <SvgOrbitPath v-if="show_orbit(body)" :key="body+'-orbit'" :body="body" :layout="layout" />
          <SvgPatrolRadius :key="body + '-patrol'" :body="body" :layout="layout" />
        </g>

        <SvgPlotPoint
          v-for="(info, body) of plot_points"
          :key="body"
          :body="body"
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


  Vue.component('SvgPatrolRadius', {
    props: ['body', 'layout', 'coords', 'intvl'],

    data() {
      const [x, y] = this.layout.scale_point(system.position(this.body));
      return {
        x: x,
        y: y,
        r: this.radius,
        tween: null,
      };
    },

    computed: {
      faction() {
        return this.data.bodies[this.body].faction;
      },

      point() {
        if (this.layout) {
          if (this.coords) {
            return this.layout.scale_point(this.coords);
          } else {
            return this.layout.scale_point(this.system.position(this.body));
          }
        }
        else {
          return [0, 0];
        }
      },

      radius_au() {
        return this.game.planets[this.body]
          ? this.game.planets[this.body].patrolRadius()
          : 0;
      },

      radius() {
        return this.layout.scale_length(this.radius_au * Physics.AU);
      },

      opacity() {
        if (this.game.options.hidePatrolRadius)
          return 0;

        if (this.radius_au > this.layout.fov_au)
          return 0;

        if (this.data.bodies[this.body]) {
          const a = 0.1 * this.data.factions[this.faction].patrol;
          return util.clamp(a, 0.1, 0.25);
        }

        return 0;
      },

      standing() {
        return this.game.player.getStanding(this.data.bodies[this.body].faction);
      },

      color() {
        if (this.game.planets[this.body] && this.game.planets[this.body].hasTradeBan)
          return 'red';

        const s = this.standing;

        if (s <= -29)
          return 'red';

        if (s < -9)
          return '#DAD49B';

        return '#60D65D';
      },
    },

    methods: {
      update() {
        const [x, y] = this.point;
        const r = this.radius;

        if (this.tween)
          this.tween.kill();

        this.tween = TweenMax.to(this.$data, this.intvl || 0, {
          x: x,
          y: y,
          r: r,
          ease: Linear.easeNone,
        });

        this.tween.play();
      },
    },

    watch: {
      point:  function() { this.update() },
      radius: function() { this.update() },
    },

    template: `
      <SvgCircle v-if="r > 0 && opacity" :cx="x" :cy="y" :r="r" :bg="color" :opacity="opacity" />
    `,
  });


  Vue.component("PlotLegend", {
    props:    ['x', 'y'],
    template: '<SvgText class="plot-legend" :x="x" :y="y"><slot /></SvgText>',
  });


  Vue.component('NavPlot', {
    props: ['layout', 'transit'],

    computed: {
      x() { return 5 },
    },

    methods: {
      y(n) { return (n * 17) },

      bg_css() {
        return {
          width:  this.layout ? this.layout.width_px  + 'px' : '100%',
          height: this.layout ? this.layout.height_px + 'px' : '100%',
        };
      },

      bg_class() {
        return {
          'plot-root-with-galaxy': !this.game.options.hideMapBackground,
        };
      },
    },

    template: `
      <div id="navcomp-map-root" class="plot-root border border-dark">
        <div class="plot-root-bg" :class="bg_class()" :style="bg_css()"></div>

        <SvgPlot v-if="layout" :width="layout.width_px" :height="layout.height_px">
          <PlotLegend :x="x" :y="y(1)">FoV:&nbsp;&nbsp;{{layout.fov_au * 2|R(4)|unit('AU')}}</PlotLegend>

          <template v-if="transit">
            <PlotLegend :x="x" :y="y(2)" style="fill: yellow">Dest.&nbsp;{{transit.dest|caps}}</PlotLegend>
            <PlotLegend :x="x" :y="y(3)">Dist.&nbsp;{{transit.segment_au|R(4)|unit('AU')}}</PlotLegend>
            <PlotLegend :x="x" :y="y(4)">&Delta;V:&nbsp;&nbsp;&nbsp;{{transit.accel_g|R(3)|unit('G')}}</PlotLegend>
            <PlotLegend :x="x" :y="y(5)">MaxV:&nbsp;{{(transit.maxVelocity/1000)|R|csn|unit('km/s')}}</PlotLegend>
            <PlotLegend :x="x" :y="y(6)">Fuel:&nbsp;{{transit.fuel|R(2)}}</PlotLegend>
            <PlotLegend :x="x" :y="y(7)">Time:&nbsp;{{transit.str_arrival}}</PlotLegend>
          </template>

          <slot name="svg" />
        </SvgPlot>

        <slot />
      </div>
    `,
  });
});
