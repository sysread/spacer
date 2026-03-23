<template>
<Section title="Politics">
<def v-for="faction of factions" :key="faction" caps="true" :term="faction">
  <template #def><span>
    {{label(faction)}}
    <span class="badge rounded-pill ms-2">{{$R(standing(faction))}}</span>
  </span></template>
</def>
</Section>
</template>

<script>
export default {
  props: ['person'],
  computed: {
    factions: function() {return Object.keys(this.data.factions)},
  },
  methods: {
    factionStanding: function(faction) {
      const label    = this.game.player.getStandingLabel(faction);
      const standing = this.game.player.getStanding(faction);
      return `${label} <span class="badge rounded-pill">${standing}</span>`;
    },
    standing: function(faction) {
      return this.game.player.getStanding(faction);
    },
    label: function(faction) {
      return this.game.player.getStandingLabel(faction);
    },
  },
};
</script>
