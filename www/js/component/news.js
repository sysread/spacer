define(function(require, exports, module) {
  "use strict"

  const Vue     = require('vendor/vue');
  const Physics = require('physics');

  require('component/global');
  require('component/common');
  require('component/card');


  Vue.component('NewsFeeds', {
    data() {
      return {
        index: null,
      };
    },

    computed: {
      bodies()  { return Object.keys(this.data.bodies)               },
      name()    { return this.game.planets[this.body].name           },
      faction() { return this.game.planets[this.body].faction.abbrev },
      is_moon() { return this.system.type(this.body) == 'moon'       },
      kind()    { return this.system.kind(this.body)                 },

      body() {
        if (this.index === null) {
          this.index = this.bodies.findIndex(b => b == game.locus);
        }

        return this.bodies[this.index];
      },
    },

    methods: {
      next_body() {
        if (++this.index == this.bodies.length) {
          this.index = 0;
        }
      },
    },

    template: `
      <card title="News feeds">
        <card-text>
          As you walk through the public concourse, your eye is drawn to an ad,
          which proceeds to follow you from screen to screen. Between impassioned
          pleas for your hard-earned scrip, you are able to glean a few tidbits
          from the public news feeds.
        </card-text>

        <btn block=1 @click="next_body" class="text-left">
          {{name}}
          <span v-if="body == game.locus" class="m-1 text-warning font-weight-bold">&target;</span>
          <badge right=1 class="mx-1">{{faction}}</badge>
          <badge right=1 v-if="is_moon" class="ml-1">{{kind}}</badge>
        </btn>

        <News :body="body" />
      </card>
    `,
  });


  Vue.component('News', {
    props: ['body', 'title'],

    computed: {
      bodies()    { return Object.keys(this.data.bodies)     },
      resources() { return Object.keys(this.data.resources)  },
      name()      { return this.game.planets[this.body].name },

      hasShortages()  { return this.shortages[this.body]  && this.shortages[this.body].length > 0  },
      hasSurpluses()  { return this.surpluses[this.body]  && this.surpluses[this.body].length > 0  },
      hasConditions() { return this.conditions[this.body] && this.conditions[this.body].length > 0 },

      hasNews() {
        return this.hasShortages
            || this.hasSurpluses
            || this.hasConditions;
      },


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
            .filter(body => !this.game.planets[body].isNetExporter(item))
            .filter(body => this.game.planets[body].hasShortage(item))
            .map(body => this.game.planets[body].getNeed(item))
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
            .filter(i => game.planets[body].hasSurplus(i))
            .filter(i => game.planets[body].getStock(i) > 0);
        }

        return data;
      },

      conditions() {
        const data = {};

        for (const body of this.bodies) {
          data[body] = this.game.planets[body].conditions.map(c => {
            return {
              name: c.name,
              left: Math.floor(c.turns_left / this.turns_per_day),
              need: c.consumes.keys,
            };
          });
        }

        return data;
      },
    },

    template: `
      <card class="my-2" :title="title">
        <template v-if="hasNews">
          <div v-if="hasConditions" v-for="cond of conditions[body]" class="my-2">
            <h6 class="text-danger">{{cond.name|caps}}</h6>
            <p v-if="cond.left < 7">Local sources claim efforts to deal with the {{cond.name}} have been successful and are winding down.</p>
            <p v-if="cond.left < 30">Unnamed government officials say efforts to combat the {{cond.name}} are underway but have been largely unsuccessful thus far.</p>
            <p v-else>
              Government officials claim the situation is under control and urge calm over the ongoing {{cond.name}}.
              When asked why the {{cond.name}} continues unabated if the situation is contained, the same officials declined to comment.
            </p>

            <p v-if="cond.need.length">Officials are asking for any available shipping to assist with deliveries of {{cond.need.join(', ')}}.</p>
          </div>

          <div v-if="hasShortages" class="my-2">
            <h6>High market demand reported</h6>
            <ul>
              <li v-for="item of shortages[body]" class="text-warning">
                {{item|caps}}
                <span v-if="shipments[item] && shipments[item][body]" class="mx-1 font-italic text-muted">
                  &mdash; relief arriving in {{shipments[item][body]|csn}} days
                </span>
              </li>
            </ul>
          </div>

          <div v-if="hasSurpluses" class="my-2">
            <h6>Surpluses reported</h6>
            <ul>
              <li v-for="item of surpluses[body]" class="text-success">{{item|caps}}</li>
            </ul>
          </div>
        </template>

        <card-text v-else>
          Nothing significant to report.
        </card-text>
      </card>
    `,
  });
});
