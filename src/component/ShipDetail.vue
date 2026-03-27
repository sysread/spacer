<template>
<div>
<btn v-if="!detail" @click="$emit('click')" :block=1 :muted="!isAvailable" class="my-2">
  {{$caps(name)}} <span class="badge rounded-pill float-end">{{$csn(price)}}</span>
</btn>

<Section v-else :title="$caps(name)" class="m-3">
  <p v-if="isAvailable">
    <button @click="buy=true" type="button" class="btn btn-dark">Purchase</button>
  </p>

  <p v-if="shipClass.desc" class="fst-italic">{{shipClass.desc}}</p>

  <p v-if="!isAvailable" class="text-warning fst-italic">
    <span v-if="!hasShip || isNonFaction">This ship is not available here.</span>
    <span v-else-if="isRestricted">
      Your reputation with this faction precludes the sale of this ship to you.
      That does not prevent you from salivating from the show room window, however.
      <span v-if="!canAfford">Not that you could afford it anyway.</span>
    </span>
    <span v-else-if="isPlayerShip">You already own a ship of this class.</span>
    <span v-else-if="!canAfford">You cannot afford this ship.</span>
  </p>

  <def y=1 brkpt="sm" term="Price">
    <template #def><span>
      {{$unit($csn(price), 'c')}}
      <span v-if="tradeIn >= 0">({{$unit($csn(tradeIn), 'c')}} after trade in)</span>
      <span v-if="tradeIn < 0">({{$unit($csn(-tradeIn), 'c')}} profit after trade in)</span>
    </span></template>
  </def>

  <def y=1 brkpt="sm" term="Cargo"       :def="shipClass.cargo" />
  <def y=1 brkpt="sm" term="Fuel"        :def="$unit($csn(shipClass.tank), 'tonnes')" />
  <def y=1 brkpt="sm" term="Drive"       :def="shipClass.drives + ' ' + ship.drive.name" />
  <def y=1 brkpt="sm" term="Thrust"      :def="$unit($csn(ship.thrust), 'kN')" />

  <def y=1 brkpt="sm" term="Fuel rate">
    {{$unit($R(fuelRate, 3), 'tonnes/hr')}} at maximum thrust
  </def>

  <def y=1 brkpt="sm" term="Mass"        :def="$unit($csn(ship.currentMass()), 'tonnes (fueled)')" />
  <def y=1 brkpt="sm" term="Hull"        :def="shipClass.hull" />
  <def y=1 brkpt="sm" term="Armor"       :def="shipClass.armor" />
  <def y=1 brkpt="sm" term="Hard points" :def="shipClass.hardpoints" />

  <def y=1 brkpt="sm" term="Range">
    <template #def><div>
      <def split=4 term="Cargo mass" :def="$unit($csn(massForRange), 'tonnes')" />
      <stepper v-model:value="massForRange" min=0 :max="maxCargoMass" step=1 minmax=true class="my-1" />

      <def split=4 term="Acc">
        {{$unit($R(deltaVforRange, 2), 'G')}} ({{deltaVinPctOfMax}}%)
      </def>
      <stepper v-model:value="deltaVforRange" min=0.01 :max="$R(deltaVinG, 2)" step=0.01 minmax=true class="my-1" />

      <def split=4 term="Range" :def="$unit($R(maxRange(), 2), 'AU')" />
    </div></template>
  </def>
</Section>

<modal v-if="buy" title="Purchase" @close="buy=false" close="Cancel" xclose=true>
  <p>You will pay {{$csn(price)}} credits for a shiny, new {{type}}.</p>
  <p>You will receive {{$csn(playerShipValue)}} credits for trading in your ship.</p>
  <p v-if="tradeIn < 0">You will make {{$csn(-tradeIn)}} profit with this deal. </p>
  <p v-else>You will pay {{$csn(tradeIn)}} with this deal. </p>
  <p>Do you wish to complete this exchange?</p>
  <template #footer><btn @click="completeTradeIn" close=1>Trade in</btn></template>
</modal>
</div>
</template>

<script>
import Physics from '../physics';
import Ship from '../ship';
import * as util from '../util';

export default {
  props: ['type', 'detail'],
  emits: ['click'],

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
    playerShipValue: function() { return this.player.ship.price(true, this.game.here.pricing) },
    tradeIn:         function() { return this.price - this.playerShipValue },
    shipClass:       function() { return this.data.shipclass[this.type] },
    ship:            function() { return new Ship({type: this.type}) },
    isPlayerShip:    function() { return this.ship.type == game.player.ship.type },
    isNonFaction:    function() { return this.ship.faction && this.planet.faction.abbrev != this.ship.faction },
    canAfford:       function() { return this.player.money >= this.tradeIn },
    isAvailable:     function() { return !this.isPlayerShip && !this.isNonFaction && !this.isRestricted && this.canAfford && this.hasShip },

    isRestricted() {
      if (!this.ship.restricted)
        return false;

      if (this.game.player.hasStanding(game.here.faction, this.ship.restricted))
        return false;

      return true;
    },

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
      let price = this.ship.price(false, this.game.here.pricing);
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
};
</script>
