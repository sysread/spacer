<template>
  <path fill="none" :stroke="stroke" :stroke-width="width" :d="path" />
</template>

<script>
import * as svgpath from '../svgpath';

export default {
  props: ['points', 'color', 'line', 'smooth'],

  computed: {
    path()   { return this.smooth ? svgpath.bezier(this.points) : svgpath.line(this.points) },
    stroke() { return this.color || 'white' },
    width()  { return this.line || '0.75px' },
  },
};
</script>
