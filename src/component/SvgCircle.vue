<template>
  <circle :cx="cx || 0" :cy="cy || 0" :r="r || 0"
    :fill="bg || 'black'" :fill-opacity="opacity || 1"
    :stroke="color" :stroke-width="line || 0" />
</template>

<script>
export default {
  props: ['cx', 'cy', 'r', 'opacity', 'line', 'color', 'bg'],
};
</script>
