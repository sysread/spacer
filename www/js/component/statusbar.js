define(function(require, exports, module) {
  "use strict"

  const Vue = require('vendor/vue');
  const util = require('util');

  require('component/global');

  Vue.component('StatusBar', {
    props: [],

    computed: {
      locus()      { return this.game.locus },
      money()      { return Math.floor(this.game.player.money) },
      cargoUsed()  { return this.game.player.ship.cargoUsed },
      cargoSpace() { return this.game.player.ship.cargoSpace },
      fuelPct()    { return util.R(100 * this.game.player.ship.fuel / this.game.player.ship.tank) },
      date()       { return this.game.status_date() },
    },

    template: `
<nav id="spacer-status" class="spacer-header fixed-top navbar navbar-dark">
  <span class="navbar-text text-capitalize" id="spacer-location">{{locus}}</span>
  <span class="navbar-text">{{money|csn}} c</span>
  <span class="navbar-text">{{cargoUsed}}/{{cargoSpace}} cu</span>
  <span class="navbar-text">Fuel {{fuelPct}}%</span>
  <span class="navbar-text">{{date}}</span>
</nav>
    `,
  });
});
