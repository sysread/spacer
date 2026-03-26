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

export default {
  props: ['layout', 'body', 'label', 'img', 'focus', 'coords', 'intvl', 'glow', 'tick'],
  emits: ['click'],

  computed: {
    label_class() { return this.focus ? 'plot-label-hi' : 'plot-label' },

    // Screen position and diameter are computed properties that depend
    // on `tick`. The layout's fov_au and offsets are set by GSAP outside
    // Vue's reactivity — without the tick dependency, these computeds
    // would serve stale cached values. The tick prop (from Transit's
    // _renderTick) changes every GSAP frame, forcing re-evaluation in
    // the SAME render pass as the parent's transit path dots. This
    // eliminates the one-frame lag that watcher-based updates had.
    screenPos() {
      void this.tick; // force re-evaluation each GSAP frame
      const pos = this.coords || system.position(this.body);
      return this.layout.scale_point(pos);
    },

    d() {
      void this.tick;
      return this.layout.scale_body_diameter(this.body);
    },

    x()       { return this.screenPos[0] - this.d / 2 },
    y()       { return this.screenPos[1] - this.d / 2 },
    label_x() { return this.screenPos[0] + this.d + 10 },
    label_y() { return this.screenPos[1] + this.d / 3 },

    show_label() {
      if (this.label) {
        if (this.d >= this.layout.width_px * 0.75) {
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
  },
};
</script>
