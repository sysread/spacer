<template>
  <img :src="path" :style="css" />
</template>

<script>
export default {
  props: ['faction', 'width'],

  computed: {
    path() { return 'img/flag-' + this.faction.toLowerCase() + '.png' },

    css() {
      return {
        'width': this.width + 'px',
        'border': '1px solid #333',
      };
    },
  },
};
</script>
