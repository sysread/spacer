<template>
  <SvgText class="plot-legend" :x="x" :y="y"><slot /></SvgText>
</template>

<script>
export default {
  props: ['x', 'y'],
};
</script>
