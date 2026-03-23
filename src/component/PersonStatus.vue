<template>
<Section title="Player">
<template #title-pre><Flag :width="50" :faction="person.faction.abbrev" class="m-1" /></template>

<def term="Name" :def="name" />
<def term="Money" :def="$unit($csn(money), 'c')" />
<def term="Home" :def="$caps(home)" />
<def term="Faction" :def="$caps(faction)" />
<def term="Thrust endurance" :def="$unit($R(accel, 2), 'G')" />

<div class="my-2">
  <btn @click="openOptions">Options</btn>
  <btn @click="newGameConfirm" class="mx-2">New Game</btn>
</div>

<confirm v-if="show_confirm" yes="Yes" no="No" @confirm="newGame">
  Delete this game and begin a new game? This cannot be undone.
</confirm>
</Section>
</template>

<script>
import Physics from '../physics';

export default {
  props: ['person'],

  data() {
    return {
      show_confirm: false,
    };
  },

  computed: {
    name:    function() {return this.person.name},
    money:   function() {return Math.floor(this.person.money)},
    home:    function() {return this.data.bodies[this.person.home].name},
    faction: function() {return this.person.faction.full_name},
    accel:   function() {return this.person.maxAcceleration() / Physics.G },
  },

  methods: {
    openOptions: function() {
      this.$emit('open', 'options');
    },

    newGameConfirm: function() {
      this.show_confirm = true;
    },

    newGame: function(confirmed) {
      if (confirmed) {
        this.$emit('open', 'newgame');
      } else {
        this.show_confirm = false;
      }
    },
  },
};
</script>
