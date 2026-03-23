<template>
  <div :style="css"></div>
</template>

<script>
export default {
  props: ['faction', 'top', 'right', 'width'],

  computed: {
    path() { return 'img/flag-' + this.faction.toLowerCase() + '.png' },

    css() {
      const top    = 62 + (this.top || 0);   // status bar is 47.62px + 15px body padding
      const right  = 31 + (this.right || 0); // 15px body padding, 16px card padding
      const width  = this.width || 100;
      const height = width * 0.625;

      return `
        background-image:    url("${this.path}");
        background-repeat:   no-repeat;
        background-position: center;
        background-size:     ${width}px ${height}px;
        width:               ${width + 2}px;
        height:              ${height + 2}px;
        opacity:             1.0;
        background-color:    #333;
        position:            fixed;
        top:                 ${top}px;
        right:               ${right}px;
      `
    },
  },
};
</script>
