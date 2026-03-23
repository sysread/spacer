<template>
  <div id="navcomp-map-root" class="plot-root border border-dark">
    <div class="plot-root-bg" :class="bg_class()" :style="bg_css()"></div>

    <SvgPlot v-if="layout" :width="layout.width_px" :height="layout.height_px">
      <PlotLegend :x="x" :y="y(1)">FoV:&nbsp;&nbsp;{{$unit($R(layout.fov_au * 2, 4), 'AU')}}</PlotLegend>

      <template v-if="transit">
        <PlotLegend :x="x" :y="y(2)" style="fill: yellow">Dest.&nbsp;{{$caps(transit.dest)}}</PlotLegend>
        <PlotLegend :x="x" :y="y(3)">Dist.&nbsp;{{$unit($R(transit.segment_au, 4), 'AU')}}</PlotLegend>
        <PlotLegend :x="x" :y="y(4)">&Delta;V:&nbsp;&nbsp;&nbsp;{{$unit($R(transit.accel_g, 3), 'G')}}</PlotLegend>
        <PlotLegend :x="x" :y="y(5)">MaxV:&nbsp;{{$unit($csn($R(transit.maxVelocity/1000)), 'km/s')}}</PlotLegend>
        <PlotLegend :x="x" :y="y(6)">Fuel:&nbsp;{{$R(transit.fuel, 2)}}</PlotLegend>
        <PlotLegend :x="x" :y="y(7)">Time:&nbsp;{{transit.str_arrival}}</PlotLegend>
      </template>

      <slot name="svg" />
    </SvgPlot>

    <slot />
  </div>
</template>

<script>
export default {
  props: ['layout', 'transit'],

  computed: {
    x() { return 5 },
  },

  methods: {
    y(n) { return (n * 17) },

    bg_css() {
      return {
        width:  this.layout ? this.layout.width_px  + 'px' : '100%',
        height: this.layout ? this.layout.height_px + 'px' : '100%',
      };
    },

    bg_class() {
      return {
        'plot-root-with-galaxy': !this.game.options.hideMapBackground,
      };
    },
  },
};
</script>
