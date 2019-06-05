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
define(["require", "exports", "vue", "../util", "../physics", "gsap"], function (require, exports, vue_1, util, physics_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    vue_1 = __importDefault(vue_1);
    util = __importStar(util);
    physics_1 = __importDefault(physics_1);
    vue_1.default.filter("csn", (value) => util.csn(value).toString());
    vue_1.default.filter("R", (value, places) => util.R(value, places));
    vue_1.default.filter("pct", (value, places) => util.pct(value, places));
    vue_1.default.filter("unit", (value, unit) => value.toString() + ' ' + unit);
    vue_1.default.filter("name", (value) => value.replace(/_/g, ' ')),
        vue_1.default.filter("caps", (value) => util.ucfirst(value)),
        vue_1.default.filter("lower", (value) => value.toString().replace(/\b([A-Z])/g, (str) => str.toLowerCase()));
    vue_1.default.filter("AU", (value) => value / physics_1.default.AU);
    vue_1.default.filter("yn", (value) => value ? 'yes' : 'no');
    vue_1.default.filter("abs", (value) => Math.abs(value || 0));
    vue_1.default.component('caps', { template: '<span class="text-capitalize"><slot /></span>' });
    vue_1.default.component('lc', { template: '<span class="text-lowercase"><slot /></span>' });
    vue_1.default.component('uc', { template: '<span class="text-uppercase"><slot /></span>' });
    vue_1.default.component('green', { template: '<span class="text-success"><slot /></span>' });
    vue_1.default.component('gold', { template: '<span class="text-warning"><slot /></span>' });
    vue_1.default.component('red', { template: '<span class="text-danger"><slot /></span>' });
    vue_1.default.component('badge', {
        props: ['right'],
        template: '<span class="badge badge-pill" :class="{\'float-right\': right}"><slot /></span>',
    });
    vue_1.default.component('progress-bar', {
        props: ['percent', 'width', 'frame_rate', 'hide_pct'],
        watch: {
            percent() {
                window.TweenLite.to(this.$el, this.rate, {
                    value: this.percent,
                    ease: window.Sine.easeInOut,
                    onComplete: () => { this.$emit('ready'); },
                }).play();
            },
        },
        computed: {
            rate() {
                return this.frame_rate === undefined ? 0.5 : this.frame_rate;
            }
        },
        template: `
    <div class="progress bg-dark">
      <div class="progress-bar bg-warning text-dark" :style="{'width': percent + '%'}">
        <template v-if="!hide_pct">{{(percent||0)|R}}%</template>
        <slot />
      </div>
    </div>
  `,
    });
    vue_1.default.component('btn', {
        props: ['disabled', 'muted', 'highlight', 'block', 'close'],
        methods: {
            activate: function () {
                if (!this.disabled) {
                    this.$emit('click');
                }
            }
        },
        computed: {
            classes() {
                return {
                    'btn': true,
                    'btn-dark': true,
                    'btn-highlight': !this.disabled && this.highlight,
                    'btn-secondary': this.muted,
                    'disabled': this.disabled,
                    'btn-block': this.block,
                    'text-muted': this.muted,
                };
            },
        },
        template: `
    <button type="button" :class="classes" :data-dismiss="close ? 'modal' : ''" :disabled="disabled" @click="activate()" >
      <slot />
    </button>
  `,
    });
    vue_1.default.component('ask', {
        props: ['choices'],
        data: function () { return { choice: null }; },
        template: `
<modal @close="$emit('pick', choice)" static=true>
  <p><slot/></p>
  <btn v-for="(msg, id) in choices" :key="id" @click="choice=id" block=1 close=1>
    {{msg}}
  </btn>
</modal>
  `
    });
    vue_1.default.component('ok', {
        props: ['title'],
        template: `
<modal :title="title" close="OK" :xclose="!!title" @close="$emit('ok')">
  <p><slot/></p>
</modal>
  `,
    });
    vue_1.default.component('confirm', {
        props: ['yes', 'no'],
        methods: {
            trigger(choice) { this.$emit('confirm', choice === 'Y'); },
        },
        computed: {
            choices() { return { 'Y': this.yes, 'N': this.no }; }
        },
        template: `<ask :choices="choices" @pick="trigger"><slot /></ask>`,
    });
    vue_1.default.component('Opt', {
        props: ['val', 'final', 'disabled'],
        methods: {
            onClick() {
                this.$emit('click', this.val);
                this.$parent.$emit('answer', this.val);
            }
        },
        template: `
<btn block=1 :close="final" :disabled="disabled" @click="onClick" class="text-left">
  <slot />
</btn>
  `,
    });
    vue_1.default.component('Menu', {
        props: ['title', 'close'],
        methods: {
            onAnswer(val) {
                this.$emit('answer', val);
            },
        },
        template: `
<div @answer="onAnswer" class="py-3">
  <slot />
</div>
  `,
    });
    vue_1.default.component('Info', {
        props: ['title'],
        data() {
            return { shown: false };
        },
        methods: {
            click(e) {
                e.preventDefault();
                e.stopPropagation();
                this.shown = true;
                return false;
            },
            reset() {
                this.shown = false;
            }
        },
        template: `
<div class="d-inline px-2">
  <a href="#" class="info" @click="click">i</a>
  <ok v-if="shown" @ok="reset" :title="title"><slot /></ok>
</div>
  `,
    });
    vue_1.default.component('Section', {
        props: ['title', 'notitle', 'back'],
        template: `
<div class="section-wrapper">
  <h4 v-if="!notitle" class="section-title">
    <slot name="title-pre" />
    {{title}}
    <slot name="title-post" />
  </h4>

  <div class="section-content">
    <slot />
  </div>
</div>
  `,
    });
});
