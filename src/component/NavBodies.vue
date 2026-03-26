<template>
  <g>
    <g v-for="body of bodies">
      <SvgOrbitPath v-if="show_orbit(body)" :key="body+'-orbit'" :body="body" :layout="layout" />
      <SvgPatrolRadius :key="body + '-patrol'" :body="body" :layout="layout" />
    </g>

    <SvgPlotPoint
      v-for="(info, body) of plot_points"
      :key="body"
      :body="body"
      :layout="layout"
      :label="info.label"
      :diameter="info.diameter"
      :pos="info.point"
      :img="'img/' + body + '.png'"
      :focus="is_focus(body)"
      :glow="body === 'trojans' ? '#dda030' : null"
      @click="click(body)" />
  </g>
</template>

<script>
import Physics from '../physics';

export default {
  props: ['focus', 'layout'],
  emits: ['click'],

  computed: {
    fov() { return this.layout.fov_au },

    is_zoomed() {
      return this.layout.fov_au < 0.25;
    },

    bodies() {
      const seen   = {};
      const bodies = [];

      for (const body of this.system.bodies()) {
        if (!seen[body]) {
          seen[body] = true;

          if (this.is_visible(body))
            bodies.push(body);

          const central = this.system.central(body);

          if (central != 'sun' && !seen[central]) {
            seen[central] = true;

            if (this.is_visible(central))
              bodies.push(central);
          }
        }
      }

      return bodies;
    },

    plot_points() {
      if (this.layout) {
        const bodies = {};

        if (this.layout.is_visible([0, 0])) {
          const p_sun = this.layout.scale_point([0, 0]);
          const d_sun = this.layout.scale_body_diameter('sun');
          p_sun[0] -= d_sun / 2;
          p_sun[1] -= d_sun / 2;

          bodies.sun = {
            point:    p_sun,
            diameter: d_sun,
            label:    false,
          };
        }

        for (const body of this.bodies) {
          const pos = this.system.position(body);

          if (this.layout.is_visible(pos)) {
            const p = this.layout.scale_point(pos);
            const d = this.layout.scale_body_diameter(body);

            // center the point against the image
            p[0] -= d / 2;
            p[1] -= d / 2;

            bodies[body] = {
              point:    p,
              diameter: d,
              label:    this.show_label(body) ? this.system.name(body) : '',
            };
          }
        }

        return bodies;
      }
    },
  },

  methods: {
    is_visible(body) {
      const orbit = this.system.orbit(body).absolute;

      for (let i = 0; i < orbit.length; ++i) {
        if (this.layout.is_visible(orbit[i])) {
          return true;
        }
      }

      return false;
    },

    is_moon(body) {
      return this.system.central(body) != 'sun';
    },

    show_orbit(body) {
      if (this.game.options.hideOrbitPaths)
        return false;

      if (body == 'trojans')
        return false; // same as jupiter's

      if (this.is_moon(body))
        return this.is_zoomed;

      return !this.is_zoomed;
    },

    show_label(body) {
      if (this.is_focus(body))
        return true;

      const central = this.system.central(body);
      if (this.system.central(this.focus) == body)
        return false;

      const position = this.system.position(body);
      const center   = central == 'sun' ? [0, 0] : this.system.position(central);
      const distance = Physics.distance(position, center) / Physics.AU;
      return distance > this.layout.fov_au / 5;
    },

    is_focus(body) {
      return body == this.focus;
    },

    click(body) {
      this.$emit('click', body);
    },
  },
};
</script>
