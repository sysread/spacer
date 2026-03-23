<template>
  <div>
    <p>
      Your navigational computer automatically calculates the optimal
      trajectory from your current location to the other settlements in the
      system.
    </p>

    <p>
      Being born on {{$caps(home)}}, your body is adapted to
      {{$R(gravity, 2)}}G, allowing you to endure a maximum sustained burn of
      {{$R(max_accel, 2)}}G.
    </p>

    <p>
      Carrying {{$unit($csn($R(ship_mass)), 'metric tonnes')}}, your ship is
      capable of {{$unit($R(ship_accel, 2), 'G')}} of acceleraction. With
      {{$csn($R(ship_fuel, 2))}} tonnes of fuel, your ship has a maximum burn
      time of {{$csn($R(ship_burn_time))}} hours at maximum thrust.
    </p>

    <div v-if="has_route">
      <def split=4 term="Destination"  :def="$caps(transit.dest)" />
      <def split=4 term="Distance"     :def="distance" />
      <def split=4 term="Acceleration" :def="$unit($R(transit.accel_g, 3), 'G')" />
      <def split=4 term="Max velocity" :def="$unit($csn($R(transit.maxVelocity/1000)), 'km/s')" />
      <def split=4 term="Fuel"         :def="$unit($R(transit.fuel, 2), 'tonnes')" />
      <def split=4 term="Arrival"      :def="transit.str_arrival_date" />

      <row y=1>
        <cell size=12>
          <slider minmax=true step="1" min="0" :max="num_routes - 1" v-model:value="selected" />
        </cell>
      </row>

      <row y=1>
        <cell size=12>
          <btn @click="$emit('route', transit)" block=1 close=1>Select this route</btn>
        </cell>
      </row>
    </div>
    <p v-else class="text-warning fst-italic">
      Your ship, as loaded, cannot reach this destination in less than 1 year with available fuel.
    </p>
  </div>
</template>

<script>
import Physics from '../physics';
import * as nc from './navcomp-controller';

export default {
  props: ['dest', 'navcomp'],

  data() {
    return {
      'selected': 0,
    };
  },

  computed: {
    home()           { return this.game.player.home },
    gravity()        { return this.game.player.homeGravity },
    max_accel()      { return this.game.player.maxAcceleration() / Physics.G },
    ship_accel()     { return this.game.player.shipAcceleration() / Physics.G },
    ship_mass()      { return this.game.player.ship.currentMass() },
    ship_fuel()      { return this.game.player.ship.fuel },
    ship_burn_time() { return this.game.player.ship.maxBurnTime() * this.data.hours_per_turn },
    transits()       { return this.navcomp.getTransitsTo(this.dest) },
    has_route()      { return this.transits.length > 0 },
    num_routes()     { return this.transits.length },
    transit()        { if (this.has_route) return this.transits[this.selected] },
    distance()       { return nc.transitDisplayDistance(this.transit) },
  },
};
</script>
