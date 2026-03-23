<template>
  <modal title="Refuel" close="Nevermind" xclose=true @close="$emit('close')">
    <p>
      A dock worker wearing worn, grey coveralls approaches gingerly. A patch on
      his uniform identifies him as "Ray". He nods at your ship, "Fill 'er up?"
    </p>
    <def term="Price" :def="$unit($csn(price), 'cr / tonne')" />
    <def term="Fuel" :def="$unit($csn(change), 'tonnes')" />
    <def term="Total" :def="$unit($csn(price * change), 'cr')" />
    <slider class="my-3" v-model:value="change" min=0 :max="max" step="1" minmax=true />
    <template #footer><btn @click="fillHerUp" close=1>Purchase fuel</btn></template>
  </modal>
</template>

<script>
export default {
  data() {
    return { change: 0 };
  },

  computed: {
    need()  { return this.game.player.ship.refuelUnits() },
    max()   { return Math.min(this.need, Math.floor(this.game.player.money / this.price)) },
    price() { return this.game.here.pricing.fuelPricePerTonne(this.game.player) },
  },

  methods: {
    fillHerUp() {
      if (this.change !== NaN && this.change > 0 && this.change <= this.max) {
        this.game.player.debit(this.change * this.price);
        this.game.player.ship.refuel(this.change);
        this.game.turn();
      }
    },
  },
};
</script>
