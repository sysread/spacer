<template>
  <g @click="click">
    <!-- Soft radial glow behind dark/transparent body images that
         would otherwise be invisible against the starfield background. -->
    <defs v-if="glow && d > 0">
      <radialGradient :id="'glow-' + body">
        <stop offset="0%" :stop-color="glow" stop-opacity="0.5" />
        <stop offset="100%" :stop-color="glow" stop-opacity="0" />
      </radialGradient>
    </defs>
    <circle v-if="glow && d > 0"
      :cx="x + d/2" :cy="y + d/2" :r="d * 0.9"
      :fill="'url(#glow-' + body + ')'" />
    <SvgImg v-if="img" :src="img" :height="d" :width="d" :x="x" :y="y" />

    <SvgText v-if="show_label" :class="label_class" :x="label_x" :y="label_y">
      {{$caps(body)}}
    </SvgText>
  </g>
</template>

<script>
import system from '../system';
import Tween from '../tween';

export default {
  props: ['layout', 'body', 'label', 'img', 'focus', 'coords', 'intvl', 'glow'],
  emits: ['click'],

  data() {
    const pos = this.coords || system.position(this.body);
    const [px, py] = this.layout.scale_point(pos);
    const d = this.layout.scale_body_diameter(this.body);
    const x = isFinite(px) ? px : 0;
    const y = isFinite(py) ? py : 0;
    const dd = isFinite(d) ? d : 0;
    return {
      x: x - (dd / 2),
      y: y - (dd / 2),
      d: dd,
      label_x: x + dd + 10,
      label_y: y + dd / 3,
      tween: null,
      _mounted: false,
    };
  },

  computed: {
    label_class() { return this.focus ? 'plot-label-hi' : 'plot-label' },
    diameter()    { return this.layout.scale_body_diameter(this.body) },

    point() {
      if (this.layout) {
        if (this.coords) {
          return this.layout.scale_point(this.coords);
        } else {
          return this.layout.scale_point(this.system.position(this.body))
        }
      }
      else {
        return [0, 0];
      }
    },

    show_label() {
      if (this.label) {
        if (this.diameter >= this.layout.width_px * 0.75) {
          return false;
        }

        return true;
      }

      return false;
    },
  },

  methods: {
    click() {
      this.$emit('click');
    },

    update() {
      const [x, y] = this.point;
      // Compute diameter directly from layout instead of using the cached
      // computed property. The layout's fov_au changes in GSAP's onUpdate
      // which isn't visible to Vue's reactivity — the computed would
      // return a stale value, causing the label to lag behind the body.
      const d = this.layout.scale_body_diameter(this.body);

      // Always snap to position rather than tweening. The high-resolution
      // orbit sub-steps (4x per turn) provide smooth inter-turn motion;
      // adding a tween on top causes elastic effects when multiple sub-step
      // updates overlap with the previous tween still in flight.
      this.d = d;
      this.x = x - (d / 2);
      this.y = y - (d / 2);
      this.label_x = x + d + 10;
      this.label_y = y + d / 3;
    },
  },

  watch: {
    point:    { deep: true, handler() { this.update() } },
    diameter: function() { this.update() },
  },
};
</script>
