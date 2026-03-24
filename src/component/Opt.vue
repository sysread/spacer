<template>
  <btn block=1 :close="final" :disabled="disabled" @click="onClick" class="text-start">
    <slot />
  </btn>
</template>

<script>
export default {
  props: ['val', 'final', 'disabled'],
  emits: ['click'],
  inject: ['menuAnswer'],

  methods: {
    onClick() {
      this.$emit('click', this.val);
      if (this.menuAnswer) {
        this.menuAnswer(this.val);
      }
    },
  },
};
</script>
