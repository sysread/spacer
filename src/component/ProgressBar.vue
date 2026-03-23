<template>
  <div class="progress bg-dark">
    <div class="progress-bar bg-warning text-dark" :style="{'width': percent + '%'}">
      <template v-if="!hide_pct">{{$R(percent||0)}}%</template>
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  props: ['percent', 'width', 'hide_pct'],

  watch: {
    percent() {
      this.$nextTick(() => this.$emit('ready'));
    },
  },
};
</script>
