define(function(require, exports, module) {
  const data = require('data');
  const util = require('util');
  const Game = require('game');
  const Vue  = require('vendor/vue');

  require('component/common');

  Vue.component('slider', {
    props: ['value', 'min', 'max', 'step', 'minmax'],
    data: function() { return { timer: null } },
    methods: {
      inc:    function()   { this.$emit('update:value', Math.min(parseInt(`${this.max}`, 10), this.value + 1)) },
      dec:    function()   { this.$emit('update:value', Math.max(parseInt(`${this.min}`, 10), this.value - 1)) },
      setMin: function()   { this.$emit('update:value', parseInt(`${this.min}`, 10)) },
      setMax: function()   { this.$emit('update:value', parseInt(`${this.max}`, 10)) },
      update: function(ev) { this.$emit('update:value', parseInt(`${ev.target.value}`, 10)) },
    },
    directives: {
      'monitor': {
        inserted: function(el, binding, vnode) {
          vnode.context.timer = window.setInterval(() => {
            const value = parseInt( $(el).val(), 10 );
            vnode.context.$emit('update:value', value);
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
  <span @click="setMin" v-if="minmax" class="input-group-btn"><btn class="font-weight-bold">&lt;&lt;</btn></span>
  <span @click="dec" class="input-group-btn"><btn class="font-weight-bold">&lt;</btn></span>

    <input v-monitor
      class="form-control bg-black"
      @change="update"
      :value="value || 0"
      :min="min"
      :max="max"
      :step="step || 1"
      type="range">

  <span @click="inc" class="input-group-btn"><btn class="font-weight-bold">&gt;</btn></span>
  <span @click="setMax" v-if="minmax" class="input-group-btn"><btn class="font-weight-bold">&gt;&gt;</btn></span>
  <slot name="post" />
</div>
    `,
  });


  Vue.component('exchange', {
    props: ['store'],
    data: function() {
      const resources = new util.ResourceCounter;

      for (const [item, amt] of Game.game.player.ship.cargo.entries()) {
        resources.inc(item, amt);
      }

      for (const [item, amt] of this.store.entries()) {
        resources.inc(item, amt);
      }

      return {
        cargo: Game.game.player.ship.cargo,
        resources: resources,
      };
    },
    methods: {
      cargoSpace: function() {return Game.game.player.ship.shipclass.cargo},
      cargoUsed:  function() {return Game.game.player.ship.cargoUsed},
      cargoLeft:  function() {return Game.game.player.ship.cargoLeft},

      update: function(item, amt) {
        const change = amt - this.cargo.get(item);

        if (change > this.cargoLeft()) {
          amt = this.cargo.get(item) + this.cargoLeft();
        }

        this.store.set(item, this.resources.get(item) - amt);
        this.cargo.set(item, amt);
        Game.game.refresh();
      },
    },
    template: `
<div>
  <def brkpt="sm" term="Cargo"><span slot="def">{{cargoUsed()}} / {{cargoSpace()}}</span></def>
  <def v-for="item of resources.keys()" :key="item" brkpt="sm" v-if="resources.get(item) > 0">
    <span slot="term" class="text-capitalize">{{item}}</span>
    <slider slot="def" @update:value="amt => update(item, amt)" minmax=true :value="cargo.get(item)" min=0 :max="resources.get(item)">
      <btn slot="pre">{{store.get(item)}}</btn>
      <btn slot="post">{{cargo.get(item)}}</btn>
    </slider>
  </def>
</div>
    `
  });
});
