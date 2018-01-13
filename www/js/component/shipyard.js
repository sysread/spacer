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
    computed: {
      ships: function() { return Object.keys(data.shipclass) },
    },
    template: `
<card title="Ships">
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
    },
    template: `
<div v-if="!isNonFaction" class="container container-fluid">
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

    <def y=0 split="5">
      <span slot="term">Range ({{deltaVinG|R(2)}} G max)</span>
      <span slot="def">{{range|R(2)}} AU / {{burnTime|csn}} hr</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Range ({{nominalDeltaVinG|R(2)}} G max)</span>
      <span slot="def">{{nominalRange|R(2)}} AU / {{nominalBurnTime|csn}} hr</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Drive</span>
      <span slot="def">{{shipClass.drives}} {{ship.drive.name}}</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Maximum thrust</span>
      <span slot="def">{{ship.thrust|csn}} kN</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Fuel</span>
      <span slot="def">{{shipClass.tank}} tonnes</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Hull</span>
      <span slot="def">{{shipClass.mass|csn}} tonnes</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Drive</span>
      <span slot="def">{{ship.driveMass|csn}} tonnes</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Total mass (fueled)</span>
      <span slot="def">{{ship.currentMass()|csn}} tonnes</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Cargo</span>
      <span slot="def">{{shipClass.cargo}}</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Hull</span>
      <span slot="def">{{shipClass.hull}}</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Armor</span>
      <span slot="def">{{shipClass.armor}}</span>
    </def>

    <def y=0 split="5">
      <span slot="term">Hard points</span>
      <span slot="def">{{shipClass.hardpoints}}</span>
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


  Vue.component('shipyard', {
    data: function() {
      return {
        refuel: false,
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
      <button type="button" class="btn btn-dark btn-block m-1" @click="refuel=true">Transfer fuel</button>
      <button type="button" class="btn btn-dark btn-block m-1" @click="open('ships')">Ships</button>
      <button type="button" class="btn btn-dark btn-block m-1" @click="open('addons')">Upgrades</button>
    </row>
  </card>

  <shipyard-refuel v-if="refuel" @close="refuel=false" />
</div>

    `,
  });


  Vue.component('shipyard-refuel', {
    data: function() {
      return {
        change: 0,
      };
    },
    computed: {
      need:  function() { return Game.game.player.ship.refuelUnits() },
      have:  function() { return Game.game.player.ship.cargo.get('fuel') },
      max:   function() { return Math.min(this.have, this.need) },
      mass:  function() { return data.resources.fuel.mass },
      tank:  function() { return Math.min(Game.game.player.ship.tank, Math.floor(Game.game.player.ship.fuel) + (this.mass * this.change)) },
      cargo: function() { return Game.game.player.ship.cargo.get('fuel') - this.change },
    },
    methods: {
      fillHerUp: function() {
        const units = this.change;
        if (units !== NaN && units > 0 && units <= this.max) {
          Game.game.player.ship.refuel(units);
          Game.game.player.ship.cargo.dec('fuel', units);
          Game.game.turn();
          Game.game.save_game();
          Game.game.refresh();
        }
      },
    },
    template: `

<modal title="Refuel your ship?" close="Nevermind" xclose=true @close="$emit('close')">
  <p>
    You may transfer fuel purchased in the market from your cargo hold to your ship's fuel tank here.
    One cargo unit of fuel masses {{mass}}  metric tonnes.
  </p>

  <row>
    <cell size=3>Cargo (units)</cell><cell size=3><input :value="Math.floor(cargo)" type="number" class="form-control" readonly /></cell>
    <cell size=3>Tank (tonnes)</cell><cell size=3><input :value="Math.floor(tank)"  type="number" class="form-control" readonly /></cell>
  </row>

  <slider :value.sync="change" min=0 :max="max" step="1" minmax=true />

  <button slot="footer" @click="fillHerUp" type="button" class="btn btn-dark" data-dismiss="modal">
    Fill her up
  </button>
</modal>

    `,
  });
});
