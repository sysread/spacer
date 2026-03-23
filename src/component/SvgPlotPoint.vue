<template>
  <g @click="click">
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
  props: ['layout', 'body', 'label', 'img', 'focus', 'coords', 'intvl'],
  emits: ['click'],

  data() {
    const [x, y] = this.layout.scale_point(system.position(this.body));
    const d = this.layout.scale_body_diameter(this.body);
    return {
      x: x,
      y: y,
      d: d,
      label_x: 0,
      label_y: 0,
      tween: null,
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
      const d = this.diameter;

      if (this.tween)
        this.tween.kill();

      this.tween = Tween(this.$data, this.intvl, {
        d: d,
        x: x - (d / 2),
        y: y - (d / 2),
        label_x: x + d + 10,
        label_y: y + d / 3,
      });

      this.tween.play();
    },
  },

  watch: {
    point:    { deep: true, handler() { this.update() } },
    diameter: function() { this.update() },
  },
};
</script>
