<template>
  <svg :viewBox="viewbox" class="plot" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <slot />
  </svg>
</template>

<script>
export default {
  props: ['offset_x', 'offset_y', 'width', 'height'],

  computed: {
    x() { return this.offset_x || 0 },
    y() { return this.offset_y || 0 },
    w() { return this.width    || 0 },
    h() { return this.height   || 0 },

    viewbox() {
      return `${this.x} ${this.y} ${this.w} ${this.h}`;
    },
  },
};
</script>
