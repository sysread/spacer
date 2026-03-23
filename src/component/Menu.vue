<template>
  <div @answer="onAnswer" class="py-3">
    <slot />
  </div>
</template>

<script>
export default {
  props: ['title', 'close'],

  methods: {
    onAnswer(val) {
      this.$emit('answer', val);
    },
  },
};
</script>
