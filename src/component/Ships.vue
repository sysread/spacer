<template>
<Section title="Ships">
<div>
  <btn @click="returnToShipyard">Shipyard</btn>
  <btn @click="clearSelection" v-if="selected">Show room</btn>
</div>

<template v-for="ship in ships" :key="ship"><ship v-if="!selected || selected == ship" :type="ship" :detail="ship == selected" @click="selectShip(ship)" /></template>
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
    ships() { return Object.keys(this.data.shipclass) },
  },

  methods: {
    returnToShipyard() {
      this.$emit('open', 'shipyard');
    },

    selectShip(ship) {
      if (this.selected == ship) {
        this.selected = null;
      } else {
        this.selected = ship;
      }
    },

    clearSelection() {
      this.selected = null;
    },
  },
};
</script>
