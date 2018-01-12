define(function(require, exports, module) {
  const Game = require('game');
  const Vue  = require('vendor/vue');
  const data = require('data');

  require('component/card');
  require('component/exchange');
  require('component/modal');
  require('component/row');


  Vue.component('shipyard', {
    data: function() {
      return {
        refuel: false,
      };
    },
    methods: {
      open: function(page){ Game.open(page) },
    },
    template: `

<div>
  <card title="Shipyard">
    <card-text>
      The shipyard is like shipyards everywhere. There are piles of vaguely
      forgotten things, robotic lifters trundling around, "gently used" ships
      parked in distant berths, the occassional newly laid vessel standing
      out for its lack of patches and hull corrosion.
    </card-text>

    <card-text>
      And, of course, the yard manager who is only too happy to top off your
      fuel tank, repair any damage your ship might have sustained, no
      questions asked, heh, heh, and perform maintenance that cannot easily
      be done while underway.
    </card-text>

    <card-text>
      For a nominal fee, they will throw in an invisible corrosion protectant
      coating, too. If you are looking for something new, they have a hauler
      just came in, very good condition, barely a nick on her, pilot was a
      nice older lady...
    </card-text>

    <row>
      <button type="button" class="btn btn-dark btn-block m-1" @click="refuel=true">Transfer fuel</button>
      <button type="button" class="btn btn-dark btn-block m-1" @click="open('ships')">Ships</button>
      <button type="button" class="btn btn-dark btn-block m-1" @click="open('addons')">Upgrades</button>
    </row>
  </card>

  <shipyard-refuel v-if="refuel" @close="refuel=false" />
</div>

    `,
  });


  Vue.component('shipyard-refuel', {
    data: function() {
      return {
        change: 0,
      };
    },
    computed: {
      need:  function() { return Game.game.player.ship.refuelUnits() },
      have:  function() { return Game.game.player.ship.cargo.get('fuel') },
      max:   function() { return Math.min(this.have, this.need) },
      mass:  function() { return data.resources.fuel.mass },
      tank:  function() { return Math.min(Game.game.player.ship.tank, Math.floor(Game.game.player.ship.fuel) + (this.mass * this.change)) },
      cargo: function() { return Game.game.player.ship.cargo.get('fuel') - this.change },
    },
    methods: {
      fillHerUp: function() {
        const units = this.change;
        if (units !== NaN && units > 0 && units <= this.max) {
          Game.game.player.ship.refuel(units);
          Game.game.player.ship.cargo.dec('fuel', units);
          Game.game.turn();
          Game.game.save_game();
          Game.game.refresh();
        }
      },
    },
    template: `

<modal title="Refuel your ship?" close="Nevermind" xclose=true @close="$emit('close')">
  <p>
    You may transfer fuel purchased in the market from your cargo hold to your ship's fuel tank here.
    One cargo unit of fuel masses {{mass}}  metric tonnes.
  </p>

  <row>
    <cell size=3>Cargo (units)</cell><cell size=3><input :value="Math.floor(cargo)" type="number" class="form-control" readonly /></cell>
    <cell size=3>Tank (tonnes)</cell><cell size=3><input :value="Math.floor(tank)"  type="number" class="form-control" readonly /></cell>
  </row>

  <slider :value.sync="change" min=0 :max="max" step="1" minmax=true />

  <button slot="footer" @click="fillHerUp" type="button" class="btn btn-dark" data-dismiss="modal">
    Fill her up
  </button>
</modal>

    `,
  });
});
