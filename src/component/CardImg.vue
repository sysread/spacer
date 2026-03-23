<template>
  <img class="card-img-top" :src="src" :alt="alt">
</template>

<script>
export default {
  props: ['src', 'alt'],
};
</script>
