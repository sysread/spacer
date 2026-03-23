<template>
  <btn block=1 :close="final" :disabled="disabled" @click="onClick" class="text-start">
    <slot />
  </btn>
</template>

<script>
export default {
  props: ['val', 'final', 'disabled'],

  methods: {
    onClick() {
      this.$emit('click', this.val);
      this.$parent.$emit('answer', this.val);
    },
  },
};
</script>
