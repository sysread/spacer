define(function(require, exports, module) {
  "use strict"

  const Vue = require('vendor/vue');
  const t = require('common');

  require('component/global');
  require('component/common');

  Vue.component('slider', {
    props: ['value', 'min', 'max', 'step', 'minmax'],

    data() {
      return {
        timer: null,
        monitor: null,
      };
    },

    /*
     * Uses an interval timer to track the value of the input, as @changed is
     * only emitted after the user releases the slider.
     */
    mounted() {
      this.monitor = window.setInterval(() => {
        if (this.$refs.slider.value != this.value) {
          this.setValue(this.$refs.slider.value);
        }
      }, 100);
    },

    beforeDestroy() {
      window.clearTimeout(this.monitor);
    },

    computed: {
      minValue()  { return parseFloat(`${this.min}`)  },
      maxValue()  { return parseFloat(`${this.max}`)  },
      stepValue() { return parseFloat(`${this.step}`) || 1 },
    },

    methods: {
      inc()      { this.setValue(Math.min(this.maxValue, this.value + this.stepValue)) },
      dec()      { this.setValue(Math.max(this.minValue, this.value - this.stepValue)) },
      setMin()   { this.setValue(this.minValue) },
      setMax()   { this.setValue(this.maxValue) },
      update(ev) { this.setValue(ev.target.value) },

      setValue(value) {
        value = parseFloat(`${value}`);
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
      // build pre-populated object because Vue cannot see new keys added
      const obj = {};
      for (const res of t.resources)
        obj[res] = 0;

      return {
        resources: obj,
      };
    },

    mounted() {
      for (const item of this.game.player.ship.cargo.keys()) {
        this.resources[item] += this.game.player.ship.cargo.get(item);
      }

      for (const item of this.store.keys()) {
        this.resources[item] += this.store.get(item);
      }
    },

    computed: {
      cargo()      { return this.game.player.ship.cargo      },
      cargoSpace() { return this.game.player.ship.cargoSpace },
      cargoUsed()  { return this.game.player.ship.cargoUsed  },
      cargoLeft()  { return this.game.player.ship.cargoLeft  },
      items()      { return Object.keys(this.resources)      },
    },

    methods: {
      update(item, amt) {
        const change = amt - this.cargo.get(item);

        if (change > this.cargoLeft) {
          amt = this.cargo.get(item) + this.cargoLeft;
        }

        this.store.set(item, this.resources[item] - amt);
        this.cargo.set(item, amt);
      },

      count(item) {
        return Math.floor(this.resources[item]);
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
