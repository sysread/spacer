<template>
  <modal title="Transfer fuel to tank" close="Nevermind" xclose=true @close="$emit('close')">
    <p>You may transfer fuel purchased in the market from your cargo hold to your ship's fuel tank here.</p>

    <def term="Cargo">
      {{$unit($R(hold, 2), 'tonnes')}} ({{$unit($R(left, 2), 'cu')}})
    </def>

    <def term="Tank">
      {{$unit($R(tank, 2), 'tonnes')}} ({{$unit($R(used, 2), 'cu')}})
    </def>

    <def term="Waste">
      {{$unit($R(waste, 2), 'tonnes')}}
    </def>

    <stepper class="my-3" v-model:value="change" min=0 :max="max" step=1 :capacity="game.player.ship.cargoSpace" minmax=true />
    <template #footer><btn @click="fillHerUp" close=1>Transfer fuel</btn></template>
  </modal>
</template>

<script>
import data from '../data';

const FuelMass = data.resources.fuel.mass;

export default {
  data() {
    return { change: 0 };
  },
  computed: {
    ship()  { return this.game.player.ship },
    need()  { return Math.ceil(this.ship.refuelUnits() / FuelMass) },
    have()  { return this.ship.cargo.count('fuel') },
    max()   { return Math.min(this.have, this.need) },
    used()  { return this.change },
    left()  { return this.have - this.used },
    tank()  { return Math.min(this.ship.tank, this.ship.fuel + (this.change * FuelMass)) },
    hold()  { return this.left * FuelMass },
    waste() { return Math.max(0, (this.used * FuelMass) - this.ship.refuelUnits()) },
  },
  methods: {
    fillHerUp() {
      if (this.change !== NaN && this.change > 0 && this.change <= this.max) {
        this.game.player.ship.refuel(this.change);
        this.game.player.ship.cargo.dec('fuel', this.used);
        this.game.turn();
      }
    },
  },
};
</script>
