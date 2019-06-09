define(function(require, exports, module) {
  "use strict"

  const Vue = require('vendor/vue');
  const path = require('svgpath');

  require('component/global');
  require('component/common');


  Vue.component("SvgPlot", {
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

    template: `
      <svg :viewBox="viewbox" class="plot" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <slot />
      </svg>
    `,
  });


  Vue.component("SvgText", {
    props: ['x', 'y'],
    template: '<text :x="x" :y="y"><slot /></text>',
  });


  Vue.component("SvgImg", {
    props: ['x', 'y', 'width', 'height', 'src'],
    template: '<image :x="x" :y="y" :width="width" :height="height" :xlink:href="src" />',
  });


  Vue.component("SvgCircle", {
    props: ['cx', 'cy', 'r', 'opacity', 'line', 'color', 'bg'],

    template: `
      <circle :cx="cx || 0" :cy="cy || 0" :r="r || 0"
        :fill="bg || 'black'" :fill-opacity="opacity || 1"
        :stroke="color" :stroke-width="line || 0" />
    `,
  });


  Vue.component('SvgPath', {
    props: ['points', 'color', 'line', 'smooth'],

    computed: {
      path()   { return this.smooth ? path.bezier(this.points) : path.line(this.points) },
      stroke() { return this.color || 'white' },
      width()  { return this.line || '0.75px' },
    },

    template: '<path fill="none" :stroke="stroke" :stroke-width="width" :d="path" />',
  });
});
