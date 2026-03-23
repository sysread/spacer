<template>
  <text :x="x" :y="y"><slot /></text>
</template>

<script>
export default {
  props: ['x', 'y'],
};
</script>
