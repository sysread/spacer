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
  methods: {
    activate() {
      this.$emit('click');
      if (this.close) {
        const modalEl = this.$el.closest('.modal');
        if (modalEl && modalEl._bsModal) {
          modalEl._bsModal.hide();
        }
      }
    },
  },
};
</script>
