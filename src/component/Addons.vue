<template>
<Section title="Equipment and upgrades">
<btn @click="returnToShipyard">Shipyard</btn>

<p class="my-3">
  You have {{hardpoints}} unused hard points to which upgrades may be installed.
</p>

<addon v-for="addon in addons" :key="addon" :type="addon" />
</Section>
</template>

<script>
export default {
  computed: {
    addons()     { return Object.keys(this.data.addons) },
    hardpoints() { return this.game.player.ship.availableHardPoints() },
  },

  methods: {
    returnToShipyard() { this.$emit('open', 'shipyard') },
  },
};
</script>
