<template>
  <Section title="Fabricators">
    <template v-if="!selected">
      <p>
        A triumph of cybernetics, the von Neumann fabricators are able to
        manufacture nearly anything, given the necessary materials and plans...
        and a small fee, of course.
      </p>

      <p>
        Use of the fabricators is based on the value of the resource being
        manufactured and increases based on the availability of fabricator
        resources themselves, faction tax rate, a small usage fee, and
        faction standing.
      </p>

      <p>
        {{availability}}% of fabricator capacity is available at this time.
      </p>

      <template v-for="item of resources">
        <btn block=1 @click="select(item)" class="my-2 py-2" :muted="!can_craft(item)">
          {{$caps(item)}}
        </btn>
      </template>
    </template>

    <template v-else>
      <p>
        {{availability}}% of fabricator capacity is available at this time.
      </p>

      <fabrication :item="selected" @close="clear" />
    </template>
  </Section>
</template>

<script>
export default {
  data() {
    return {
      selected: null,
    };
  },

  computed: {
    planet() { return this.game.here },
    player() { return this.game.player },
    availability() { return this.planet.fabrication.fabricationAvailability() },

    resources() {
      return Object.keys(this.data.resources)
        .filter( (k) => this.data.resources[k].hasOwnProperty('recipe') );
    },
  },

  methods: {
    clear()         { this.selected = null },
    is_shown(item)  { return item === this.selected },
    can_craft(item) { return this.player.canCraft(item) > 0 },

    select(item) {
      if (this.is_shown(item)) {
        this.clear();
      } else {
        this.selected = item;
      }
    },
  },
};
</script>
