define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const System  = require('system');
  const Physics = require('physics');
  const util    = require('util');
  const data    = require('data');
  const Layout  = require('layout');
  const NavComp = require('navcomp');

  require('component/common');
  require('component/card');
  require('component/modal');
  require('component/commerce');
  require('component/summary');

  const BODIES = System.bodies();


  Vue.component('NavDestOpt', {
    'props': ['body'],

    'computed': {
      name()    { return System.name(this.body)           },
      faction() { return System.faction(this.body)        },
      central() { return System.central(this.body)        },
      kind()    { return System.kind(this.body)           },
      is_moon() { return System.type(this.body) == 'moon' },
      is_here() { return game.locus == this.body          },

      dist() {
        const p0 = System.position(game.locus);
        const p1 = System.position(this.body);
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
      bodies() { return BODIES },
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


  Vue.component('NavComp', {
    'props': [],

    data() {
      return {
        show:    'home',
        dest:    null,
        rel:     false,
        transit: null,
      };
    },

    'watch': {
      dest() {
        this.transit = null;
      },
    },

    'computed': {
      show_home_menu() { return this.show == 'home'   },
      show_dest_menu() { return this.show == 'dest'   },
      show_map()       { return this.show == 'map'    },
      show_info()      { return this.show == 'info'   },
      show_market()    { return this.show == 'market' },
      show_routes()    { return this.show == 'routes' },

      planet() {
        if (this.dest) {
          return game.planets[this.dest];
        }
      },
    },

    'methods': {
      go_home_menu() { this.show = 'home'   },
      go_dest_menu() { this.show = 'dest'   },
      go_map()       { this.show = 'map'    },
      go_info()      { this.show = 'info'   },
      go_market()    { this.show = 'market' },
      go_routes()    { this.show = 'routes' },

      is_here(body) {
        return body == game.locus;
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

        for (let i = 0; i < BODIES.length; ++i) {
          if (this.dest == BODIES[i]) {
            for (let j = i; j < BODIES.length; ++j) {
              const idx = j + 1 == BODIES.length ? 0 : j + 1;

              if (this.is_here(BODIES[idx])) {
                continue;
              }
              else {
                this.dest = BODIES[idx];
                done = true;
                return;
              }
            }
          }
        }

        if (!done) {
          this.dest = BODIES[game.locus == BODIES[0] ? 1 : 0];
          return;
        }
      },

      begin_transit() {
        $('#spacer').data('info', this.transit);
        game.open('transit');
        $('#spacer').data('state', 'transit');
      },
    },

    'template': `
      <card id="navcomp" nopad=1>
        <card-header class="px-0">
          <h3 class="p-2">
            NavComp

            <btn v-if="!show_home_menu" @click="go_home_menu">
              Back
            </btn>

            <btn @click="begin_transit" v-if="transit" right=1 class="mx-1">
              Launch
            </btn>
          </h3>
        </card-header>

        <div class="p-2" v-if="!show_map">
          <Menu title="Navigation"  v-show="show_home_menu">
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

          <planet-summary v-if="show_info" mini=true :planet="planet" />
        </div>

        <NavMap
            v-if="show_map"
            :focus="dest"
            :transit="transit"
            @dest="set_dest"
            @transit="set_transit" />

      </card>
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
      home()           { return game.player.home.name },
      gravity()        { return game.player.homeGravity },
      max_accel()      { return game.player.maxAcceleration() / Physics.G },
      ship_accel()     { return game.player.shipAcceleration() / Physics.G },
      ship_mass()      { return game.player.ship.currentMass() },
      ship_fuel()      { return game.player.ship.fuel },
      ship_burn_time() { return game.player.ship.maxBurnTime() * data.hours_per_turn },
      transits()       { return this.navcomp.getTransitsTo(this.dest) },
      has_route()      { return this.transits.length > 0 },
      num_routes()     { return this.transits.length },
      transit()        { if (this.has_route) return this.transits[this.selected] },
      distance()       { if (this.has_route) return this.transit.au },
    },

    'template': `
      <div>
        <p>Your navigational computer automatically calculates the optimal trajectory from your current location to the other settlements in the system.</p>
        <p>Being born on {{home}}, your body is adapted to {{gravity|R(2)}}G, allowing you to endure a sustained burn of {{max_accel|R(2)}}G.</p>

        <p>
          Carrying {{ship_mass|R|csn|unit('metric tonnes')}}, your ship is capable of {{ship_accel|R(2)|unit('G')}} of acceleraction.
          With {{ship_fuel|R(2)|csn}} tonnes of fuel, your ship has a maximum burn time of {{ship_burn_time|R|csn}} hours at maximum thrust.
        </p>

        <div v-if="has_route">
          <def split="4" term="Total"        :def="distance|R(2)|unit('AU')" />
          <def split="4" term="Acceleration" :def="transit.accel|R(2)|unit('m/s/s')" />
          <def split="4" term="Max velocity" :def="(transit.maxVelocity/1000)|R(2)|unit('km/s')" />
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


  Vue.component('NavMapPoint', {
    'props': ['top', 'left'],

    'template': `
      <span @click="$emit('click')" class="plot-point" :style="{left: left + 'px', top: top + 'px', 'z-index': 0}">
        <slot />
      </span>
    `,
  });


  Vue.component('NavMapBody', {
    'props': ['body', 'nolabel', 'layout', 'pos', 'focus'],

    'computed': {
      is_moon() {
        return this.body != 'sun' && System.central(this.body) !== 'sun';
      },

      is_focus() {
        return this.body == this.focus;
      },

      img() {
        return 'img/' + this.body + '.png';
      },

      central() {
        return System.central(this.body);
      },

      point() {
        return this.layout.scale_point(this.position());
      },

      diameter() {
        const d = System.body(this.body).radius * 2;
        const w = this.layout.width_px * (d / (this.layout.fov_au * Physics.AU));
        return Math.max(3, Math.ceil(w));
      },

      left() {
        return this.point[0] - (this.diameter / 2);
      },

      top() {
        return this.point[1] - (this.diameter / 2);
      },

      label_visible() {
        if (this.nolabel) {
          return false;
        }

        if (this.is_focus) {
          return true;
        }

        if (this.focus && this.body == System.central(this.focus)) {
          return false;
        }

        if (this.is_moon) {
          return this.layout.fov_au < 0.5;
        }

        const pos   = this.position();
        const orbit = Physics.distance(pos, [0, 0, 0]) / Physics.AU;
        return this.layout.fov_au / 6 < orbit;
      },
    },

    'methods': {
      position() {
        return this.pos ? this.pos : System.position(this.body);
      },
    },

    'template': `
      <NavMapPoint :top="top" :left="left" @click="$emit('click')">
        <img :src="img" :style="{'width': diameter + 'px'}" class="plot-image" />

        <badge v-show="label_visible" class="m-1" :class="{'dest': is_focus}">
          {{body|caps}}
          <span v-if="is_focus && is_moon">
            ({{central|caps}})
          </span>
        </badge>
      </NavMapPoint>
    `,
  });


  Vue.component('NavMapPlot', {
    'props': ['focus', 'layout', 'center', 'fov'],

    'directives': {
      'resizable': {
        inserted(el, binding, vnode) {
          const layout = new Layout;
          vnode.context.$emit('update:layout', layout);
          layout.set_fov_au(vnode.context.fov_au);
          layout.set_center(vnode.context.center_point);
        }
      },
    },

    'watch': {
      focus()  { this.auto_focus() },
      fov()    { this.auto_focus() },
      center() { this.auto_focus() },
    },

    'computed': {
      center_point() {
        if (this.center) {
          return this.center;
        }

        // If there is no center point specified, set the new center point to
        // be the centroid of the new focus, the current location, and the sun.
        const points = [[0, 0], this.position(game.locus)];

        if (this.focus) {
          points.push(this.position(this.focus));
        }

        return Physics.centroid(...points);
      },

      fov_au() {
        if (this.fov) {
          return this.fov;
        }

        const bodies = [this.position(game.locus)];

        if (this.focus) {
          bodies.push(this.position(this.focus));
        }

        const orbits = bodies.map(b => Physics.distance(b, [0, 0]));
        const max    = Math.max(...orbits);
        const fov    = (max + (Physics.AU / 2)) / Physics.AU;
        return fov;
      },

      bodies() {
        const seen   = {};
        const bodies = [];

        for (const body of BODIES) {
          if (!seen[body]) {
            seen[body] = true;
            bodies.push(body);

            const central = System.central(body);
            if (central != 'sun' && !seen[central]) {
              seen[central] = true;
              bodies.push(central);
            }
          }
        }

        return bodies;
      },

      visible_bodies() {
        return this.bodies.filter(b => this.is_within_fov(b));
      },

    },

    'methods': {
      position(body) {
        const p = System.position(body);
        return [p[0], p[1]];
      },

      is_within_fov(body) {
        return this.layout.is_within_fov(
          this.position(body),
          this.center_point,
        );
      },

      is_focus(body) {
        return body == this.focus;
      },

      is_here(body) {
        return body == game.locus;
      },

     plot_points() {
      const t = System.system.time;
      const bodies = {};
      for (const body of this.visible_bodies) {
        bodies[body] = System.position(body, t);
      }

      return bodies;
    },

     body_clicked(body) {
        // Find navigable targets in the system on which the player clicked
        const central = System.central(body);
        const sats    = System.body(central == 'sun' ? body : central).satellites;
        const targets = Object.keys(data.bodies)
          .filter(d => sats[d] || d == body || d == central)
          .filter(d => !this.is_here(d));

        // Rotate through objects in the system
        let focus;
        for (let i = 0; i < targets.length; ++i) {
          if (this.is_focus(targets[i])) {
            if (i + 1 >= targets.length) {
              focus = targets[0];
            } else {
              focus = targets[i + 1];
            }
          }
        }

        // If focus is still undefined, the current focus is not in the system
        // being selected.
        if (focus === undefined) {
          focus = targets[0];
        }

        this.$emit('click', focus);
      },

      auto_focus() {
        this.layout.set_fov_au(this.fov_au);
        this.layout.set_center(this.center_point);
      },
    },

    'template': `
      <div v-resizable
          id     = "navcomp-map-root"
          class  = "plot-root border border-dark"
          :style = "{'width': layout.width_px + 'px', 'height': layout.width_px + 'px'}">

        <NavMapBody
            body    = "sun"
            :pos    = "layout.scale_point([0, 0])"
            :layout = "layout"
            nolabel = 0 />

        <NavMapBody
            v-for   = "(point, body) of plot_points()"
            :key    = "body"
            :body   = "body"
            :layout = "layout"
            :focus  = "focus"
            :pos    = "point"
            @click  = "body_clicked(body)" />

        <slot />
      </div>
    `,
  });


  Vue.component('NavMap', {
    'props': ['focus', 'transit'],

    data() {
      return {
        'show':    'map',
        'modal':   null,
        'layout':  new Layout,
        'target':  null,
      };
    },

    'computed': {
      show_routes()  { return this.show == 'routes'   },
      show_targets() { return this.modal == 'targets' },

      transit_path() {
        const transit = this.transit;

        if (transit) {
          const center = this.center_point || [0, 0];

          const path = this.transit.path
            .map(p => p.position)
            .filter(p => this.layout.is_within_fov(p, center));

          return this.layout.scale_path(path, 100);
        }
      },

      target_path() {
        const transit = this.transit;

        if (transit) {
          const center = this.center_point || [0, 0];
          const orbit  = System.orbit_by_turns(this.focus).slice(0, transit.turns);
          const min    = this.layout.fov_au * Physics.AU / 30;
          const path   = [ this.layout.scale_point( orbit[0] ) ];

          let mark = orbit[0];
          for (let i = 1; i < orbit.length; ++i) {
            if (this.layout.is_within_fov(orbit[i], center)) {
              if (Physics.distance(mark, orbit[i]) > min) {
                path.push( this.layout.scale_point( orbit[i] ) );
                mark = orbit[i];
              }
            }
          }

          path.push( this.layout.scale_point( orbit[ orbit.length - 1 ] ) );

          return path;
        }
      },

      center_point() {
        if (this.target && this.target != 'transit') {
          return System.position(this.target);
        }

        const transit = this.transit;

        if (transit) {
          const points = [
            transit.start,
            transit.end,
            System.position(this.focus),
            System.position(game.locus),
          ];

          return Physics.centroid(...points);
        }

        return;
      },

      fov_au() {
        if (this.target) {
          return Physics.distance(this.target, [0, 0]) / Physics.AU;
        }

        if (this.transit) {
          return this.transit.segment_au;
        }

        return;
      },
    },

    'methods': {
      go_map()     { this.show = 'map'      },
      go_routes()  { this.show = 'routes'   },
      go_targets() { this.modal = 'targets' },

      on_click(body) {
        this.$emit('dest', body);
      },

      set_route(transit) {
        this.$emit('transit', transit);
        this.go_map();
      },

      set_target(target) {
        this.target = target;
        this.modal  = null;
      },
    },

    'template': `
      <div class="p-0 m-0">
        <NavMapPlot @click="on_click" :focus="focus" :center="center_point" :layout.sync="layout" :fov="fov_au">
          <span v-if="focus" class="text-success">
            [ {{ focus|caps }} ]
          </span>

          <btn class="float-right" @click="go_targets">
            &CircleDot;
          </btn>

          <btn class="float-right" @click="go_routes" v-if="focus">
            &#11208;
          </btn>

            Route
          </btn>

          <NavMapPoint
              v-for="(p, idx) in target_path"
              :key="'target-' + idx"
              :left="p[0]"
              :top="p[1]"
              :idx="idx">
            <span v-if="idx == target_path.length - 1" class="text-danger">&target;</span>
            <span v-else class="text-warning">&sdot;</span>
          </NavMapPoint>

          <NavMapPoint
              v-for="(p, idx) in transit_path"
              :key="'transit-' + idx"
              :left="p[0]"
              :top="p[1]"
              class="text-success">
            <span>&sdot;</span>
          </NavMapPoint>
        </NavMapPlot>

        <modal v-if="show_routes" title="Route planner" close="Plot route" xclose=1>
          <NavRoutePlanner :dest="focus" @route="set_route" />
        </modal>

        <modal v-if="show_targets" title="Find on map" @close="modal=null" xclose=1>
          <NavDestMenu @answer="on_click" final=1 />
        </modal>
      </div>
    `,
  });
});
