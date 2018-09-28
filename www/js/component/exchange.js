define(function(require, exports, module) {
  const model = require('model');
  const util  = require('util');
  const Vue   = require('vendor/vue');

  require('component/global');
  require('component/common');

  Vue.component('slider', {
    props: ['value', 'min', 'max', 'step', 'minmax'],
    data: function() { return { timer: null } },
    computed: {
      minValue:  function() { return parseFloat(`${this.min}`) },
      maxValue:  function() { return parseFloat(`${this.max}`) },
      stepValue: function() { return parseFloat(`${this.step}`) },
    },
    methods: {
      inc:    function()   { this.setValue(Math.min(this.maxValue, this.value + this.stepValue)) },
      dec:    function()   { this.setValue(Math.max(this.minValue, this.value - this.stepValue)) },
      setMin: function()   { this.setValue(this.minValue) },
      setMax: function()   { this.setValue(this.maxValue) },
      update: function(ev) { this.setValue(parseFloat(ev.target.value)) },
      setValue: function(value) {
        this.$emit('update:value', value);
        this.$emit('change', value);
      },
    },
    directives: {
      'monitor': {
        inserted: function(el, binding, vnode) {
          vnode.context.timer = window.setInterval(() => {
            const value = parseFloat(el.value);
            if (value != vnode.context.value) {
              vnode.context.setValue(value);
            }
          }, 350);
        },
        unbind: function(el, binding, vnode) {
          window.clearInterval(vnode.context.timer);
          vnode.context.timer = null;
        },
      }
    },
    template: `
<div class="input-group">
  <slot name="pre" />
  <span @click="setMin" v-if="minmax" class="input-group-btn"><btn class="font-weight-bold btn-sm">&lt;&lt;</btn></span>
  <span @click="dec" class="input-group-btn"><btn class="font-weight-bold btn-sm">&lt;</btn></span>

  <input v-monitor
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
    data: function() {
      return {
        resources: new model.Store,
      };
    },
    mounted: function() {
      for (const item of this.game.player.ship.cargo.keys) {
        this.resources.inc(item, this.game.player.ship.cargo.count(item));
      }

      for (const item of this.store.keys) {
        this.resources.inc(item, this.store.count(item));
      }
    },
    computed: {
      cargo:      function() {return this.game.player.ship.cargo},
      cargoSpace: function() {return this.game.player.ship.cargoSpace},
      cargoUsed:  function() {return this.game.player.ship.cargoUsed},
      cargoLeft:  function() {return this.game.player.ship.cargoLeft},
    },
    methods: {
      update: function(item, amt) {
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
