<template>
  <SvgPath :points="path" :color="color" line="0.75px" :smooth="true" />
</template>

<script>
export default {
  props: ['layout', 'body'],

  computed: {
    path()  { return this.layout.scale_path(this.orbit) },
    color() { return '#333333' },

    orbit() {
      return this.system.orbit(this.body)
        .relativeToTime(this.game.date.getTime())
        .absolute
    },
  },
};
</script>
