<template>
  <div class="row" :class="yClass"><slot /></div>
</template>

<script>
export default {
  props: ['y'],
  computed: {
    yClass() { return this.y ? 'py-' + this.y : 'py-1' },
  },
};
</script>
