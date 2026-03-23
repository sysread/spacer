<template>
  <modal @close="$emit('pick', choice)" static=true>
    <p><slot /></p>
    <btn v-for="(msg, id) in choices" :key="id" @click="pick(id)" block=1 close=1>
      {{msg}}
    </btn>
  </modal>
</template>

<script>
export default {
  props: ['choices'],
  data() { return { choice: null } },
  methods: {
    pick(id) {
      this.choice = id;
      this.$emit('pick', id);
    },
  },
};
</script>
