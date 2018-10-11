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

  Vue.component('addons', {
    computed: {
      addons()     { return Object.keys(this.data.addons) },
      hardpoints() { return this.game.player.ship.availableHardPoints() },
    },

    methods: {
      returnToShipyard() { this.$emit('open', 'shipyard') },
    },

    template: `
<card title="Equipment and upgrades">
  <btn slot="header" @click="returnToShipyard">Back to shipyard</btn>

  <card-text>
    You have {{hardpoints}} unused hard points to which upgrades may be installed.
  </card-text>

  <addon v-for="addon in addons" :key="addon" :type="addon" />
</card>
    `,
  });

  Vue.component('addon', {
    props: ['type'],

    data() { return { detail: false, buy: false, sell: false } },

    computed: {
      planet()     { return this.game.here              },
      player()     { return this.game.player            },
      ship()       { return this.player.ship            },
      info()       { return this.data.addons[this.type] },
      sellPrice()  { return Math.ceil(0.7 * this.price) },

      fuelRate() {
        if (this.info.burn_rate) {
          return this.info.burn_rate / this.data.hours_per_turn;
        }
      },

      price() {
        return Math.ceil(this.planet.addonPrice(this.type, this.player));
      },

      isRestricted() {
        return this.info.restricted && !this.player.hasStanding(this.planet.faction.abbrev, this.info.restricted);
      },

      canAfford() {
        return this.player.money >= this.price;
      },

      hasRoom() {
        return this.ship.availableHardPoints() > 0;
      },

      hasUpgrade() {
        if (this.info.hasOwnProperty('markets')) {
          for (const trait of this.info.markets) {
            if (this.planet.hasTrait(trait)) {
              return true;
            }
          }
        }

        return false;
      },

      isAvailable() {
        return !this.isRestricted && this.canAfford && this.hasRoom && this.hasUpgrade;
      },

      hasUpgrade() {
        return this.ship.hasAddOn(this.type);
      },
    },

    methods: {
      buyAddOn() {
        this.player.debit(this.price);
        this.player.ship.installAddOn(this.type);
        this.game.save_game();
        this.game.refresh();
      },

      sellAddOn() {
        this.player.ship.removeAddOn(this.type);
        this.player.credit(this.sellPrice);
        this.game.save_game();
        this.game.refresh();
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

    <card-text v-if="!hasUpgrade" class="text-warning font-italic">
      This upgrade is not available here.
    </card-text>

    <card-text v-if="hasUpgrade && !isAvailable" class="text-warning font-italic">
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

    <def v-if="info.cargo" y=0 split="5" term="Cargo space" :def="info.cargo" />
    <def v-if="info.tank" y=0 split="5" term="Fuel tank" :def="info.tank" />

    <def v-if="info.thrust" y=0 split="5" term="Max thrust" :def="info.thrust|unit('kN')" />

    <def v-if="info.burn_rate" y=0 split="5" term="Fuel rate">
      {{fuelRate|unit('tonnes/hr')}} at maximum thrust
    </def>

    <def v-if="info.damage" y=0 split="5" term="Damage" :def="info.damage" />
    <def v-if="info.reload" y=0 split="5" term="Reloads every" :def="info.reload|unit('rounds')" />
    <def v-if="info.rate" y=0 split="5" term="Rate of fire" :def="info.rate|unit('/round')" />
    <def v-if="info.interceptable" y=0 split="5" term="Interceptable" :def="info.interceptable|yn|caps" />

    <def v-if="info.armor" y=0 split="5" term="Armor" :def="info.armor" />
    <def v-if="info.dodge" y=0 split="5" term="Dodge" :def="info.dodge|pct(2)" />
    <def v-if="info.intercept" y=0 split="5" term="Intercept" :def="info.intercept|pct(2)" />
    <def v-if="info.stealth" y=0 split=5 term="Stealth" :def="info.stealth|pct(2)" />
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
