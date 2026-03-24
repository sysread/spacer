<template>
  <a :href="href || '#'"
      class="btn btn-dark"
      :class="{'btn-secondary': muted, 'disabled': disabled, 'w-100': block}"
      @click="activate()">
    <slot />
  </a>
</template>

<script>
export default {
  props: ['disabled', 'muted', 'block', 'close', 'href'],
  emits: ['click'],
  inject: { modalDismiss: { default: null } },
  methods: {
    activate() {
      this.$emit('click');
      if (this.close && this.modalDismiss) {
        this.modalDismiss();
      }
    },
  },
};
</script>
