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
define(["require", "exports", "vue", "../common", "./global", "./common"], function (require, exports, vue_1, t) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    vue_1 = __importDefault(vue_1);
    t = __importStar(t);
    vue_1.default.component('slider', {
        props: ['value', 'min', 'max', 'step', 'minmax'],
        data() {
            return {
                timer: 0,
                monitor: 0,
            };
        },
        /*
         * Uses an interval timer to track the value of the input, as @changed is
         * only emitted after the user releases the slider.
         */
        mounted() {
            this.monitor = window.setInterval(() => {
                const value = this.slider().value;
                if (value != this.value) {
                    this.setValue(value);
                    // update the slider to match in case the owner of value rejects it
                    this.slider().value = this.value;
                }
            }, 100);
        },
        beforeDestroy() {
            window.clearTimeout(this.monitor);
        },
        computed: {
            minValue() { return parseFloat(`${this.min}`); },
            maxValue() { return parseFloat(`${this.max}`); },
            stepValue() { return parseFloat(`${this.step}`) || 1; },
        },
        methods: {
            inc() { this.setValue(Math.min(this.maxValue, this.value + this.stepValue)); },
            dec() { this.setValue(Math.max(this.minValue, this.value - this.stepValue)); },
            setMin() { this.setValue(this.minValue); },
            setMax() { this.setValue(this.maxValue); },
            slider() {
                const slider = this.$refs.slider;
                return slider;
            },
            update(ev) {
                this.setValue(this.slider().value);
            },
            setValue(value) {
                value = parseFloat(`${value}`);
                this.$emit('update:value', value);
                this.$emit('change', value);
            },
        },
        template: `
<div>
  <div class="form-row">
    <div class="col">
      <input class="form-control"
          ref="slider"
          @change="update"
          :value="value || 0"
          :min="min"
          :max="max"
          :step="stepValue || 1"
          type="range" />
    </div>
  </div>

  <div class="form-row">
    <div class="col-6">
      <span @click="setMin" v-if="minmax" class="input-group-btn float-left"><btn class="font-weight-bold btn">Min</btn></span>
      <span @click="dec" class="input-group-btn float-left mx-2"><btn class="font-weight-bold btn">-1</btn></span>
    </div>

    <div class="col-6">
      <span @click="setMax" v-if="minmax" class="input-group-btn float-right"><btn class="font-weight-bold btn">Max</btn></span>
      <span @click="inc" class="input-group-btn float-right mx-2"><btn class="font-weight-bold btn">+1</btn></span>
      <slot name="post" />
    </div>
  </div>
</div>
  `,
    });
    vue_1.default.component('exchange', {
        props: ['store'],
        data() {
            const cargo = window.game.player.ship.cargo;
            // build pre-populated object because Vue cannot see new keys added
            const obj = {};
            for (const res of t.resources)
                obj[res] = 0;
            for (const item of cargo.keys()) {
                obj[item] += cargo.count(item);
            }
            for (const item of this.store.keys()) {
                obj[item] += this.store.count(item);
            }
            return {
                cargo: cargo,
                resources: obj,
            };
        },
        computed: {
            cargoSpace() { return window.game.player.ship.cargoSpace; },
            cargoUsed() { return window.game.player.ship.cargoUsed; },
            cargoLeft() { return window.game.player.ship.cargoLeft; },
            items() {
                const res = this.resources;
                return Object.keys(res);
            },
        },
        methods: {
            update(item, amt) {
                const change = amt - this.cargo.count(item);
                if (change > this.cargoLeft) {
                    amt = this.cargo.count(item) + this.cargoLeft;
                }
                this.store.set(item, this.count(item) - amt);
                this.cargo.set(item, amt);
            },
            count(item) {
                const count = this.resources[item] || 0;
                return Math.floor(count);
            },
        },
        template: `
<div>
  <def brkpt="sm" term="Cargo"><span slot="def">{{cargoUsed}} / {{cargoSpace}}</span></def>
  <def v-for="item in items" :key="item" brkpt="sm" v-if="count(item) > 0">
    <span slot="term" class="text-capitalize">{{item}}</span>
    <slider slot="def" @update:value="amt => update(item, amt)" minmax=true :value="cargo.count(item)" min=0 :max="count(item)" step=1>
      <span class="btn btn-dark" slot="pre">{{store.count(item)}}</span>
      <span class="btn btn-dark" slot="post">{{cargo.count(item)}}</span>
    </slider>
  </def>
</div>
  `
    });
});
