<template>
  <Section title="News feeds">
    <p class="news-intro">
      As you walk through the public concourse, your eye is drawn to an ad,
      which proceeds to follow you from screen to screen. Between impassioned
      pleas for your hard-earned scrip, you are able to glean a few tidbits
      from the public news feeds.
    </p>

    <template v-for="(faction, idx) in factions" :key="faction">
    <NewsAd v-if="idx > 0" :key="'ad-'+idx" />
    <div class="news-faction">
      <div class="news-masthead">
        <Flag :faction="faction" :width="22" />
        <span class="news-masthead-name">{{factionName(faction)}}</span>
        <span class="news-masthead-date">{{game.date_str}}</span>
      </div>

      <div v-if="factionHasNews(faction)" class="news-stories">
        <!-- Faction-level: active conflicts -->
        <div v-for="c in factionConflicts(faction)" :key="c.name + c.proponent" class="news-story news-story-conflict">
          <span class="news-tag news-tag-conflict">CONFLICT</span>
          <div class="news-headline">{{c.proponent}} declares {{c.name}} against {{c.target}}</div>
        </div>

        <!-- Body-level news -->
        <template v-for="body in factionBodies[faction]" :key="body">
          <News v-if="bodyHasNews(body)" :body="body" :title="planetName(body)" :newsOrg="bodyNewsOrg[body].name" :tagline="bodyNewsOrg[body].tagline" />
        </template>
      </div>

      <div v-else class="news-quiet">All quiet on the {{factionName(faction)}} front.</div>
    </div>
    </template>
  </Section>
</template>

<script>
import * as util from '../util';
import { newsOrgs } from '../data/news';

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

    bodyNewsOrg() {
      const map = {};
      for (const body of this.bodies) {
        const orgs = newsOrgs[body];
        map[body] = orgs ? orgs[util.getRandomInt(0, orgs.length)] : null;
      }
      return map;
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

<style>
.news-intro {
  color: #999;
  font-style: italic;
  margin-bottom: 1.5rem;
}

.news-faction {
  margin-bottom: 0.5rem;
}

/* Faction masthead: styled as a news source header with a thin
   colored rule underneath to suggest a digital news terminal. */
.news-masthead {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 2px solid rgb(200, 0, 0);
  margin-bottom: 0.75rem;
}

.news-masthead-name {
  font: bold 1.1rem monospace;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.news-masthead-date {
  margin-left: auto;
  font: 0.75rem monospace;
  color: #666;
}

.news-stories {
  padding-left: 0.5rem;
}

/* Individual story card: left accent border color-coded by type */
.news-story {
  border-left: 3px solid #444;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
}

.news-story-conflict {
  border-left-color: #c44;
}

.news-story-crisis {
  border-left-color: #c44;
}

.news-story-market {
  border-left-color: rgb(200, 140, 50);
}

.news-story-surplus {
  border-left-color: #4a4;
}

/* Tag labels */
.news-tag {
  font: bold 0.65rem monospace;
  padding: 0.1rem 0.4rem;
  margin-right: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.news-tag-conflict {
  color: #c44;
  border: 1px solid #c44;
}

.news-tag-crisis {
  color: #c44;
  border: 1px solid #c44;
}

.news-tag-market {
  color: rgb(200, 140, 50);
  border: 1px solid rgb(200, 140, 50);
}

.news-tag-surplus {
  color: #4a4;
  border: 1px solid #4a4;
}

.news-headline {
  font: bold 0.9rem monospace;
  color: #ddd;
  display: inline;
}

.news-body {
  color: #aaa;
  margin-top: 0.3rem;
  line-height: 1.4;
}

.news-dateline {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font: bold 0.8rem monospace;
  color: #fff;
  text-transform: uppercase;
  padding: 0.25rem 0;
  border-bottom: 1px solid #333;
  margin-bottom: 0.5rem;
  margin-top: 0.75rem;
}

.news-quiet {
  color: #555;
  font-style: italic;
  padding: 0.4rem 0.5rem;
}
</style>
