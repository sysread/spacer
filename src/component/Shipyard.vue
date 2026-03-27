<template>
<div>
<Section title="Shipyard">
  <p>
    The shipyard is like shipyards everywhere. There are piles of vaguely
    forgotten things, robotic lifters trundling around, "gently used" ships
    parked in distant berths, the occassional newly laid vessel standing
    out for its lack of patches and hull corrosion.
  </p>

  <p>
    And, of course, the yard manager who is only too happy to top off your
    fuel tank, repair any damage your ship might have sustained, no
    questions asked, just my little joke, heh, heh, and perform maintenance
    that cannot easily be done while underway.
  </p>

  <p>
    For a nominal fee, they will throw in an invisible corrosion protectant
    coating, too. If you are looking for something new, they have a hauler
    just came in, very good condition, barely a nick on her, pilot was a
    nice older lady...
  </p>

  <btn block=1 :muted="!needsFuel() || !affordFuel()" @click="topHerOff">
    Top her off<template v-if="needsFuel() && affordFuel()">: {{$csn(maxFuel * fuelPrice)}} c</template>
  </btn>
  <btn block=1 :muted="!needsFuel() || !affordFuel()" @click="modal='refuel'">Refuel</btn>
  <btn block=1 :muted="!needsFuel() || !hasFuel()" @click="modal='transfer'">Transfer fuel</btn>
  <btn block=1 :muted="!hasDamage()" @click="modal='repair'">Repairs</btn>
  <btn block=1 @click="open('ships')">Ships</btn>
  <btn block=1 @click="open('addons')">Upgrades</btn>
</Section>

<shipyard-refuel v-if="modal=='refuel'" @close="modal=''" />
<shipyard-transfer v-if="modal=='transfer'" @close="modal=''" />
<shipyard-repair v-if="modal=='repair'" @close="modal=''" />
</div>
</template>

<script>
export default {
  data() {
    return {
      modal: '',
    };
  },
  computed: {
    fuelPrice() { return this.game.here.pricing.fuelPricePerTonne(this.game.player) },
    fuelNeed()  { return this.game.player.ship.refuelUnits() },
    maxFuel()   { return Math.min(this.fuelNeed, Math.floor(this.game.player.money / this.fuelPrice)) },
  },

  methods: {
    affordFuel() { return this.game.player.money >= this.fuelPrice },
    needsFuel()  { return !this.game.player.ship.tankIsFull() },
    hasFuel()    { return this.game.player.ship.cargo.count('fuel') > 0 },
    hasDamage()  { return this.game.player.ship.hasDamage() },
    open(loc)    { this.$emit('open', loc) },

    topHerOff() {
      if (this.maxFuel > 0) {
        this.game.player.debit(this.maxFuel * this.fuelPrice);
        this.game.player.ship.refuel(this.maxFuel);
        this.game.turn();
      }
    },
  },
};
</script>
