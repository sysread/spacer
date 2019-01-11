"use strict"

define(function(require, exports, module) {
  const Physics = require('physics');
  const Ship    = require('ship');
  const Vue     = require('vendor/vue');
  const util    = require('util');

  require('component/global');
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
      ships: function() { return Object.keys(this.data.shipclass) },
    },
    methods: {
      returnToShipyard: function() {
        this.$emit('open', 'shipyard');
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
        deltaVforRange: 0.5,
        massForRange: 0,
      }
    },

    methods: {
      completeTradeIn: function() {
        this.game.player.credit(this.playerShipValue);
        this.game.player.debit(this.price);
        this.game.player.ship = this.ship;
        this.game.turn();
        this.game.save_game();
      },

      maxRange: function() {
        const dv = this.deltaVforRange * Physics.G;
        const burnTime = this.ship.maxBurnTime(dv, true, this.massForRange) * this.data.hours_per_turn;
        return Physics.range(burnTime * 3600, 0, dv) / Physics.AU;
      },
    },

    computed: {
      // Pricing and availability
      name:            function() { return this.type.replace('_', '-') },
      planet:          function() { return this.game.here },
      player:          function() { return this.game.player },
      playerShipValue: function() { return this.player.ship.price(true) },
      tradeIn:         function() { return this.price - this.playerShipValue },
      shipClass:       function() { return this.data.shipclass[this.type] },
      ship:            function() { return new Ship({type: this.type}) },
      isPlayerShip:    function() { return this.ship.isPlayerShipType() },
      isNonFaction:    function() { return this.ship.faction && this.planet.faction.abbrev != this.ship.faction },
      isRestricted:    function() { return !this.ship.playerHasStanding() },
      canAfford:       function() { return this.player.money >= this.tradeIn },
      isAvailable:     function() { return !this.isPlayerShip && !this.isNonFaction && !this.isRestricted && this.canAfford && this.hasShip },

      hasShip() {
        if (this.shipClass.hasOwnProperty('markets')) {
          for (const trait of this.shipClass.markets) {
            if (this.planet.hasTrait(trait)) {
              return true;
            }
          }

          return false;
        }

        return true;
      },

      price: function() {
        let price = this.ship.price();
        price *= 1 + this.player.getStandingPriceAdjustment(this.planet.faction);
        price *= 1 + this.planet.faction.sales_tax;
        return Math.ceil(price);
      },

      // Physical properties
      deltaV:           function() { return util.R(this.ship.currentAcceleration(this.massForRange), 2) },
      deltaVinG:        function() { return util.R(this.deltaV / Physics.G, 2) },
      deltaVinPctOfMax: function() { return util.R(100 * this.deltaVforRange / this.deltaVinG) },
      burnTime:         function() { return this.ship.maxBurnTime(this.deltaV, true, this.massForRange) * this.data.hours_per_turn },
      range:            function() { return Physics.range(this.burnTime * 3600, 0, this.deltaV) / Physics.AU },
      nominalDeltaV:    function() { return 0.5 },
      nominalDeltaVinG: function() { return this.nominalDeltaV / Physics.G },
      nominalBurnTime:  function() { return this.ship.maxBurnTime(this.nominalDeltaV, true) * this.data.hours_per_turn },
      nominalRange:     function() { return Physics.range(this.nominalBurnTime * 3600, 0, 1)  / Physics.AU},
      fuelMass:         function() { return this.shipClass.tank },
      fuelRate:         function() { return this.ship.fuelrate / this.data.hours_per_turn },

      maxCargoMass: function() {
        return this.shipClass.cargo * Math.max(...Object.values(this.data.resources).map(i => i.mass));
      },
    },

    template: `
<div>
  <btn v-if="detail" @click="$emit('click')" :block=1 class="my-2">
    Back to the show room
  </btn>

  <btn v-else @click="$emit('click')" :block=1 :muted="!isAvailable" class="my-2">
    {{name|caps}} <span class="badge badge-pill float-right">{{price|csn}}</span>
  </btn>

  <card v-if="detail" :title="name|caps">
    <p v-if="isAvailable">
      <button @click="buy=true" type="button" class="btn btn-dark">Purchase</button>
    </p>

    <card-text v-if="shipClass.desc" class="font-italic">{{shipClass.desc}}</card-text>

    <card-text v-if="!isAvailable" class="text-warning font-italic">
      <span v-if="!hasShip || isNonFaction">This ship is not available here.</span>
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

    <def y=1 brkpt="sm" term="Cargo"       :def="shipClass.cargo" />
    <def y=1 brkpt="sm" term="Fuel"        :def="shipClass.tank|csn|unit('tonnes')" />
    <def y=1 brkpt="sm" term="Drive"       :def="shipClass.drives + ' ' + ship.drive.name" />
    <def y=1 brkpt="sm" term="Thrust"      :def="ship.thrust|csn|unit('kN')" />

    <def y=1 brkpt="sm" term="Fuel rate">
      {{fuelRate|R(3)|unit('tonnes/hr')}} at maximum thrust
    </def>

    <def y=1 brkpt="sm" term="Mass"        :def="ship.currentMass()|csn|unit('tonnes (fueled)')" />
    <def y=1 brkpt="sm" term="Hull"        :def="shipClass.hull" />
    <def y=1 brkpt="sm" term="Armor"       :def="shipClass.armor" />
    <def y=1 brkpt="sm" term="Hard points" :def="shipClass.hardpoints" />

    <def y=1 brkpt="sm" term="Range">
      <div slot="def">
        <def split=4 term="Cargo mass" :def="massForRange|csn|unit('tonnes')" />
        <slider :value.sync="massForRange" min=0 :max="maxCargoMass" step=1 minmax=true class="my-1" />

        <def split=4 term="Acc">
          {{deltaVforRange|R(2)|unit('G')}} ({{deltaVinPctOfMax}}%)
        </def>
        <slider :value.sync="deltaVforRange" min=0.01 :max="deltaVinG|R(2)" step=0.01 minmax=true class="my-1" />

        <def split=4 term="Range" :def="maxRange()|R(2)|unit('AU')" />
      </div>
    </def>
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
