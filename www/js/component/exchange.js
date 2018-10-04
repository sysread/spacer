define(function(require, exports, module) {
  const model = require('model');
  const util  = require('util');
  const Vue   = require('vendor/vue');

  require('component/global');
  require('component/common');

  Vue.component('slider', {
    props: ['value', 'min', 'max', 'step', 'minmax'],

    data() {
      return {
        timer: null,
        slider_value: this.value,
        monitor: null,
      };
    },

    /*
     * Uses an interval timer to track the value of the input, as @changed is
     * only emitted after the user releases the slider.
     */
    mounted() {
      this.monitor = window.setInterval(() => {
        const value = this.$refs.slider.value;
        if (value != this.slider_value) {
          this.slider_value = value;
        }
      }, 100);
    },

    beforeDestroy() {
      window.clearTimeout(this.monitor);
    },

    watch: {
      slider_value() {
        this.$emit('update:value', this.slider_value);
        this.$emit('change', this.slider_value);
      },
    },

    computed: {
      minValue()  { return parseFloat(`${this.min}`)  },
      maxValue()  { return parseFloat(`${this.max}`)  },
      stepValue() { return parseFloat(`${this.step}`) },
    },

    methods: {
      inc()      { this.setValue(Math.min(this.maxValue, this.value + this.stepValue)) },
      dec()      { this.setValue(Math.max(this.minValue, this.value - this.stepValue)) },
      setMin()   { this.setValue(this.minValue) },
      setMax()   { this.setValue(this.maxValue) },
      update(ev) { this.setValue(parseFloat(ev.target.value)) },

      setValue(value) {
        this.$emit('update:value', value);
        this.$emit('change', value);
      },
    },

    template: `
<div class="input-group">
  <slot name="pre" />
  <span @click="setMin" v-if="minmax" class="input-group-btn"><btn class="font-weight-bold btn-sm">&lt;&lt;</btn></span>
  <span @click="dec" class="input-group-btn"><btn class="font-weight-bold btn-sm">&lt;</btn></span>

  <input
    ref="slider"
    class="form-control"
    @change="update"
    :value="value || 0"
    :min="min"
    :max="max"
    :step="stepValue || 1"
    type="range" />

  <span @click="inc" class="input-group-btn"><btn class="font-weight-bold btn-sm">&gt;</btn></span>
  <span @click="setMax" v-if="minmax" class="input-group-btn"><btn class="font-weight-bold btn-sm">&gt;&gt;</btn></span>
  <slot name="post" />
</div>
    `,
  });


  Vue.component('exchange', {
    props: ['store'],
    data() {
      return {
        resources: new model.Store,
      };
    },
    mounted() {
      for (const item of this.game.player.ship.cargo.keys) {
        this.resources.inc(item, this.game.player.ship.cargo.count(item));
      }

      for (const item of this.store.keys) {
        this.resources.inc(item, this.store.count(item));
      }
    },
    computed: {
      cargo() {return this.game.player.ship.cargo},
      cargoSpace() {return this.game.player.ship.cargoSpace},
      cargoUsed() {return this.game.player.ship.cargoUsed},
      cargoLeft() {return this.game.player.ship.cargoLeft},
    },
    methods: {
      update(item, amt) {
        const change = amt - this.cargo.get(item);

        if (change > this.cargoLeft) {
          amt = this.cargo.get(item) + this.cargoLeft;
        }

        this.store.set(item, this.resources.get(item) - amt);
        this.cargo.set(item, amt);
        this.game.refresh();
      },
    },
    template: `
<div>
  <def brkpt="sm" term="Cargo"><span slot="def">{{cargoUsed}} / {{cargoSpace}}</span></def>
  <def v-for="item of resources.keys" :key="item" brkpt="sm" v-if="resources.count(item) > 0">
    <span slot="term" class="text-capitalize">{{item}}</span>
    <slider slot="def" @update:value="amt => update(item, amt)" minmax=true :value="cargo.get(item)" min=0 :max="resources.get(item)">
      <span class="btn btn-dark" slot="pre">{{store.count(item)}}</span>
      <span class="btn btn-dark" slot="post">{{cargo.count(item)}}</span>
    </slider>
  </def>
</div>
    `
  });
});
