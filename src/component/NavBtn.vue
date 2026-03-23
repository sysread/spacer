<template>
  <button type="button" :style="btn_style" class="btn-dark" @click="$emit('click')" :disabled="disabled">
    <img :src="src" :style="img_style" />
  </button>
</template>

<script>
export default {
  props: ['name', 'active', 'disabled'],

  computed: {
    src()       { return 'img/' + this.name + '.png' },
    width()     { return 50                          },
    btn_width() { return 50                          },
    img_width() { return this.btn_width - 12         }, // less padding px

    btn_style() {
      const style = {
        width: this.btn_width + 'px',
        height: this.btn_width + 'px',
        padding: '0 6px 0 6px',
        border: '1px solid black',
        'background-color': '#161616',
        'border-bottom': '1px solid rgb(200,0,0)',
      };

      if (this.disabled) {
        style['background-color'] = '#202020';
      }

      if (this.active) {
        style['background-color'] = '#790000';
      }

      return style;
    },

    img_style() {
      const style = {
        width: this.img_width + 'px',
        height: this.img_width + 'px',
        filter: 'invert(100%)',
      };

      if (this.disabled) {
        style.filter += ' opacity(0.25)';
      }

      return style;
    },
  },
};
</script>
