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
    data: function() {
      return {
        selected: null,
      };
    },
    computed: {
      ships: function() { return Object.keys(data.shipclass) },
    },
    methods: {
      returnToShipyard: function() {
        game.open('shipyard');
      },

      selectShip: function(ship) {
        if (this.selected == ship) {
          this.selected = null;
        } else {
          this.selected = ship;
        }
      },
    },
    template: `
<card title="Ships">
  <btn slot="header" @click="returnToShipyard">Return to shipyard</btn>

  <div v-for="ship in ships">
    <ship v-if="!selected || selected == ship" :key="ship" :type="ship" :detail="ship == selected" @click="selectShip(ship)" />
  </div>

</card>
    `,
  });

  Vue.component('ship', {
    props: ['type', 'detail'],
    data: function() {
      return {
        buy: false,
        rangeForDeltaV: 0.5,
      }
    },
    methods: {
      completeTradeIn: function() {
        game.player.credit(this.playerShipValue);
        game.player.debit(this.price);
        game.player.ship = this.ship;
        game.turn();
        game.save_game();
      },

      maxRange: function() {
        const dv = this.rangeForDeltaV * Physics.G;
        const burnTime = this.ship.maxBurnTime(dv, true) * data.hours_per_turn;
        return Physics.range(burnTime * 3600, 0, dv) / Physics.AU;
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
      isNonFaction:    function() { return this.ship.faction && this.planet.faction.abbrev != this.ship.faction },
      isRestricted:    function() { return !this.ship.playerHasStanding() },
      canAfford:       function() { return this.player.money >= this.tradeIn },
      isAvailable:     function() { return !this.isPlayerShip && !this.isNonFaction && !this.isRestricted && this.canAfford },

      price: function() {
        let price = this.ship.price();
        price *= 1 + this.player.getStandingPriceAdjustment(this.planet.faction);
        price *= 1 + this.planet.faction.sales_tax;
        return Math.ceil(price);
      },

      // Physical properties
      deltaV:           function() { return util.R(this.ship.currentAcceleration(), 2) },
      deltaVinG:        function() { return util.R(this.deltaV / Physics.G, 2) },
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
  <btn @click="$emit('click')" :block=1 :muted="!isAvailable" class="text-capitalize my-2">
    <span v-if="detail">Return to the show room</span>
    <span v-else>{{type}} <span class="badge badge-pill float-right">{{price|csn}}</span></span>
  </btn>

  <card v-if="detail" :title="type|caps">
    <p v-if="isAvailable">
      <button @click="buy=true" type="button" class="btn btn-dark">Purchase</button>
    </p>

    <card-text v-if="shipClass.desc" class="font-italic">{{shipClass.desc}}</card-text>

    <card-text class="text-warning font-italic">
      <span v-if="isNonFaction">This ship is not available here.</span>
      <span v-else-if="isRestricted">
        Your reputation with this faction precludes the sale of this ship to you.
        That does not prevent you from salivating from the show room window, however.
        <span v-if="!canAfford">Not that you could afford it anyway.</span>
      </span>
      <span v-else-if="isPlayerShip">You already own a ship of this class.</span>
      <span v-else-if="!canAfford">You cannot afford this ship.</span>
    </card-text>

    <def y=1 brkpt="sm" term="Price">
      <span slot="def">
        {{price|csn|unit('c')}}
        <span v-if="tradeIn >= 0">({{tradeIn|csn|unit('c')}} after trade in)</span>
        <span v-if="tradeIn < 0">({{-tradeIn|csn|unit('c')}} profit after trade in)</span>
      </span>
    </def>

    <def y=1 brkpt="sm" term="Range">
      <div slot="def">
        <row>
          <def class="col-md-4" term="Acc" :def="rangeForDeltaV|R(2)|unit('G')" />
          <def class="col-md-8" term="Range"  :def="maxRange()|R(2)|unit('AU')" />
        </row>
        <slider :value.sync="rangeForDeltaV" min=0.01 :max="deltaVinG|R(2)" step=0.01 minmax=true />
      </div>
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
