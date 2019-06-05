import Vue from "vue";
import Physics from "../physics";
import Ship from "../ship";
import { Planet } from "../planet";
import { Person } from "../person";
import data from "../data";
import * as util from "../util";
import * as t from "../common";

import "./global";
import "./common";
import "./exchange";
import "./modal";
import "./row";

declare var window: {
  game: any;
}

Vue.component('addons', {
  computed: {
    addons() { return Object.keys(data.addons) },
    hardpoints() { return window.game.player.ship.availableHardPoints() },
  },

  methods: {
    returnToShipyard() { this.$emit('open', 'shipyard') },
  },

  template: `
<Section title="Equipment and upgrades">
  <btn @click="returnToShipyard">Shipyard</btn>

  <p class="my-3">
    You have {{hardpoints}} unused hard points to which upgrades may be installed.
  </p>

  <addon v-for="addon in addons" :key="addon" :type="addon" />
</Section>
  `,
});

Vue.component('addon', {
  props: ['type'],

  data() {
    return {
      detail: false,
      buy:    false,
      sell:   false,
    };
  },

  computed: {
    planet():    Planet  { return window.game.here },
    player():    Person  { return window.game.player },
    ship():      Ship    { return window.game.player.ship  },
    info():      t.Addon { return data.addons[this.type as t.addon] },
    sellPrice(): number  { return Math.ceil(0.7 * (this.price as number)) },

    fuelRate(): string {
      const info: t.Addon = this.info;

      if (t.isPropulsion(info)) {
        if (info.burn_rate) {
          return (info.burn_rate / data.hours_per_turn) + ' tonnes/hour';
        }
        else if (info.burn_rate_pct) {
          return (info.burn_rate_pct * 100) + '% reduction';
        }
      }

      return '';
    },

    price(): number {
      return Math.ceil(this.planet.addonPrice(this.type, this.player));
    },

    isRestricted(): boolean {
      return !!this.info.restricted
        && !this.player.hasStanding(this.planet.faction.abbrev, this.info.restricted);
    },

    canAfford(): boolean {
      return this.player.money >= this.price;
    },

    hasRoom(): boolean {
      return this.ship.availableHardPoints() > 0;
    },

    marketHasUpgrade(): boolean {
      if (this.info.hasOwnProperty('markets')) {
        for (const trait of (this.info.markets || [])) {
          if (this.planet.hasTrait(trait)) {
            return true;
          }
        }

        return false;
      }

      return true;
    },

    isAvailable(): boolean {
      return !this.isRestricted && this.canAfford && this.hasRoom && this.marketHasUpgrade;
    },

    hasUpgrade(): boolean {
      return this.ship.hasAddOn(this.type);
    },
  },

  methods: {
    buyAddOn() {
      this.player.debit(this.price);
      this.player.ship.installAddOn(this.type);
      window.game.save_game();
    },

    sellAddOn() {
      this.player.ship.removeAddOn(this.type);
      this.player.credit(this.sellPrice);
      window.game.save_game();
    },
  },

  template: `
<div>
  <button @click="detail=!detail" type="button" class="btn btn-block my-3"
    :class="{
      'text-success': hasUpgrade,
      'text-secondary': !hasUpgrade && !isAvailable,
      'btn-dark': detail,
      'btn-secondary': !detail
    }">
      {{info.name|caps}}
      <span class="badge badge-pill float-right">{{price|csn}}</span>
  </button>

  <Section v-if="detail" class="my-3" :notitle=1 :title="info.name|caps">
    <p class="font-italic">{{info.desc}}</p>

    <p v-if="!marketHasUpgrade" class="text-warning font-italic">
      This upgrade is not available here.
    </p>

    <p v-if="marketHasUpgrade && !isAvailable" class="text-warning font-italic">
      <span v-if="isRestricted">
        Your reputation with this faction precludes the sale of this equipment to you.
        That does not prevent you from salivating from the show room window, however.
        <span v-if="!canAfford">Not that you could afford it anyway.</span>
      </span>
      <span v-else-if="!canAfford">You do not have enough money for this upgrade.</span>
      <span v-else-if="!hasRoom">Your ship does not have and available free hard point for this upgrade.</span>
    </p>

    <p>
      <button :disabled="!isAvailable" @click="buy=true" type="button" class="btn btn-dark">Purchase</button>
      <button :disabled="!hasUpgrade"  @click="sell=true" type="button" class="btn btn-dark">Sell</button>
    </p>

    <def y=0 split="5" term="Buy" :def="price|csn" />
    <def y=0 split="5" term="Sell" :def="sellPrice|csn" />
    <def y=0 split="5" term="Mass" :def="info.mass|csn" />

    <def v-if="info.cargo" y=0 split="5" term="Cargo space" :def="info.cargo" />
    <def v-if="info.tank" y=0 split="5" term="Fuel tank" :def="info.tank" />

    <def v-if="info.thrust" y=0 split="5" term="Max thrust" :def="info.thrust|unit('kN')" />

    <def v-if="fuelRate" y=0 split="5" term="Fuel rate">
      {{fuelRate}}
    </def>

    <def v-if="info.damage" y=0 split="5" term="Damage" :def="info.damage" />
    <def v-if="info.reload" y=0 split="5" term="Reloads every" :def="info.reload|unit('rounds')" />
    <def v-if="info.interceptable" y=0 split="5" term="Interceptable" :def="info.interceptable|yn|caps" />
    <def v-if="info.rate" y=0 split="5" term="Rate of fire">{{info.rate}} / round</def>
    <def v-if="info.accuracy" y=0 split=5 term="Accuracy">{{info.accuracy*100|R}}%</def>

    <def v-if="info.armor" y=0 split="5" term="Armor" :def="info.armor" />
    <def v-if="info.dodge" y=0 split="5" term="Dodge" :def="info.dodge|pct(2)" />
    <def v-if="info.intercept" y=0 split="5" term="Intercept" :def="info.intercept|pct(2)" />
    <def v-if="info.stealth" y=0 split=5 term="Stealth" :def="info.stealth|pct(2)" />
  </Section>

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
