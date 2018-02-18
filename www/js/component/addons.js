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

  Vue.component('addons', {
    computed: { addons: function() { return Object.keys(data.addons) } },
    methods: { returnToShipyard: function() { game.open('shipyard') } },
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
      planet:    function() { return game.here },
      player:    function() { return game.player },
      ship:      function() { return this.player.ship },
      info:      function() { return data.addons[this.type] },
      sellPrice: function() { return Math.ceil(0.7 * this.price) },

      price: function() {
        let price = this.info.price;
        price -= price * this.player.getStandingPriceAdjustment(this.planet.faction.abbrev);
        price += price * this.planet.faction.sales_tax;
        return Math.ceil(price);
      },

      isRestricted: function() {
        return this.info.restricted && !this.player.hasStanding(this.planet.faction.abbrev, this.info.restricted);
      },

      canAfford: function() {
        return this.player.money >= this.price;
      },

      hasRoom: function() {
        return this.ship.availableHardPoints() > 0;
      },

      isAvailable: function() {
        return !this.isRestricted && this.canAfford && this.hasRoom;
      },

      hasUpgrade: function() {
        return this.ship.hasAddOn(this.type);
      },
    },
    methods: {
      buyAddOn: function() {
        this.player.debit(this.price);
        this.player.ship.installAddOn(this.type);
        game.save_game();
        game.refresh();
      },

      sellAddOn: function() {
        this.player.ship.removeAddOn(this.type);
        this.player.credit(this.sellPrice);
        game.save_game();
        game.refresh();
      },
    },
    template: `
<div>
  <button @click="detail=!detail" type="button" class="btn btn-block my-3" :class="{'text-success': hasUpgrade, 'text-secondary': !hasUpgrade && !isAvailable, 'btn-dark': detail, 'btn-secondary': !detail}">
    {{info.name|caps}}
    <span class="badge badge-pill float-right">{{price|csn}}</span>
  </button>

  <card v-if="detail" class="my-3" :title="info.name|caps">
    <card-text class="font-italic">{{info.desc}}</card-text>

    <card-text v-if="!isAvailable" class="text-warning font-italic">
      <span v-if="isRestricted">
        Your reputation with this faction precludes the sale of this equipment to you.
        That does not prevent you from salivating from the show room window, however.
        <span v-if="!canAfford">Not that you could afford it anyway.</span>
      </span>
      <span v-else-if="!canAfford">You do not have enough money for this upgrade.</span>
      <span v-else-if="!hasRoom">Your ship does not have and available free hard point for this upgrade.</span>
    </card-text>

    <card-text>
      <button :disabled="!isAvailable" @click="buy=true" type="button" class="btn btn-dark">Purchase</button>
      <button :disabled="!hasUpgrade"  @click="sell=true" type="button" class="btn btn-dark">Sell</button>
    </card-text>

    <def y=0 split="5" term="Buy" :def="price|csn" />
    <def y=0 split="5" term="Sell" :def="sellPrice|csn" />
    <def y=0 split="5" term="Mass" :def="info.mass|csn" />
    <def v-if="info.cargo" y=0 split="5" term="Cargo" :def="info.cargo" />
    <def v-if="info.armor" y=0 split="5" term="Armor" :def="info.armor" />

    <def v-if="info.damage" y=0 split="5" term="Damage" :def="info.damage" />
    <def v-if="info.reload" y=0 split="5" term="Reload" :def="info.reload|unit('rounds')" />
    <def v-if="info.rate" y=0 split="5" term="Rate" :def="info.rate|unit('/round')" />
    <def v-if="info.interceptable" y=0 split="5" term="Interceptable" :def="info.interceptable|yn|caps" />

    <def v-if="info.dodge" y=0 split="5" term="Dodge" :def="info.dodge|pct(2)" />
    <def v-if="info.intercept" y=0 split="5" term="Intercept" :def="info.intercept|pct(2)" />
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
