<template>
  <planet-summary :planet="planet" showtitle=1 />
</template>

<script>
export default {
  computed: {
    planet() { return this.game.here },
  },
};
</script>
