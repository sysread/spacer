<template>
  <SvgCircle v-if="r > 0 && opacity" :cx="x" :cy="y" :r="r" :bg="color" :opacity="opacity" />
</template>

<script>
import Physics from '../physics';
import system from '../system';
import * as util from '../util';
import Tween from '../tween';

export default {
  props: ['body', 'layout', 'coords', 'intvl'],

  data() {
    const [x, y] = this.layout.scale_point(system.position(this.body));
    return {
      x: x,
      y: y,
      r: this.radius,
      tween: null,
    };
  },

  computed: {
    faction() {
      return this.data.bodies[this.body].faction;
    },

    point() {
      if (this.layout) {
        if (this.coords) {
          return this.layout.scale_point(this.coords);
        } else {
          return this.layout.scale_point(this.system.position(this.body));
        }
      }
      else {
        return [0, 0];
      }
    },

    radius_au() {
      return this.game.planets[this.body]
        ? this.game.planets[this.body].encounters.patrolRadius()
        : 0;
    },

    radius() {
      return this.layout.scale_length(this.radius_au * Physics.AU);
    },

    opacity() {
      if (this.game.options.hidePatrolRadius)
        return 0;

      if (this.radius_au > this.layout.fov_au)
        return 0;

      if (this.data.bodies[this.body]) {
        const a = 0.1 * this.data.factions[this.faction].patrol;
        return util.clamp(a, 0.1, 0.25);
      }

      return 0;
    },

    standing() {
      return this.game.player.getStanding(this.data.bodies[this.body].faction);
    },

    color() {
      if (this.game.planets[this.body] && this.game.planets[this.body].hasTradeBan)
        return 'red';

      const s = this.standing;

      if (s <= -29)
        return 'red';

      if (s < -9)
        return '#DAD49B';

      return '#60D65D';
    },
  },

  methods: {
    update() {
      const [x, y] = this.point;
      const r = this.radius;

      if (this.tween)
        this.tween.kill();

      this.tween = Tween(this.$data, this.intvl, {x: x, y: y, r: r});
      this.tween.play();
    },
  },

  watch: {
    point:  { deep: true, handler() { this.update() } },
    radius: function() { this.update() },
  },
};
</script>
