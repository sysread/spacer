define(function(require, exports, module) {
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
        game.player.credit(this.playerShipValue);
        game.player.debit(this.price);
        game.player.ship = this.ship;
        game.turn();
        game.save_game();
      },
    },
    computed: {
      // Pricing and availability
      planet:          function() { return game.here },
      player:          function() { return game.player },
      playerShipValue: function() { return this.player.ship.price(true) },
      tradeIn:         function() { return this.price - this.playerShipValue },
      shipClass:       function() { return data.shipclass[this.type] },
      ship:            function() { return new Ship({type: this.type}) },
      isPlayerShip:    function() { return this.ship.isPlayerShipType() },
      isNonFaction:    function() { return this.ship.faction && this.planet.faction != this.ship.faction },
      isRestricted:    function() { return !this.ship.playerHasStanding() },
      canAfford:       function() { return this.player.money >= this.tradeIn },
      isAvailable:     function() { return !this.isPlayerShip && !this.isNonFaction && !this.isRestricted && this.canAfford },

      price: function() {
        let price = this.ship.price();
        price *= 1 + this.player.getStandingPriceAdjustment(this.planet.faction.abbr);
        price *= 1 + this.planet.faction.sales_tax;
        return Math.ceil(price);
      },

      // Physical properties
      deltaV:           function() { return Math.round(this.ship.currentAcceleration() * 100) / 100 },
      deltaVinG:        function() { return this.deltaV / Physics.G },
      burnTime:         function() { return this.ship.maxBurnTime(this.deltaV, true) * data.hours_per_turn },
      range:            function() { return Physics.range(this.burnTime * 3600, 0, this.deltaV) / Physics.AU },
      nominalDeltaV:    function() { return 0.5 },
      nominalDeltaVinG: function() { return this.nominalDeltaV / Physics.G },
      nominalBurnTime:  function() { return this.ship.maxBurnTime(this.nominalDeltaV, true) * data.hours_per_turn },
      nominalRange:     function() { return Physics.range(this.nominalBurnTime * 3600, 0, 1)  / Physics.AU},
      fuelMass:         function() { return this.shipClass.tank },
    },
    template: `
<div>
  <button @click="detail=!detail" type="button" class="btn btn-block text-capitalize my-3" :class="{'text-secondary': !isAvailable, 'btn-dark': detail, 'btn-secondary': !detail}">
    {{type}}
    <span class="badge badge-pill float-right">{{price|csn}}</span>
  </button>

  <card v-if="detail">
    <p v-if="isAvailable">
      <button @click="buy=true" type="button" class="btn btn-dark">Purchase</button>
    </p>

    <p class="text-warning font-italic">
      <span v-if="isNonFaction">This ship is not available here.</span>
      <span v-else-if="isRestricted">
        Your reputation with this faction precludes the sale of this ship to you.
        That does not prevent you from salivating from the show room window, however.
      </span>
      <span v-else-if="isPlayerShip">You already own a ship of this class.</span>
      <span v-else-if="!canAfford">You cannot afford this ship.</span>
    <p>

    <p v-if="shipClass.desc" class="font-italic">
      {{shipClass.desc}}
    </p>

    <def y=1 brkpt="sm" term="Price">
      <span slot="def">
        {{price|csn|unit('c')}}
        <span v-if="tradeIn >= 0">({{tradeIn|csn|unit('c')}} after trade in)</span>
        <span v-if="tradeIn < 0">({{-tradeIn|csn|unit('c')}} profit after trade in)</span>
      </span>
    </def>

    <def y=1 brkpt="sm" term="Range">
      <dl slot="def">
        <dt class="font-italic">Max thrust</dt>
        <dd>{{range|R(2)|unit('AU')}} / {{burnTime|csn|unit('hr')}} at {{deltaVinG|R(2)|unit('G')}}</dd>

        <dt class="font-italic">Nominal</dt>
        <dd>{{nominalRange|R(2)|unit('AU')}} / {{nominalBurnTime|csn|unit('hr')}} at {{nominalDeltaVinG|R(2)|unit('G')}}</dd>
      </dl>
    </def>

    <def y=1 brkpt="sm" term="Cargo"       :def="shipClass.cargo" />
    <def y=1 brkpt="sm" term="Fuel"        :def="shipClass.tank|csn|unit('tonnes')" />
    <def y=1 brkpt="sm" term="Drive"       :def="shipClass.drives + ' ' + ship.drive.name" />
    <def y=1 brkpt="sm" term="Thrust"      :def="ship.thrust|csn|unit('kN')" />
    <def y=1 brkpt="sm" term="Mass"        :def="ship.currentMass()|csn|unit('tonnes (fueled)')" />
    <def y=1 brkpt="sm" term="Hull"        :def="shipClass.hull" />
    <def y=1 brkpt="sm" term="Armor"       :def="shipClass.armor" />
    <def y=1 brkpt="sm" term="Hard points" :def="shipClass.hardpoints" />
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
