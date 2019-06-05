var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "vue"], function (require, exports, vue_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    vue_1 = __importDefault(vue_1);
    vue_1.default.component('row', {
        props: ['y'],
        computed: {
            yClass() {
                const y = this.y;
                return y ? 'py-' + y : 'py-1';
            },
        },
        template: '<div class="row" :class="yClass"><slot /></div>',
    });
    vue_1.default.component('cell', {
        props: ['brkpt', 'size', 'y'],
        computed: {
            classList() {
                return [this.colClass, this.yClass].join(' ');
            },
            yClass() {
                return this.y ? 'py-' + this.y : 'py-1';
            },
            colClass() {
                const parts = ['col'];
                if (this.brkpt)
                    parts.push(this.brkpt);
                if (this.size)
                    parts.push(this.size);
                return parts.length > 1 ? parts.join('-') : '';
            },
        },
        template: '<div :class="classList"><slot /></div>',
    });
    vue_1.default.component('term', { template: '<cell brkpt="sm" size=3><b><slot /></b></cell>' });
    vue_1.default.component('defn', { template: '<cell brkpt="sm" size=9 class="text-muted"><slot /></cell>' });
    vue_1.default.component('def', {
        props: ['term', 'def', 'caps', 'split', 'y', 'brkpt', 'info', 'show_info'],
        computed: {
            termSize() { return this.split || 4; },
            defnSize() { return 12 - this.termSize; },
        },
        template: `
<row :y="y">
  <cell :brkpt="brkpt" :size="termSize" :y="y" class="font-weight-bold" :class="{'text-capitalize': caps}">
    {{term}}
    <slot name="term" />
    <info v-if="info || show_info" :title="term">
      {{info}}
      <slot name="info" />
    </info>
  </cell>

  <cell :brkpt="brkpt" :size="defnSize" :y="y" class="text-muted" :class="{'text-capitalize': caps}">
    {{def}}
    <slot name="def" />
    <slot />
  </cell>
</row>
  `,
    });
});
