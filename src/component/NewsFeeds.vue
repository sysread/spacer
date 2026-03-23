<template>
  <Section title="News feeds">
    <p>
      As you walk through the public concourse, your eye is drawn to an ad,
      which proceeds to follow you from screen to screen. Between impassioned
      pleas for your hard-earned scrip, you are able to glean a few tidbits
      from the public news feeds.
    </p>

    <btn block=1 @click="show_conflicts=true" class="my-3">Active Conflicts</btn>
    <modal v-if="show_conflicts" xclose=1 title="Active Conflicts" @close="show_conflicts=false">
      <Conflicts />
    </modal>

    <btn block=1 @click="next_body" class="text-start">
      {{name}}
      <span v-if="body == game.locus" class="m-1 text-warning fw-bold">&target;</span>
      <badge right=1 class="mx-1">{{faction}}</badge>
      <badge right=1 v-if="is_moon" class="ms-1">{{kind}}</badge>
    </btn>

    <News :body="body" />
  </Section>
</template>

<script>
export default {
  data() {
    return {
      index: null,
      show_conflicts: false,
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
};
</script>
