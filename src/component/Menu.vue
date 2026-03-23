<template>
  <div class="py-3">
    <slot />
  </div>
</template>

<script>
export default {
  props: ['title', 'close'],

  provide() {
    return {
      menuAnswer: (val) => this.$emit('answer', val),
    };
  },
};
</script>
