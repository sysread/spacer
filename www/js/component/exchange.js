define(function(require, exports, module) {
  const data = require('data');
  const util = require('util');
  const Game = require('game');
  const Vue  = require('vendor/vue');
  require('component/row');

  Vue.component('slider', {
    props: ['value', 'min', 'max', 'step', 'minmax'],
    methods: {
      inc:    function()   { this.$emit('update:value', Math.min(parseInt(`${this.max}`, 10), this.value + 1)) },
      dec:    function()   { this.$emit('update:value', Math.max(parseInt(`${this.min}`, 10), this.value - 1)) },
      setMin: function()   { this.$emit('update:value', parseInt(`${this.min}`, 10)) },
      setMax: function()   { this.$emit('update:value', parseInt(`${this.max}`, 10)) },
      update: function(ev) { this.$emit('update:value', parseInt(`${ev.target.value}`, 10)) },
    },
    template: `
<div class="input-group">
  <slot name="pre" />
  <span  @click="setMin" v-if="minmax" class="input-group-btn"><button type="button" class="btn btn-dark">&#9668;&#9668;</button></span>
  <span  @click="dec" class="input-group-btn"><button type="button" class="btn btn-dark">&#9668;</button></span>
  <input @change="update" class="form-control form-control bg-black h-100" :value="value" :min="min" :max="max" :step="step || 1" type="range">
  <span  @click="inc" class="input-group-btn"><button type="button" class="btn btn-dark">&#9658;</button></span>
  <span  @click="setMax" v-if="minmax" class="input-group-btn"><button type="button" class="btn btn-dark">&#9658;&#9658;</button></span>
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
        cargo:     Game.game.player.ship.cargo,
        resources: resources,
      };
    },
    methods: {
      cargoUsed: function() {return Game.game.player.ship.cargoUsed},
      cargoLeft: function() {return Game.game.player.ship.cargoLeft},

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
  <def term="Cargo" :def="cargoUsed()" />
  <div v-for="item of resources.keys()">
    <def>
      <span slot="term" class="text-capitalize">{{item}}</span>
      <slider slot="def" @update:value="amt => update(item, amt)" minmax=true :value="cargo.get(item)" min=0 :max="resources.get(item)">
        <button slot="pre"  type="button" class="btn btn-dark">{{store.get(item)}}</button>
        <button slot="post" type="button" class="btn btn-dark">{{cargo.get(item)}}</button>
      </slider>
    </def>
  </div>
</div>
    `
  });
});
