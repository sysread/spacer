<template>
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
      <h4>{{game.here.name}} to {{$caps(planet.name)}}</h4>

      <def split=4 term="Arrival"      :def="transit.str_arrival_date" />
      <def split=4 term="Distance"     :def="transit_display_distance" />
      <def split=4 term="Max Velocity" :def="$unit($csn($R(transit.maxVelocity/1000)), 'km/s')" />
      <def split=4 term="Acceleration" :def="$unit($R(transit.accel_g, 3), 'G')" />
      <def split=4 term="Fuel"         :def="$unit($R(transit.fuel, 2), 'tonnes')" />
    </confirm>

    <div v-layout v-if="show_map">
      <NavPlot :layout="layout" :transit="transit" :style="layout_css_dimensions">
        <template #svg>
          <NavBodies :layout="layout" :focus="dest || game.locus" @click="set_dest" />
          <SvgTransitPath v-if="transit" :layout="layout" :transit="transit" />
        </template>
      </NavPlot>
    </div>

  </Section>
</template>

<script>
import Layout from './layout';
import { NavComp } from '../navcomp';
import Physics from '../physics';
import system from '../system';
import * as nc from './navcomp-controller';

export default {
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

    const nav = document.getElementById('spacer-nav');
    if (nav && nav.classList.contains('collapsing')) {
      nav.addEventListener('hidden.bs.collapse', () => {
        this.is_ready = true;
      }, { once: true });
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
      return nc.isSubSystemTransit(this.dest, this.game.locus, (b) => system.central(b));
    },

    map_center_point() {
      return nc.computeMapCenter(
        this.dest, this.game.locus, this.transit, this.isSubSystemTransit,
        (b) => this.system.position(b), (b) => system.central(b),
      );
    },

    map_fov_au() {
      // No destination: zoom proportional to body size so the body
      // image fills a comfortable fraction of the viewport. ~15x the
      // diameter in AU gives good results across the size range:
      //   Ceres (952km)   → ~0.0001 AU
      //   Mars (6,780km)  → ~0.0007 AU
      //   Jupiter (140Mm) → ~0.014 AU
      if (!this.dest) {
        const central = system.central(this.game.locus);
        if (central !== 'sun') {
          const locusPos = this.system.position(this.game.locus);
          const centralPos = this.system.position(central);
          const orbitDist = Physics.distance(locusPos, centralPos) / Physics.AU;
          return Math.max(orbitDist * 3, 0.0001);
        }
        // fov_au is half-width; display shows fov_au * 2. Use 7.5x
        // diameter so the displayed FOV is ~15x diameter.
        const radius = this.system.body(this.game.locus).radius;
        return Math.max(radius * 2 * 7.5 / Physics.AU, 0.0001);
      }

      return nc.computeMapFovAU(
        this.dest, this.game.locus, this.transit, this.isSubSystemTransit,
        this.map_center_point,
        (b) => this.system.position(b), (b) => system.central(b),
        (a, b) => this.system.distance(a, b), () => this.system.all_bodies(),
      );
    },

    transit_display_distance() {
      return nc.transitDisplayDistance(this.transit);
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
};
</script>
