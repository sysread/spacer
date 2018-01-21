define(function(require, exports, module) {
  const Game = require('game');
  const Vue  = require('vendor/vue');
  const data = require('data');
  const util = require('util');

  require('component/common');
  require('component/card');
  require('component/exchange');
  require('component/modal');
  require('component/row');

  Vue.component('craft', {
    props: ['item'],
    data: function() {
      return {
        open:  false,
        count: 1,
        done:  false,
      };
    },
    computed: {
      player:    function() { return Game.game.player },
      price:     function() { return Game.game.place().price(this.item) },
      fee:       function() { return util.R(Math.max(1, util.R(data.craft_fee * this.price, 2))) },
      turns:     function() { return Game.game.place().fabricationTime(this.item) },
      hours:     function() { return data.hours_per_turn * this.turns },
      materials: function() { return data.resources[this.item].recipe.materials },
    },
    methods: {
      amount:    function() { return Math.min(Math.floor(this.player.money / this.fee), this.player.canCraft(this.item)) },
      fabricate: function() {
        for (let i = 0; i < this.count; ++i) {
          this.player.debit(this.fee);

          for (const mat of Object.keys(this.materials))
            this.player.ship.unloadCargo(mat, this.materials[mat]);

          Game.game.turn(this.turns);
          this.player.ship.loadCargo(this.item, 1);
          Game.game.refresh();
        }

        Game.game.save_game();
        this.done = 1;
      },
      reset: function() {
        this.open  = false;
        this.count = 1;
        this.done  = false;
      },
      priceOf: function(item) {
        return Game.game.place().price(item);
      },
    },
    template: `
<div class="my-2">
  <btn block=1 :disabled="!amount()" @click="open=!open">
    {{item|caps}}
  </btn>

  <card v-if="open" class="my-3">
    <card-text>The current market value of {{item}} is {{price||csn}} credits.</card-text>
    <card-text v-if="amount()" class="font-italic text-success">You have the resources to fabricate {{amount()}} of this item.</card-text>
    <card-text v-else class="font-italic text-warning">You do not have the required resources to fabricate this item.</card-text>

    <def y=0 term="Cost" :def="(fee * count)|R(0)|csn|unit('credits')" />
    <def y=0 term="Time" :def="(hours * count)|csn|unit('hours')" />
    <def y=0 term="Materials">
      <div slot="def" v-for="(amt, item) of materials">
        {{(amt * count)|csn|unit(item)}} ({{priceOf(item)|csn}} cr)
      </div>
    </def>

    <slider v-if="amount() > 1" class="my-3" :value.sync="count" min="1" :max="amount()" minmax=1 />
    <btn v-if="amount()" block=1 @click="fabricate" class="my-3">Push the big red button</btn>

    <ok v-if="done" @ok="reset">{{count}} unit(s) of {{item}} have been placed in your ship's hold.</ok>
  </card>
</div>
    `,
  });

  Vue.component('fabricators', {
    computed: {
      player:       function() { return Game.game.player },
      availability: function() { return Game.game.place().fabricationAvailability() },
      resources:    function() { return Object.keys(data.resources).filter((k) => {return data.resources[k].hasOwnProperty('recipe')}) },
    },
    template: `
<card title="Fabricators" class="my-3">
  <card-text>A triumph of cybernetics, the fabricators are able to manufacture nearly anything, given the necessary materials and plans... and a small fee, of course.</card-text>
  <card-text>{{availability}}% of fabricator capacity is available at this time.</card-text>

  <craft v-for="item of resources" :key="item" :item="item" />
</card>
    `,
  });
});
