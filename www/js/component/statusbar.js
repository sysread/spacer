define(function(require, exports, module) {
  "use strict"

  const Vue = require('vendor/vue');
  const util = require('util');

  require('component/global');

  Vue.component('StatusBar', {
    props: [],

    computed: {
      inTransit()  { return this.game.is_frozen && this.game.transit_plan != null },
      locus()      { return this.game.locus },
      money()      { return this.game._player ? Math.floor(this.game.player.money) : 0 },
      cargoUsed()  { return this.game._player ? this.game.player.ship.cargoUsed : 0 },
      cargoSpace() { return this.game._player ? this.game.player.ship.cargoSpace : 0 },
      fuel()       { return this.game._player ? this.game.player.ship.fuel : 0 },
      tank()       { return this.game._player ? this.game.player.ship.tank : 0 },
      fuelPct()    { return this.game._player ? util.R(100 * (this.fuel / this.tank)) : 0 },
      mass()       { return this.game._player ? util.R(this.game.player.ship.currentMass()) : 0 },

      // Re-calculate date from start date using game.turns so that the
      // reactive setter has something to watch since game.date is updated
      // incrementally with setHours rather than by updating the date property
      // on game each turn.
      date() {
        const dt = this.game.start_date();
        dt.setHours(dt.getHours() + this.game.turns * this.data.hours_per_turn);
        return this.game.strdate(dt).replace(/-/g, '.');
      },
    },

    template: `
<nav id="spacer-status" class="spacer-header fixed-top navbar navbar-dark">
  <span class="navbar-text text-capitalize" id="spacer-location">
    <template v-if="inTransit">&#10147;</template>
    {{locus}}
  </span>

  <span class="navbar-text">{{money|csn}} c</span>
  <span class="navbar-text">{{cargoUsed}}/{{cargoSpace}} cu</span>
  <span class="navbar-text d-none d-sm-inline">{{mass|csn}} tonnes</span>
  <span class="navbar-text">Fuel {{fuelPct}}%</span>
  <span class="navbar-text">{{date}}</span>
</nav>
    `,
  });
});
