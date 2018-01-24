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

  Vue.component('addons', {
    computed: { addons: function() { return Object.keys(data.shipAddOns) } },
    methods: { returnToShipyard: function() { Game.open('shipyard') } },
    template: `
<card title="Equipment and upgrades">
  <btn slot="header" @click="returnToShipyard">Back to shipyard</btn>
  <card-text>Description of the area</card-text>
  <addon v-for="addon in addons" :key="addon" :type="addon" />
</card>
    `,
  });

  Vue.component('addon', {
    props: ['type'],
    data: function() { return { detail: false, buy: false, sell: false } },
    computed: {
      place:        function() { return Game.game.place() },
      player:       function() { return Game.game.player },
      ship:         function() { return this.player.ship },
      info:         function() { return data.shipAddOns[this.type] },
      sellPrice:    function() { return Math.ceil(0.7 * this.price) },
      isRestricted: function() { return this.info.restricted && !this.player.hasStanding(this.place.faction, this.info.restricted) },
      canAfford:    function() { return this.player.money >= this.price },
      hasRoom:      function() { return this.ship.availableHardPoints() > 0 },
      isAvailable:  function() { return !this.isRestricted && this.canAfford && this.hasRoom },
      hasUpgrade:   function() { return this.ship.hasAddOn(this.type) },

      price: function() {
        let price = this.info.price;
        price -= price * this.player.getStandingPriceAdjustment(this.place.faction);
        price += price * this.place.sales_tax;
        return Math.ceil(price);
      },
    },
    methods: {
      buyAddOn: function() {
        this.player.debit(this.price);
        this.player.ship.installAddOn(this.type);
        Game.game.save_game();
        Game.game.refresh();
      },
      sellAddOn: function() {
        this.player.ship.removeAddOn(this.type);
        this.player.credit(this.sellPrice);
        Game.game.save_game();
        Game.game.refresh();
      },
    },
    template: `
<div>
  <button @click="detail=!detail" type="button" class="btn btn-block my-3" :class="{'text-secondary': !isAvailable, 'btn-dark': detail, 'btn-secondary': !detail}">
    {{info.name}}
    <span class="badge badge-pill float-right">{{price|csn}}</span>
  </button>

  <card v-if="detail" class="my-3" :title="info.name">
    <card-text>{{info.desc}}</card-text>
    <card-text v-if="isRestricted" class="text-warning font-italic">Your reputation with this faction precludes the sale of this equipment to you. That does not prevent you from salivating from the show room window, however.</card-text>
    <card-text v-else-if="!canAfford" class="text-warning font-italic">You do not have enough money for this upgrade. </card-text>
    <card-text v-else-if="!hasRoom" class="text-warning font-italic">Your ship does not have enough free hard points for this upgrade.</card-text>

    <card-text>
      <button v-if="isAvailable" @click="buy=true" type="button" class="btn btn-dark">Purchase</button>
      <button v-if="hasUpgrade"  @click="sell=true" type="button" class="btn btn-dark">Sell</button>
    </card-text>

    <def y=0 split="5" term="Price" :def="price|csn" />
    <def y=0 split="5" term="Mass" :def="info.mass|csn" />
    <def v-if="info.cargo" y=0 split="5" term="Cargo" :def="info.cargo" />
    <def v-if="info.armor" y=0 split="5" term="Armor" :def="info.armor" />
    <def v-if="info.damage" y=0 split="5" term="Damage" :def="info.damage" />
    <def v-if="info.reload" y=0 split="5" term="Reload" :def="info.reload" />
    <def v-if="info.rate" y=0 split="5" term="Rate" :def="info.rate" />
    <def v-if="info.dodge" y=0 split="5" term="Dodge" :def="info.dodge" />
    <def v-if="info.intercept" y=0 split="5" term="Intercept" :def="info.intercept" />
  </card>

  <modal v-if="buy" @close="buy=false" close='No'>
    Purchase and install <b>{{info.name}}</b> for {{price|csn}} credits?
    <button @click="buyAddOn" slot="footer" data-dismiss="modal" class="btn btn-dark">Yes</button>
  </modal>

  <modal v-if="sell" @close="sell=false" close='No'>
    Remove and sell your <b>{{info.name}}</b> for {{sellPrice|csn}} credits?
    <button @click="sellAddOn" slot="footer" data-dismiss="modal" class="btn btn-dark">Yes</button>
  </modal>
</div>
    `,
  });
});
