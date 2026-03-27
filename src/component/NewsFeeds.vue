<template>
  <Section title="News feeds">
    <p>
      As you walk through the public concourse, your eye is drawn to an ad,
      which proceeds to follow you from screen to screen. Between impassioned
      pleas for your hard-earned scrip, you are able to glean a few tidbits
      from the public news feeds.
    </p>

    <div v-for="faction in factions" :key="faction" class="my-3">
      <h4 class="section-title d-flex justify-content-between align-items-center">
        <span>{{factionName(faction)}}</span>
        <Flag :faction="faction" :width="30" />
      </h4>

      <div v-if="factionHasNews(faction)" class="section-content">
        <!-- Faction-level: active conflicts involving this faction -->
        <div v-if="factionConflicts(faction).length > 0" class="my-2 ms-2 px-2">
          <ul>
            <li v-for="c in factionConflicts(faction)" :key="c.name + c.proponent"
                :class="{'text-warning': c.target == faction, 'text-success': c.proponent == faction}">
              {{c.proponent}} has declared a {{c.name}} against {{c.target}}
            </li>
          </ul>
        </div>

        <!-- Body-level: conditions, shortages, surpluses -->
        <div v-for="body in factionBodies[faction]" :key="body">
          <template v-if="bodyHasNews(body)">
            <News :body="body" :title="planetName(body)" />
          </template>
        </div>
      </div>

      <p v-else class="fst-italic text-muted section-content">Nothing to report.</p>
    </div>
  </Section>
</template>

<script>
export default {
  computed: {
    bodies() { return Object.keys(this.data.bodies) },

    factions() {
      const seen = new Set();
      const result = [];
      for (const body of this.bodies) {
        const f = this.game.planets[body].faction.abbrev;
        if (!seen.has(f)) {
          seen.add(f);
          result.push(f);
        }
      }
      return result.sort();
    },

    factionBodies() {
      const map = {};
      for (const f of this.factions) {
        map[f] = this.bodies
          .filter(b => this.game.planets[b].faction.abbrev === f)
          .sort((a, b) => this.planetName(a).localeCompare(this.planetName(b)));
      }
      return map;
    },
  },

  methods: {
    planetName(body) {
      return this.game.planets[body].name;
    },

    factionName(abbrev) {
      return this.data.factions[abbrev].full_name;
    },

    factionConflicts(faction) {
      return this.game.get_conflicts()
        .filter(c => c.target == faction || c.proponent == faction);
    },

    bodyHasNews(body) {
      const p = this.game.planets[body];
      const resources = Object.keys(this.data.resources);

      const hasConditions = p.conditions && p.conditions.length > 0;

      const hasShortages = resources.some(i =>
        !this.data.resources[i].contraband
        && p.economy.hasSuperShortage(i)
        && p.economy.getStock(i) == 0
      );

      const hasSurpluses = resources.some(i =>
        !this.data.resources[i].contraband
        && p.economy.hasSuperSurplus(i)
        && p.economy.getStock(i) > 0
      );

      return hasConditions || hasShortages || hasSurpluses;
    },

    factionHasNews(faction) {
      return this.factionConflicts(faction).length > 0
          || this.factionBodies[faction].some(b => this.bodyHasNews(b));
    },
  },
};
</script>
