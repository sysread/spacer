<template>
  <SvgCircle v-if="r > 0 && opacity" :cx="x" :cy="y" :r="r" :bg="color" :opacity="opacity" />
</template>

<script>
import Physics from '../physics';
import system from '../system';
import * as util from '../util';

export default {
  props: ['body', 'layout', 'coords', 'intvl', 'tick'],

  computed: {
    // Screen position driven by tick for same-frame evaluation as
    // sibling transit dots. See SvgPlotPoint for explanation.
    screenPos() {
      void this.tick;
      const pos = this.coords || system.position(this.body);
      return this.layout.scale_point(pos);
    },

    x() { return this.screenPos[0] },
    y() { return this.screenPos[1] },

    r() {
      void this.tick;
      return this.layout.scale_length(this.radius_au * Physics.AU);
    },

    faction() {
      return this.data.bodies[this.body].faction;
    },

    radius_au() {
      return this.game.planets[this.body]
        ? this.game.planets[this.body].encounters.patrolRadius()
        : 0;
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

};
</script>
