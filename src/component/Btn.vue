<template>
  <button type="button" :class="classes" :disabled="disabled" @click="activate()">
    <slot />
  </button>
</template>

<script>
export default {
  props: ['disabled', 'muted', 'highlight', 'block', 'close'],
  emits: ['click'],

  methods: {
    activate() {
      if (this.disabled) return;

      this.$emit('click');

      // Dismiss the parent modal programmatically instead of using
      // data-bs-dismiss. BS5's native dismiss races with Vue's click
      // handler, causing events to be lost.
      if (this.close) {
        const modalEl = this.$el.closest('.modal');
        if (modalEl && modalEl._bsModal) {
          modalEl._bsModal.hide();
        }
      }
    },
  },

  computed: {
    classes() {
      return {
        'btn':           true,
        'btn-dark':      true,
        'btn-highlight': !this.disabled && this.highlight,
        'btn-secondary': this.muted,
        'disabled':      this.disabled,
        'w-100':         this.block,
        'd-block':       this.block,
        'text-muted':    this.muted,
      };
    },
  },
};
</script>
