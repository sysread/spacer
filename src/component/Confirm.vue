<template>
  <ask :choices="choices" @pick="trigger"><slot /></ask>
</template>

<script>
export default {
  props: ['yes', 'no'],

  methods: {
    trigger(choice) { this.$emit('confirm', choice === 'Y') },
  },

  computed: {
    choices() { return {'Y': this.yes || 'Yes', 'N': this.no || 'No' } },
  },
};
</script>
