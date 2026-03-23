<template>
  <image :x="x" :y="y" :width="width" :height="height" :xlink:href="src" />
</template>

<script>
export default {
  props: ['x', 'y', 'width', 'height', 'src'],
};
</script>
