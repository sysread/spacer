<template>
  <span class="badge rounded-pill" :class="{'float-end': right}"><slot /></span>
</template>

<script>
export default {
  props: ['right'],
};
</script>
