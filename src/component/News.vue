<template>
  <div v-if="hasNews">
    <div class="news-masthead-org" v-if="newsOrg">
      <span class="news-flourish">※</span>
      <span class="news-org-name">{{newsOrg}}</span>
      <span class="news-flourish">※</span>
      <div class="news-tagline">{{tagline}}</div>
    </div>
    <div class="news-dateline">{{title}}</div>

    <template v-if="hasConditions">
      <div v-for="cond of conditions[body]" :key="cond.name" class="news-story news-story-crisis">
        <span class="news-tag news-tag-crisis">CRISIS</span>
        <div class="news-headline">{{$caps(cond.name)}}</div>
        <p class="news-body" v-if="cond.left < 7">Local sources claim efforts to deal with the {{cond.name}} have been successful and are winding down.</p>
        <p class="news-body" v-else-if="cond.left < 30">Unnamed government officials say efforts to combat the {{cond.name}} are underway but have been largely unsuccessful thus far.</p>
        <p class="news-body" v-else>
          Government officials claim the situation is under control and urge calm over the ongoing {{cond.name}}.
          When asked why the {{cond.name}} continues unabated if the situation is contained, the same officials declined to comment.
        </p>
        <p class="news-body" v-if="cond.need.length">
          Officials are asking for any available shipping to assist with deliveries of <span class="text-warning">{{cond.need.join(', ')}}</span>.
        </p>
      </div>
    </template>

    <div v-if="hasShortages" class="news-story news-story-market">
      <span class="news-tag news-tag-market">MARKET</span>
      <div class="news-headline">High demand reported</div>
      <ul class="news-list">
        <li v-for="item of shortages[body]" :key="item" class="text-warning">
          {{$caps(item)}}
          <span v-if="shipments[item] && shipments[item][body]" class="news-relief">
            relief arriving in {{$csn(shipments[item][body])}} days
          </span>
        </li>
      </ul>
    </div>

    <div v-if="hasSurpluses" class="news-story news-story-surplus">
      <span class="news-tag news-tag-surplus">SURPLUS</span>
      <div class="news-headline">Overstock reported</div>
      <ul class="news-list">
        <li v-for="item of surpluses[body]" :key="item" class="text-success">{{$caps(item)}}</li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  props: ['body', 'title', 'newsOrg', 'tagline'],

  computed: {
    bodies()    { return Object.keys(this.data.bodies) },
    resources() { return Object.keys(this.data.resources) },
    name()      { return this.game.planets[this.body].name },
    faction()   { return this.game.planets[this.body].faction.abbrev },

    hasShortages()  { return this.shortages[this.body]  && this.shortages[this.body].length  > 0 },
    hasSurpluses()  { return this.surpluses[this.body]  && this.surpluses[this.body].length  > 0 },
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

    shortages() {
      const data = {};

      for (const body of this.bodies) {
        data[body] = this.resources
          .filter(i => !this.data.resources[i].contraband)
          .filter(i => game.planets[body].economy.hasSuperShortage(i))
          .filter(i => game.planets[body].economy.getStock(i) == 0);
      }

      return data;
    },

    surpluses() {
      const data = {};

      for (const body of this.bodies) {
        data[body] = this.resources
          .filter(i => !this.data.resources[i].contraband)
          .filter(i => game.planets[body].economy.hasSuperSurplus(i))
          .filter(i => game.planets[body].economy.getStock(i) > 0);
      }

      return data;
    },

    conditions() {
      const data = {};

      for (const body of this.bodies) {
        data[body] = this.game.planets[body].conditions.map(c => {
          return {
            name: c.name,
            left: Math.floor(c.turns_left / this.data.turns_per_day),
            need: Object.keys(c.consumes),
          };
        });
      }

      return data;
    },
  },
};
</script>

<style>
.news-list {
  list-style: none;
  padding-left: 0.5rem;
  margin: 0.3rem 0 0 0;
}

.news-list li {
  padding: 0.15rem 0;
}

.news-list li::before {
  content: '▸ ';
  color: #555;
}

.news-relief {
  color: #666;
  font-style: italic;
  font-size: 0.85em;
}

.news-masthead-org {
  text-align: center;
  margin-bottom: 0.25rem;
}

.news-org-name {
  font: bold 0.75rem monospace;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.news-flourish {
  color: #555;
  margin: 0 0.5rem;
  font-size: 0.7rem;
}

.news-tagline {
  font: italic 0.65rem monospace;
  color: #666;
  margin-top: 0.1rem;
}
</style>
