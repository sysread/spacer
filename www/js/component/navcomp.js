define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const Hammer  = require('vendor/hammer.min');
  const System  = require('system');
  const Physics = require('physics');
  const util    = require('util');
  const data    = require('data');

  require('component/common');
  require('component/card');
  require('component/modal');
  require('component/commerce');
  require('component/summary');

  const SCALE_DEFAULT_AU = 2;
  const SCALE_MIN_AU     = 0.00001;
  const SCALE_MAX_AU     = 35;
  const BODIES           = System.bodies();


  const Layout = class {
    constructor() {
      this.fov_au   = SCALE_DEFAULT_AU;
      this.width_px = 0;
      this.init_x   = 0;
      this.init_y   = 0;
      this.offset_x = 0;
      this.offset_y = 0;
      this.update_width();
    }

    get zero() {
      if (!this._zero) {
        this._zero = this.width_px / 2;
      }

      return this._zero;
    }

    get elt() {
      if (!this._elt) {
        this._elt = document.getElementById('navcomp-map-root');

        if (this._elt) {
          console.log('layout: navcomp-map-root found');

          this.clear_mc();
          this.install_handlers();
        }
      }

      return this._elt;
    }

    get mc() {
      if (!this._mc) {
        if (!this.elt) {
          return;
        }

        this._mc = new Hammer(this.elt);
        console.log('layout: hammer time');
      }

      return this._mc;
    }

    clear_zero() {
      this._zero = null;
    }

    clear_mc() {
      this._mc = null;
    }

    scale(n) {
      return this.zero * (n / (this.fov_au * Physics.AU));
    }

    scale_x(n) {
      return (this.zero + this.scale(n, this.fov_au)) + this.offset_x;
    }

    scale_y(n) {
      return (this.zero - this.scale(n, this.fov_au)) + this.offset_y;
    }

    scale_point(p) {
      return [ this.scale_x(p[0]), this.scale_y(p[1]) ];
    }

    update_width() {
      if (!this.elt) {
        return 0;
      }

      const height
        = window.innerHeight
        + window.scrollY
        - this.elt.getBoundingClientRect().top
        - $('#spacer-status').outerHeight()
        - $('#spacer-navbar').outerHeight();

      const width = $(this.elt).parent().width();

      this.clear_zero();
      this.width_px = Math.min(width, height);

      console.log('layout: width updated to', this.width_px);
    }

    install_handlers() {
      window.addEventListener('resize', () => {
        this.update_width();
      });

      this.elt.addEventListener('wheel', ev => {
        ev.preventDefault();
        ev.stopPropagation();

        const fov_au  = this.fov_au;
        const inc     = fov_au / 10;
        const amount  = ((ev.deltaX + ev.deltaY) / 2) > 0 ? inc : -inc;
        const new_fov = util.R(Math.max(SCALE_MIN_AU, Math.min(SCALE_MAX_AU, fov_au + amount)), 6);

        this.fov_au = new_fov;
      });

      // Drag the map on pan events
      this.mc.get('pan').set({
        direction: Hammer.DIRECTION_UP | Hammer.DIRECTION_DOWN | Hammer.DIRECTION_LEFT | Hammer.DIRECTION_RIGHT,
      });

      this.mc.on('pan', ev => {
        if (ev.isFirst) {
          this.init_x = this.offset_x;
          this.init_y = this.offset_y;
        }

        // Update the node's offset values
        this.offset_x = this.init_x + ev.deltaX;
        this.offset_y = this.init_y + ev.deltaY;

        // Reset initial positions on final event
        if (ev.isFinal) {
          this.init_x = this.offset_x;
          this.init_y = this.offset_y;
        }
      });

      // Scale the map on pinch and wheel events
      this.mc.get('pinch').set({ enable: true });

      this.mc.on('pinch', ev => {
        let amount = ev.scale;

        if (amount > 1) {         // movement out <--*-->
          amount = -(amount - 1); // "spreads out" the map by zooming in to a smaller scale in AU
        } else {                  // movement in -->*<--
          amount = 1 - amount;    // zooms out by increasing the scale to a larger value in AU
        }

        amount /= 10;             // reduce to a reasonable fractional value

        const fov_au = util.R(Math.max(SCALE_MIN_AU, Math.min(SCALE_MAX_AU, vnode.context.scale + amount)), 6);
        this.fov_au = fov_au;
      });

      console.log('layout: handlers installed');
    }
  };


  Vue.component('NavDestOpt', {
    'props': ['body'],

    'computed': {
      name()    { return System.name(this.body)           },
      faction() { return System.faction(this.body)        },
      central() { return System.central(this.body)        },
      kind()    { return System.kind(this.body)           },
      isMoon()  { return System.type(this.body) == 'moon' },
      isHere()  { return game.locus == this.body          },

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
      <Opt :val="body" final=1 :disabled="isHere" :class="color">
        {{name}}

        <span v-if="isHere" class="m-1 text-warning font-weight-bold">&#128907;</span>

        <slot />

        <badge right=1 class="ml-1">{{dist}}</badge>
        <badge right=1 class="ml-1 d-none d-sm-inline">{{faction}}</badge>
        <badge right=1 v-if="isMoon" class="ml-1 d-none d-sm-inline">{{kind}}</badge>
      </Opt>
    `,
  });


  Vue.component('NavDestMenu', {
    'props': ['prev'],

    'computed': {
      bodies() { return BODIES },
    },

    'methods': {
      onAnswer(dest) {
        this.$emit('answer', dest);
      },
    },

    'template': `
      <Menu title="Select a destination">
        <NavDestOpt v-for="body in bodies" :key="body" :body="body" @answer="onAnswer">
          <span v-if="body == prev" class="m-1 text-warning font-weight-bold">&target;</span>
        </NavDestOpt>
      </Menu>
    `,
  });


  Vue.component('NavComp', {
    'props': [],

    data() {
      return {
        show:      'map',
        dest:      null,
        relprices: false,
      };
    },

    'computed': {
      showHomeMenu() { return this.show == 'home'   },
      showDestMenu() { return this.show == 'dest'   },
      showMap()      { return this.show == 'map'    },
      showInfo()     { return this.show == 'info'   },
      showMarket()   { return this.show == 'market' },

      planet() {
        if (this.dest) {
          return game.planets[this.dest];
        }
      },
    },

    'methods': {
      goHomeMenu()   { this.show = 'home'           },
      goDestMenu()   { this.show = 'dest'           },
      goMap()        { this.show = 'map'            },
      goInfo()       { this.show = 'info'           },
      goMarket()     { this.show = 'market'         },

      isHere(body)   { return body == game.locus    },

      setDest(dest) {
        if (this.isHere(dest)) {
          return;
        }

        this.dest = dest;
        this.goHomeMenu();
      },

      nextDest() {
        if (!this.dest) {
          this.dest = BODIES[0];
          return;
        }

        for (let i = 0; i < BODIES.length; ++i) {
          if (this.dest == BODIES[i]) {
            for (let j = i; j < BODIES.length; ++j) {
              const idx = j + 1 == BODIES.length ? 0 : j + 1;

              if (this.isHere(BODIES[idx])) {
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
            <btn v-if="!showHomeMenu" @click="goHomeMenu">Back</btn>
          </h3>
        </card-header>

        <div class="p-2" v-if="!showMap">
          <Menu title="Navigation"  v-if="showHomeMenu">
            <Opt @click="goDestMenu">
              <span v-if="!dest">Set destination</span>
              <span v-else>
                Change destination
                <badge right=1>{{dest|caps}}</badge>
              </span>
            </Opt>

            <Opt @click="goMap">Show system map</Opt>
            <Opt @click="goInfo" v-if="dest">Show system info</Opt>
            <Opt @click="goMarket" v-if="dest">Show market prices</Opt>

            <Opt @click="relprices=!relprices">
              Showing
              <span v-if="relprices">relative</span>
              <span v-else>absolute</span>
              prices
            </Opt>
          </Menu>

          <NavDestMenu v-if="showDestMenu" :prev="dest" @answer="setDest" />

          <div v-if="showMarket">
            <Menu>
              <NavDestOpt @answer="nextDest" :body="dest"></NavDestOpt>
              <Opt @click="relprices=false" v-if="relprices">Relative prices</Opt>
              <Opt @click="relprices=true" v-if="!relprices">Absolute prices</Opt>
            </Menu>

            <market-report :relprices="relprices" :body="dest" />
          </div>

          <planet-summary v-if="showInfo" mini=true :planet="planet" />
        </div>

        <NavMap :dest="dest" v-if="showMap"></NavMap>
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
    'props': ['body', 'nolabel', 'layout', 'pos'],

    'computed': {
      img() {
        return 'img/' + this.body + '.png';
      },

      is_moon() {
        return this.body != 'sun' && System.central(this.body) !== 'sun';
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

      label_visible() {
        if (this.nolabel) {
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
      <NavMapPoint :top="top" :left="left">
        <img :src="img" :style="{'width': diameter + 'px'}" class="plot-image" />

        <badge v-show="label_visible" class="m-1">
          {{body|caps}}
        </badge>
      </NavMapPoint>
    `,
  });


  Vue.component('NavMap', {
    'props': ['dest'],

    data() {
      return {
        layout: new Layout(),
      };
    },

    'directives': {
      'resizable': {
        inserted(el, binding, vnode) {
          vnode.context.layout = new Layout();
        }
      },
    },

    'computed': {
      visible_bodies() {
        const bodies = {};

        for (const body of BODIES) {
          if (this.is_within_fov(body)) {
            bodies[body] = this.layout.scale_point(this.position(body));

            const central = System.central(body);

            if (central != 'sun' && !bodies[central] && !bodies[central]) {
              bodies[central] = this.layout.scale_point(this.position(central));
            }
          }
        }

        return bodies;
      },
    },

    'methods': {
      position(body) {
        const p = System.position(body);
        return [p[0], p[1]];
      },

      is_within_fov(body) {
        const orbit = Physics.distance(this.position(body), [0, 0]) / Physics.AU;
        return orbit < this.layout.fov_au;
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
            v-for   = "(point, body) of visible_bodies"
            :key    = "body"
            :body   = "body"
            :layout = "layout" />
      </div>
    `,
  });
});
