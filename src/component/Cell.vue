<template>
  <div :class="classList"><slot /></div>
</template>

<script>
export default {
  props: ['brkpt', 'size', 'y'],
  computed: {
    classList() { return [this.colClass, this.yClass].join(' ') },
    yClass()    { return this.y ? 'py-' + this.y : 'py-1' },
    colClass() {
      const parts = ['col'];
      if (this.brkpt) parts.push(this.brkpt);
      if (this.size)  parts.push(this.size);
      return parts.length > 1 ? parts.join('-') : '';
    },
  },
};
</script>
