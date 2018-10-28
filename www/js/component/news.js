define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const Physics = require('physics');

  require('component/global');
  require('component/common');
  require('component/card');


  Vue.component('News', {
    data() {
      return {
        shown: null,
      };
    },

    computed: {
      resources() { return Object.keys(this.data.resources) },
      bodies()    { return Object.keys(this.data.bodies)    },

      shipments() {
        const data = {};
        const trades = this.game.trade_routes();

        for (const item of Object.keys(trades)) {
          data[item] = {};
          for (const dest of Object.keys(trades[item])) {
            const times = Object.keys(trades[item][dest])
              .map(from => Math.min(...trades[item][dest][from].map(t => t.hours)) );

            data[item][dest] = Math.ceil(Math.min(...times) / 24);
          }
        }

        return data;
      },

      shortage_factors() {
        const data = {};

        for (const item of this.resources) {
          data[item] = Math.min(...this.bodies
            .filter(body => !game.planets[body].isNetExporter(item))
            .filter(body => game.planets[body].hasShortage(item))
            .map(body => game.planets[body].getNeed(item))
            .sort((a, b) => a > b ? -1 : 1)
            .slice(0, 3));
        }

        return data;
      },

      shortages() {
        const data = {};

        for (const item of this.resources) {
          if (this.data.resources[item].contraband)
            continue;

          const factor = this.shortage_factors[item];

          for (const body of this.bodies) {
            data[body] = data[body] || [];

            if (this.game.planets[body].getNeed(item) >= factor) {
              data[body].push(item);
            }
          }
        }

        return data;
      },

      surpluses() {
        const data = {};

        for (const body of this.bodies) {
          data[body] = this.resources
            .filter(i => !this.data.resources[i].contraband)
            .filter(i => game.planets[body].hasSurplus(i));
        }

        return data;
      },
    },

    methods: {
      name(body)         { return this.system.short_name(body)                       },
      faction(body)      { return this.game.planets[body].faction.abbrev             },
      hasShortages(body) { return this.shortages[body].length > 0                    },
      hasSurpluses(body) { return this.surpluses[body].length > 0                    },
      hasNews(body)      { return this.hasShortages(body) || this.hasSurpluses(body) },
      kind(body)         { return this.system.kind(body)                             },
      is_moon(body)      { return this.system.type(body) == 'moon'                   },
      is_shown(body)     { return (this.shown || this.game.locus) == body            },
      show(body)         { this.shown = body                                         },
    },

    template: `
      <card title="News feeds">
        <template v-for="body in bodies">
          <btn block=1 @click="show(body)" class="text-left">
            {{name(body)}}
            <span v-if="body == game.locus" class="m-1 text-warning font-weight-bold">&target;</span>
            <badge right=1 class="mx-1">{{faction(body)}}</badge>
            <badge right=1 v-if="is_moon(body)" class="ml-1">{{kind(body)}}</badge>
          </btn>

          <card :subtitle="name(body)" v-if="is_shown(body) && hasNews(body)" class="my-2">
            <ul>
              <li v-if="hasShortages(body)" class="my-2">
                High demand reported:
                <ul>
                  <li v-for="item of shortages[body]" class="text-success">
                    {{item|caps}}
                    <span v-if="shipments[item][body]" class="mx-1 font-italic text-muted">
                      &mdash; relief arriving in {{shipments[item][body]|csn}} days
                    </span>
                  </li>
                </ul>
              </li>

              <li v-if="hasSurpluses(body)" class="my-2">
                Surpluses reported:
                <ul>
                  <li v-for="item of surpluses[body]" class="text-warning">{{item|caps}}</li>
                </ul>
              </li>
            </ul>
          </card>
        </template>
      </card>
    `,
  });
});
