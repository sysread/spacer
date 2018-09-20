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
        <badge right=1 v-if="is_moon" class="ml-1 d-none d-sm-inline">{{kind}}</badge>
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
        show: 'map',
        dest: null,
        rel:  false,
      };
    },

    'computed': {
      show_home_menu() { return this.show == 'home'   },
      show_dest_menu() { return this.show == 'dest'   },
      show_map()       { return this.show == 'map'    },
      show_info()      { return this.show == 'info'   },
      show_market()    { return this.show == 'market' },

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

      is_here(body) {
        return body == game.locus;
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
        if (!this.dest) {
          this.dest = BODIES[0];
          return;
        }

        for (let i = 0; i < BODIES.length; ++i) {
          if (this.dest == BODIES[i]) {
            for (let j = i; j < BODIES.length; ++j) {
              const idx = j + 1 == BODIES.length ? 0 : j + 1;

              if (this.is_here(BODIES[idx])) {
                continue;
              }
              else {
                this.dest = BODIES[idx];
                return;
              }
            }
          }
        }
      },
    },

    'template': `
      <card id="navcomp" nopad=1>
        <card-header class="px-0">
          <h3 class="p-2">
            NavComp
            <btn v-if="!show_home_menu" @click="go_home_menu">Back</btn>
          </h3>
        </card-header>

        <div class="p-2" v-if="!show_map">
          <Menu title="Navigation"  v-if="show_home_menu">
            <Opt @click="go_dest_menu">
              <span v-if="!dest">Set destination</span>
              <span v-else>
                Change destination
                <badge right=1>{{dest|caps}}</badge>
              </span>
            </Opt>

            <Opt @click="go_map">Show system map</Opt>
            <Opt @click="go_info" v-if="dest">Show system info</Opt>
            <Opt @click="go_market" v-if="dest">Show market prices</Opt>

            <Opt @click="rel=!rel">
              Showing
              <span v-if="rel">relative</span>
              <span v-else>absolute</span>
              prices
            </Opt>
          </Menu>

          <NavDestMenu title="Select a destination" v-if="show_dest_menu" :prev="dest" @answer="set_dest_return" />

          <div v-if="show_market">
            <Menu>
              <NavDestOpt @answer="next_dest" :body="dest"></NavDestOpt>
              <Opt @click="rel=false" v-if="rel">Relative prices</Opt>
              <Opt @click="rel=true" v-if="!rel">Absolute prices</Opt>
            </Menu>

            <market-report :relprices="rel" :body="dest" />
          </div>

          <planet-summary v-if="show_info" mini=true :planet="planet" />
        </div>

        <NavMap v-if="show_map" :focus="dest" @click="set_dest" @cycle="next_dest" />
      </card>
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

      position() {
        return this.pos ? this.pos : System.position(this.body);
      },

      point() {
        return this.layout.scale_point(this.position);
      },

      diameter() {
        const d = System.body(this.body).radius * 2;
        const w = this.layout.width_px * (d / (this.layout.fov_au * Physics.AU));
        return Math.max(5, Math.ceil(w));
      },

      left() {
        return this.point[0] - (this.diameter / 2);
      },

      top() {
        return this.point[1] - (this.diameter / 2);
      },

      circle_diameter() {
        return this.diameter * 10;
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

        const pos   = this.position;
        const orbit = Physics.distance(pos, [0, 0, 0]) / Physics.AU;
        return this.layout.fov_au / 6 < orbit;
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
    'props': ['focus'],

    data() {
      return {
        'layout': new Layout,
      };
    },

    'directives': {
      'resizable': {
        inserted(el, binding, vnode) {
          vnode.context.layout = new Layout;
        }
      },
    },

    'watch': {
      focus(newFocus, oldFocus) {
        this.auto_scale();
      },
    },

    'computed': {
      plot_points() {
        const bodies = {};
        for (const body of this.visible_bodies()) {
          bodies[body] = this.layout.scale_point(this.position(body));
        }

        return bodies;
      },
    },

    'methods': {
      *bodies() {
        const seen = {};
        for (const body of BODIES) {
          if (!seen[body]) {
            seen[body] = true;
            yield body;

            const central = System.central(body);
            if (central != 'sun' && !seen[central]) {
              seen[central] = true;
              yield central;
            }
          }
        }
      },

      *visible_bodies() {
        const bodies = {};
        for (const body of this.bodies()) {
          if (this.is_within_fov(body)) {
            yield body;
          }
        }
      },

      position(body) {
        const p = System.position(body);
        return [p[0], p[1]];
      },

      orbital_radius(body) {
        return Physics.distance(this.position(body), [0, 0]);
      },

      is_within_fov(body) {
        return (this.orbital_radius(body) / Physics.AU) < this.layout.fov_au;
      },

      is_focused(body) {
        return body == this.focus;
      },

      is_here(body) {
        return body == game.locus;
      },

      auto_scale() {
        const bodies = [ game.locus ];
        let fov = this.fov_au;

        if (this.focus && !this.is_here(this.focus)) {
          bodies.push(this.focus);
        }

        const orbital_radii = bodies.map(b => this.orbital_radius(b));
        this.layout.set_fov_au( Math.max(...orbital_radii) / Physics.AU * 1.1 );
      },
    },

    'template': `
      <div v-resizable
          id     = "navcomp-map-root"
          class  = "plot-root"
          :style = "{'width': layout.width_px + 'px', 'height': layout.width_px + 'px'}">

        <NavMapBody
            body    = "sun"
            :pos    = "[0, 0]"
            :layout = "layout"
            nolabel = 0 />

        <NavMapBody
            v-for   = "(point, body) of plot_points"
            :key    = "body"
            :body   = "body"
            :layout = "layout"
            :focus  = "focus"
            @click  = "$emit('click', body)" />

        <slot />
      </div>
    `,
  });


  Vue.component('NavMap', {
    'props': ['focus'],

    data() {
      return {
        'show':    'map',
        'navcomp': new NavComp,
      };
    },

    'computed': {
      show_menu() { return this.show == 'menu' },
    },

    'methods': {
      go_menu() { this.show = 'menu' },

      set_focus(body) {
        this.$emit('click', body);
      },
    },

    'template': `
      <div class="p-0 m-0">
        <NavMapPlot @click="set_focus" :focus="focus">
          <btn class="float-right" @click="go_menu">&#9881;</btn>
          <btn class="float-right" @click="$emit('cycle')">&#9654;</btn>
        </NavMapPlot>
      </div>
    `,
  });
});
