define(function(require, exports, module) {
  const Game    = require('game');
  const Physics = require('physics');
  const Ship    = require('ship');
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const util    = require('util');

  require('component/common');
  require('component/card');
  require('component/exchange');
  require('component/modal');
  require('component/row');


  Vue.component('shipyard', {
    data: function() {
      return {
        refuel:   false,
        transfer: false,
      };
    },
    methods: {
      open: function(page){ Game.open(page) },
    },
    template: `
<div>
  <card title="Shipyard">
    <card-text>
      The shipyard is like shipyards everywhere. There are piles of vaguely
      forgotten things, robotic lifters trundling around, "gently used" ships
      parked in distant berths, the occassional newly laid vessel standing
      out for its lack of patches and hull corrosion.
    </card-text>

    <card-text>
      And, of course, the yard manager who is only too happy to top off your
      fuel tank, repair any damage your ship might have sustained, no
      questions asked, heh, heh, and perform maintenance that cannot easily
      be done while underway.
    </card-text>

    <card-text>
      For a nominal fee, they will throw in an invisible corrosion protectant
      coating, too. If you are looking for something new, they have a hauler
      just came in, very good condition, barely a nick on her, pilot was a
      nice older lady...
    </card-text>

    <row>
      <button type="button" class="btn btn-dark btn-block m-1" @click="refuel=true">Refuel</button>
      <button type="button" class="btn btn-dark btn-block m-1" @click="transfer=true">Transfer fuel</button>
      <button type="button" class="btn btn-dark btn-block m-1" @click="open('ships')">Ships</button>
      <button type="button" class="btn btn-dark btn-block m-1" @click="open('addons')">Upgrades</button>
    </row>
  </card>

  <shipyard-refuel v-if="refuel" @close="refuel=false" />
  <shipyard-transfer v-if="transfer" @close="transfer=false" />
</div>
    `,
  });

  Vue.component('shipyard-refuel', {
    data: function() { return { change: 0 } },
    computed: {
      need:  function() { return Game.game.player.ship.refuelUnits() },
      max:   function() { return Math.min(this.need, Math.floor(Game.game.player.money / this.price)) },
      price: function() { return Math.ceil(Game.game.place().buyPrice('fuel') * 1.035) },
    },
    methods: {
      fillHerUp: function() {
        if (this.change !== NaN && this.change > 0 && this.change <= this.max) {
          Game.game.player.debit(this.change * this.price);
          Game.game.player.ship.refuel(this.change);
          Game.game.turn();
          Game.game.save_game();
          Game.game.refresh();
        }
      },
    },
    template: `
<modal title="Refuel" close="Nevermind" xclose=true @close="$emit('close')">
  <p>
    A dock worker wearing worn, grey coveralls approaches gingerly. A patch on
    his uniform identifies him as "Ray". He nods at your ship, "Fill 'er up?"
  </p>
  <def term="Price/tonne" :def="price|csn" />
  <def term="Fuel" :def="change" />
  <def term="Total" :def="(price * change)|csn" />
  <slider class="my-3" :value.sync="change" min=0 :max="max" step="1" minmax=true />
  <btn slot="footer" @click="fillHerUp" close=1>Purchase fuel</btn>
</modal>
    `,
  });

  Vue.component('shipyard-transfer', {
    data: function() {
      return { change: 0 };
    },
    computed: {
      need:  function() { return Game.game.player.ship.refuelUnits() },
      have:  function() { return Game.game.player.ship.cargo.get('fuel') },
      max:   function() { return Math.min(this.have, this.need) },
      tank:  function() { return Math.min(Game.game.player.ship.tank, Game.game.player.ship.fuel + this.change) },
      cargo: function() { return Game.game.player.ship.cargo.get('fuel') - this.change },
    },
    methods: {
      fillHerUp: function() {
        if (this.change !== NaN && this.change > 0 && this.change <= this.max) {
          Game.game.player.ship.refuel(this.change);
          Game.game.player.ship.cargo.dec('fuel', this.change);
          Game.game.turn();
          Game.game.save_game();
          Game.game.refresh();
        }
      },
    },
    template: `
<modal title="Transfer fuel to tank" close="Nevermind" xclose=true @close="$emit('close')">
  <p>You may transfer fuel purchased in the market from your cargo hold to your ship's fuel tank here.</p>
  <def term="Cargo" :def="Math.floor(cargo)" />
  <def term="Tank" :def="Math.floor(tank)" />
  <slider class="my-3" :value.sync="change" min=0 :max="max" step="1" minmax=true />
  <btn slot="footer" @click="fillHerUp" close=1>Transfer fuel</btn>
</modal>
    `,
  });
});
