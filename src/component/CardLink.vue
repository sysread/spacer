<template>
  <a @click="$emit('click')" class="card-link" :href="href"><slot /></a>
</template>

<script>
export default {
  props: ['to'],
  computed: {
    href() { return this.to || '#' },
  },
};
</script>
