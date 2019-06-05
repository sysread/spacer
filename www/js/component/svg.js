var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "vue", "../svgpath"], function (require, exports, vue_1, path) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    vue_1 = __importDefault(vue_1);
    path = __importStar(path);
    vue_1.default.component("SvgPlot", {
        props: ['offset_x', 'offset_y', 'width', 'height'],
        computed: {
            x() { return this.offset_x || 0; },
            y() { return this.offset_y || 0; },
            w() { return this.width || 0; },
            h() { return this.height || 0; },
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
    vue_1.default.component("SvgText", {
        props: ['x', 'y'],
        template: '<text :x="x" :y="y"><slot /></text>',
    });
    vue_1.default.component("SvgImg", {
        props: ['x', 'y', 'width', 'height', 'src'],
        template: '<image :x="x" :y="y" :width="width" :height="height" :xlink:href="src" />',
    });
    vue_1.default.component("SvgCircle", {
        props: ['cx', 'cy', 'r', 'opacity', 'line', 'color', 'bg'],
        template: `
    <circle :cx="cx || 0" :cy="cy || 0" :r="r || 0"
      :fill="bg || 'black'" :fill-opacity="opacity || 1"
      :stroke="color" :stroke-width="line || 0" />
  `,
    });
    vue_1.default.component('SvgPath', {
        props: ['points', 'color', 'line', 'smooth'],
        computed: {
            path() { return this.smooth ? path.bezier(this.points) : path.line(this.points); },
            stroke() { return this.color || 'white'; },
            width() { return this.line || '0.75px'; },
        },
        template: '<path fill="none" :stroke="stroke" :stroke-width="width" :d="path" />',
    });
});
