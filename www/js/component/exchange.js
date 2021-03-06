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
          // update the slider to match in case the owner of value rejects it
          this.$refs.slider.value = this.value;
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
            <slot name="pre" />
            <span @click="setMin" v-if="minmax" class="input-group-btn float-left"><btn class="font-weight-bold btn">Min</btn></span>
            <span @click="dec" class="input-group-btn float-left mx-2"><btn class="font-weight-bold btn">-1</btn></span>
          </div>

          <div class="col-6">
            <slot name="post" />
            <span @click="setMax" v-if="minmax" class="input-group-btn float-right"><btn class="font-weight-bold btn">Max</btn></span>
            <span @click="inc" class="input-group-btn float-right mx-2"><btn class="font-weight-bold btn">+1</btn></span>
          </div>
        </div>
      </div>
    `,
  });


  Vue.component('exchange', {
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
      cargoSpace() { return this.game.player.ship.cargoSpace },
      cargoUsed()  { return this.game.player.ship.cargoUsed  },
      cargoLeft()  { return this.game.player.ship.cargoLeft  },
      items()      { return Object.keys(this.resources)      },
    },

    methods: {
      update(item, amt) {
        const change = amt - this.cargo.count(item);

        if (change > this.cargoLeft) {
          amt = this.cargo.count(item) + this.cargoLeft;
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
  <div v-for="item in items" :key="item" v-if="count(item) > 0" class="my-3">
    <h4 class="text-capitalize">{{item}}</h4>
    <slider @update:value="amt => update(item, amt)" minmax=true :value="cargo.count(item)" min=0 :max="count(item)" step=1>
      <span slot="pre" class="float-left input-group-btn mx-2"><btn class="font-weight-bold btn">{{store.count(item)}}</btn></span>
      <span slot="post" class="float-right input-group-btn mx-2"><btn class="font-weight-bold btn">{{cargo.count(item)}}</btn></span>
    </slider>
  </div>
</div>
    `
  });
});
