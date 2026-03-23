<template>
  <modal :title="title" close="OK" :xclose="!!title" @close="$emit('ok')">
    <p><slot /></p>
  </modal>
</template>

<script>
export default {
  props: ['title'],
};
</script>
