<template>
  <button type="button" :class="classes" :disabled="disabled" @click="activate()">
    <slot />
  </button>
</template>

<script>
export default {
  props: ['disabled', 'muted', 'highlight', 'block', 'close'],
  emits: ['click'],
  inject: { modalDismiss: { default: null } },

  methods: {
    activate() {
      if (this.disabled) return;

      this.$emit('click');

      if (this.close && this.modalDismiss) {
        this.modalDismiss();
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
