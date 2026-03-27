<template>
  <div class="my-3">
    <h6 v-if="title" class="text-capitalize fw-bold my-2" style="font-size:1rem; border-top:1px solid #444; border-bottom:1px solid #444; padding:4px 0">{{title}}</h6>
    <div v-if="hasNews" class="ms-2 px-2">
      <template v-if="hasConditions"><div v-for="cond of conditions[body]" :key="cond.name" class="my-2">
        <h6 class="text-danger">{{$caps(cond.name)}}</h6>
        <p v-if="cond.left < 7">Local sources claim efforts to deal with the {{cond.name}} have been successful and are winding down.</p>
        <p v-if="cond.left < 30">Unnamed government officials say efforts to combat the {{cond.name}} are underway but have been largely unsuccessful thus far.</p>
        <p v-else>
          Government officials claim the situation is under control and urge calm over the ongoing {{cond.name}}.
          When asked why the {{cond.name}} continues unabated if the situation is contained, the same officials declined to comment.
        </p>

        <p v-if="cond.need.length">Officials are asking for any available shipping to assist with deliveries of {{cond.need.join(', ')}}.</p>
      </div></template>

      <div v-if="hasShortages" class="my-2">
        <h6 class="mini">High market demand reported</h6>
        <ul>
          <li v-for="item of shortages[body]" class="text-warning">
            {{$caps(item)}}
            <span v-if="shipments[item] && shipments[item][body]" class="mx-1 fst-italic text-muted">
              &mdash; relief arriving in {{$csn(shipments[item][body])}} days
            </span>
          </li>
        </ul>
      </div>

      <div v-if="hasSurpluses" class="my-2">
        <h6 class="mini">Surpluses reported</h6>
        <ul>
          <li v-for="item of surpluses[body]" class="text-success">{{$caps(item)}}</li>
        </ul>
      </div>
    </div>

    <p v-else class="ms-2">
      Nothing significant to report.
    </p>
  </div>
</template>

<script>
export default {
  props: ['body', 'title'],

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
