<template>
<div>
<button @click="detail=!detail" type="button" class="btn w-100 my-3"
  :class="{
    'text-success': hasUpgrade,
    'text-secondary': !hasUpgrade && !isAvailable,
    'btn-dark': detail,
    'btn-secondary': !detail
  }">
    {{$caps(info.name)}}
    <span class="badge rounded-pill float-end">{{$csn(price)}}</span>
</button>

<Section v-if="detail" class="my-3" :notitle=1 :title="$caps(info.name)">
  <p class="fst-italic">{{info.desc}}</p>

  <p v-if="!marketHasUpgrade" class="text-warning fst-italic">
    This upgrade is not available here.
  </p>

  <p v-if="marketHasUpgrade && !isAvailable" class="text-warning fst-italic">
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

  <def y=0 split="5" term="Buy" :def="$csn(price)" />
  <def y=0 split="5" term="Sell" :def="$csn(sellPrice)" />
  <def y=0 split="5" term="Mass" :def="$csn(info.mass)" />

  <def v-if="info.cargo" y=0 split="5" term="Cargo space" :def="info.cargo" />
  <def v-if="info.tank" y=0 split="5" term="Fuel tank" :def="info.tank" />

  <def v-if="info.thrust" y=0 split="5" term="Max thrust" :def="$unit(info.thrust, 'kN')" />

  <def v-if="fuelRate" y=0 split="5" term="Fuel rate">
    {{fuelRate}}
  </def>

  <def v-if="info.damage" y=0 split="5" term="Damage" :def="info.damage" />
  <def v-if="info.reload" y=0 split="5" term="Reloads every" :def="$unit(info.reload, 'rounds')" />
  <def v-if="info.interceptable" y=0 split="5" term="Interceptable" :def="$caps($yn(info.interceptable))" />
  <def v-if="info.rate" y=0 split="5" term="Rate of fire">{{info.rate}} / round</def>
  <def v-if="info.accuracy" y=0 split=5 term="Accuracy">{{$R(info.accuracy*100)}}%</def>

  <def v-if="info.armor" y=0 split="5" term="Armor" :def="info.armor" />
  <def v-if="info.dodge" y=0 split="5" term="Dodge" :def="$pct(info.dodge, 2)" />
  <def v-if="info.intercept" y=0 split="5" term="Intercept" :def="$pct(info.intercept, 2)" />
  <def v-if="info.stealth" y=0 split=5 term="Stealth" :def="$pct(info.stealth, 2)" />
</Section>

<modal v-if="buy" @close="buy=false" close='No'>
  Purchase and install <b>{{info.name}}</b> for {{$csn(price)}} credits?
  <template #footer><btn @click="buyAddOn" close=1>Yes</btn></template>
</modal>

<modal v-if="sell" @close="sell=false" close='No'>
  Remove and sell your <b>{{info.name}}</b> for {{$csn(sellPrice)}} credits?
  <template #footer><btn @click="sellAddOn" close=1>Yes</btn></template>
</modal>
</div>
</template>

<script>
export default {
  props: ['type'],

  data() {
    return {
      detail: false,
      buy:    false,
      sell:   false,
    };
  },

  computed: {
    planet()     { return this.game.here              },
    player()     { return this.game.player            },
    ship()       { return this.player.ship            },
    info()       { return this.data.addons[this.type] },
    sellPrice()  { return Math.ceil(0.7 * this.price) },

    fuelRate() {
      if (this.info.burn_rate) {
        return (this.info.burn_rate / this.data.hours_per_turn) + ' tonnes/hour';
      }
      else if (this.info.burn_rate_pct) {
        return (this.info.burn_rate_pct * 100) + '% reduction';
      }
    },

    price() {
      return Math.ceil(this.planet.repair.addonPrice(this.type, this.player));
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

    marketHasUpgrade() {
      if (this.info.hasOwnProperty('markets')) {
        for (const trait of this.info.markets) {
          if (this.planet.hasTrait(trait)) {
            return true;
          }
        }

        return false;
      }

      return true;
    },

    isAvailable() {
      return !this.isRestricted && this.canAfford && this.hasRoom && this.marketHasUpgrade;
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
    },

    sellAddOn() {
      this.player.ship.removeAddOn(this.type);
      this.player.credit(this.sellPrice);
      this.game.save_game();
    },
  },
};
</script>
