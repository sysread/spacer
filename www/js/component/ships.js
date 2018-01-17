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


  Vue.component('ships', {
    computed: { ships: function() { return Object.keys(data.shipclass) } },
    methods: { returnToShipyard: function() { Game.open('shipyard') } },
    template: `
<card title="Ships">
  <btn slot="header" @click="returnToShipyard">Back to shipyard</btn>
  <ship v-for="ship in ships" :key="ship" :type="ship" />
</card>
    `,
  });


  Vue.component('ship', {
    props: ['type'],
    data: function() { return { detail: false, buy: false } },
    methods: {
      completeTradeIn: function() {
        Game.game.player.credit(this.playerShipValue);
        Game.game.player.debit(this.price);
        Game.game.player.ship = this.ship;
        Game.game.turn();
        Game.game.save_game();
      },
    },
    computed: {
      // Pricing and availability
      place:           function() { return Game.game.place() },
      player:          function() { return Game.game.player },
      playerShipValue: function() { return this.player.ship.price(true) },
      tradeIn:         function() { return this.price - this.playerShipValue },
      shipClass:       function() { return data.shipclass[this.type] },
      ship:            function() { return new Ship({shipclass: this.type, fuel: this.shipClass.tank}) },
      isPlayerShip:    function() { return this.ship.isPlayerShipType() },
      isNonFaction:    function() { return this.ship.faction && this.place.faction != this.ship.faction },
      isRestricted:    function() { return !this.ship.playerHasStanding() },
      isAvailable:     function() { return !this.isPlayerShip && !this.isNonFaction && !this.isRestricted },

      price: function() {
        let price = this.ship.price();
        price += price * this.place.sales_tax;
        price = Math.ceil(price);
        return price;
      },

      // Physical properties
      deltaV:           function() { return Math.round(this.ship.currentAcceleration() * 100) / 100 },
      deltaVinG:        function() { return this.deltaV / Physics.G },
      burnTime:         function() { return this.ship.maxBurnTime(this.deltaV, true) * data.hours_per_turn },
      range:            function() { return Physics.range(this.burnTime * 3600, 0, this.deltaV) / Physics.AU },
      nominalDeltaV:    function() { return Math.round(Math.min(0.5, this.deltaV * 0.6) * 100) / 100 },
      nominalDeltaVinG: function() { return this.nominalDeltaV / Physics.G },
      nominalBurnTime:  function() { return this.ship.maxBurnTime(this.nominalDeltaV, true) * data.hours_per_turn },
      nominalRange:     function() { return Physics.range(this.nominalBurnTime * 3600, 0, 1)  / Physics.AU},
      fuelMass:         function() { return this.shipClass.tank },
    },
    template: `
<div v-if="!isNonFaction">
  <button @click="detail=!detail" type="button" class="btn btn-block text-capitalize my-3" :class="{'text-secondary': !isAvailable, 'btn-dark': detail, 'btn-secondary': !detail}">
    {{type}}
    <span class="badge badge-pill float-right">{{price|csn}}</span>
  </button>

  <card v-if="detail">
    <p v-if="isAvailable">
      <button @click="buy=true" type="button" class="btn btn-dark">Purchase</button>
    </p>

    <p v-if="isRestricted" class="text-warning font-italic">
      Your reputation with this faction precludes the sale of this ship to you.
      That does not prevent you from salivating from the show room window, however.
    </p>

    <p v-if="isPlayerShip" class="text-warning font-italic">
      You already own a ship of this class.
    </p>

    <p v-if="shipClass.desc" class="font-italic">
      {{shipClass.desc}}
    </p>

    <def y=0 split="5" term="Price" :def="price|csn" />
    <def y=0 split="5" term="Trade in" :def="tradeIn|csn" />

    <def y=0 split="5" term="Range">
      <dl slot="def">
        <dt class="font-italic">Max thrust</dt>
        <dd>{{range|R(2)|unit('AU')}} / {{burnTime|csn|unit('hr')}} at {{deltaVinG|R(2)|unit('G')}}</dd>

        <dt class="font-italic">Nominal</dt>
        <dd>{{nominalRange|R(2)|unit('AU')}} / {{nominalBurnTime|csn|unit('hr')}} at {{nominalDeltaVinG|R(2)|unit('G')}}</dd>
      </dl>
    </def>

    <def y=0 split="5" term="Drive" :def="shipClass.drives + ' ' + ship.drive.name" />
    <def y=0 split="5" term="Maximum thrust" :def="ship.thrust|csn|unit('kN')" />
    <def y=0 split="5" term="Fuel tank" :def="shipClass.tank|csn|unit('tonnes')" />
    <def y=0 split="5" term="Hull mass" :def="shipClass.mass|csn|unit('tonnes')" />
    <def y=0 split="5" term="Drive mass" :def="ship.driveMass|csn|unit('tonnes')" />
    <def y=0 split="5" term="Total mass (fueled)" :def="ship.currentMass()|csn|unit('tonnes')" />
    <def y=0 split="5" term="Cargo" :def="shipClass.cargo" />
    <def y=0 split="5" term="Hull" :def="shipClass.hull" />
    <def y=0 split="5" term="Armor" :def="shipClass.armor" />
    <def y=0 split="5" term="Hard points" :def="shipClass.hardpoints" />
  </card>

  <modal v-if="buy" title="Purchase" @close="buy=false" close="Cancel" xclose=true>
    <p>You will pay {{price|csn}} credits for a shiny, new {{type}}.</p>
    <p>You will receive {{playerShipValue|csn}} credits for trading in your ship.</p>
    <p v-if="tradeIn < 0">You will make {{-tradeIn|csn}} profit with this deal. </p>
    <p v-else>You will pay {{tradeIn|csn}} with this deal. </p>
    <p>Do you wish to complete this exchange?</p>
    <button @click="completeTradeIn" slot="footer" type="button" class="btn btn-dark" data-dismiss="modal">Trade in</button>
  </modal>
</div>
    `,
  });
});
