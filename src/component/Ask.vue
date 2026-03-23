<template>
  <modal @close="onClose" static=true>
    <p><slot /></p>
    <btn v-for="(msg, id) in choices" :key="id" @click="pick(id)" block=1 close=1>
      {{msg}}
    </btn>
  </modal>
</template>

<script>
export default {
  props: ['choices'],
  data() { return { choice: null, picked: false } },
  methods: {
    pick(id) {
      this.choice = id;
      this.picked = true;
      this.$emit('pick', id);
    },
    onClose() {
      // Only emit on close if no button was clicked (e.g. backdrop dismiss).
      // Otherwise pick() already emitted.
      if (!this.picked) {
        this.$emit('pick', this.choice);
      }
    },
  },
};
</script>
