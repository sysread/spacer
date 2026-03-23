<template>
  <g>
    <SvgPath :points="dest_path" color="red" :smooth="true" />
    <SvgPath :points="path" color="green" :smooth="true" />
  </g>
</template>

<script>
export default {
  props: ['transit', 'layout'],

  computed: {
    path() {
      const points = this.transit.path.map(p => p.position);
      return this.layout.scale_path(points);
    },

    dest_path() {
      const orbit = this.system.orbit_by_turns(this.transit.dest);
      const path  = orbit.slice(0, this.transit.turns + 1);
      return this.layout.scale_path(path);
    },

    line() {
      const points = this.layout.scale_path(this.transit.path.map(p => p.position));
      return points.map(p => [p[0], p[1]]).map(p => p.join(',')).join(' ');
    },
  },
};
</script>
