define(function(require, exports, module) {
  const Vue  = require('vendor/vue');
  const util = require('util');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/exchange');
  require('component/modal');
  require('component/row');

  Vue.component('shipyard', {
    data: function() {
      return {
        modal: '',
      };
    },
    methods: {
      affordFuel: function()    { return this.game.player.money >= this.game.here.buyPrice('fuel') * 1.035 },
      needsFuel:  function()    { return !this.game.player.ship.tankIsFull() },
      hasFuel:    function()    { return this.game.player.ship.cargo.count('fuel') > 0 },
      hasDamage:  function()    { return this.game.player.ship.hasDamage() },
      open:       function(loc) { this.$emit('open', loc) },
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
      <btn :disabled="!needsFuel() || !affordFuel()" :block=1 class="m-1" @click="modal='refuel'">Refuel</btn>
      <btn :disabled="!needsFuel() || !hasFuel()" :block=1 class="m-1" @click="modal='transfer'">Transfer fuel</btn>
      <btn :disabled="!hasDamage()" :block=1 class="m-1" @click="modal='repair'">Repairs</btn>
      <btn :block=1 class="m-1" @click="open('ships')">Ships</btn>
      <btn :block=1 class="m-1" @click="open('addons')">Upgrades</btn>
    </row>
  </card>

  <shipyard-refuel v-if="modal=='refuel'" @close="modal=''" />
  <shipyard-transfer v-if="modal=='transfer'" @close="modal=''" />
  <shipyard-repair v-if="modal=='repair'" @close="modal=''" />
</div>
    `,
  });

  Vue.component('shipyard-refuel', {
    data: function() { return { change: 0 } },
    computed: {
      need:  function() { return this.game.player.ship.refuelUnits() },
      max:   function() { return Math.min(this.need, Math.floor(this.game.player.money / this.price)) },
      price: function() { return Math.ceil(this.game.here.buyPrice('fuel') * 1.035) },
    },
    methods: {
      fillHerUp: function() {
        if (this.change !== NaN && this.change > 0 && this.change <= this.max) {
          this.game.player.debit(this.change * this.price);
          this.game.player.ship.refuel(this.change);
          this.game.turn();
        }
      },
    },
    template: `
<modal title="Refuel" close="Nevermind" xclose=true @close="$emit('close')">
  <p>
    A dock worker wearing worn, grey coveralls approaches gingerly. A patch on
    his uniform identifies him as "Ray". He nods at your ship, "Fill 'er up?"
  </p>
  <def term="Price/tonne" :def="price|csn" />
  <def term="Fuel" :def="change" />
  <def term="Total" :def="(price * change)|csn" />
  <slider class="my-3" :value.sync="change" min=0 :max="max" step="1" minmax=true />
  <btn slot="footer" @click="fillHerUp" close=1>Purchase fuel</btn>
</modal>
    `,
  });

  Vue.component('shipyard-transfer', {
    data: function() {
      return { change: 0 };
    },
    computed: {
      need:  function() { return this.game.player.ship.refuelUnits() },
      have:  function() { return this.game.player.ship.cargo.count('fuel') },
      max:   function() { return Math.min(this.have, this.need) },
      tank:  function() { return Math.min(this.game.player.ship.tank, this.game.player.ship.fuel + this.change) },
      cargo: function() { return this.game.player.ship.cargo.count('fuel') - this.change },
    },
    methods: {
      fillHerUp: function() {
        if (this.change !== NaN && this.change > 0 && this.change <= this.max) {
          this.game.player.ship.refuel(this.change);
          this.game.player.ship.cargo.dec('fuel', this.change);
          this.game.turn();
        }
      },
    },
    template: `
<modal title="Transfer fuel to tank" close="Nevermind" xclose=true @close="$emit('close')">
  <p>You may transfer fuel purchased in the market from your cargo hold to your ship's fuel tank here.</p>
  <def term="Cargo" :def="Math.floor(cargo)" />
  <def term="Tank" :def="Math.floor(tank)" />
  <slider class="my-3" :value.sync="change" min=0 :max="max" step="1" minmax=true />
  <btn slot="footer" @click="fillHerUp" close=1>Transfer fuel</btn>
</modal>
    `,
  });

  Vue.component('shipyard-repair', {
    data() {
      return {
        repair_hull:  0,
        repair_armor: 0,
      };
    },

    computed: {
      money()            { return this.game.player.money                        },
      need_hull()        { return Math.ceil(this.game.player.ship.damage.hull)  },
      need_armor()       { return Math.ceil(this.game.player.ship.damage.armor) },
      price_hull_each()  { return this.data.ship.hull.repair                    },
      price_armor_each() { return this.data.ship.armor.repair                   },
      price_hull()       { return this.price_hull_each * this.repair_hull       },
      price_armor()      { return this.price_armor_each * this.repair_armor     },
      price_total()      { return this.price_hull + this.price_armor            },

      max_hull() {
        return Math.min(
          (this.money - this.price_armor) / this.price_hull_each,
          this.need_hull,
        );
      },

      max_armor() {
        return Math.min(
          (this.money - this.price_hull) / this.price_armor_each,
          this.need_armor,
        );
      },
    },

    methods: {
      repair() {
        if (this.price_total) {
          this.game.player.debit(this.price_total);
          this.game.player.ship.repairDamage(this.repair_hull, this.repair_armor);
          this.game.turn();
        }
      },
    },

    template: `
<modal title="Repair your ship" close="Nevermind" xclose=true @close="$emit('close')">
  <p>
    The shipyard is capable of repairing most structural damage to a ship.
    You have {{money|csn|unit('c')}} available for repairs.
  </p>

  <def term="Total price" :def="price_total|R(1)|csn|unit('c')" />

  <def term="Hull" :def="price_hull|R(1)|csn|unit('c')" />
  <slider class="my-3" :value.sync="repair_hull"  min=0 :max="max_hull|R(1)"  step=1 minmax=true>
    <span class="btn btn-dark" slot="pre">{{need_hull - repair_hull|R(1)}}</span>
    <span class="btn btn-dark" slot="post">{{repair_hull|R(1)}}</span>
  </slider>

  <def term="Armor" :def="price_armor|R(1)|csn|unit('c')" />
  <slider class="my-3" :value.sync="repair_armor" min=0 :max="max_armor|R(1)" step=1 minmax=true>
    <span class="btn btn-dark" slot="pre">{{need_armor - repair_armor|R(1)}}</span>
    <span class="btn btn-dark" slot="post">{{repair_armor|R(1)}}</span>
  </slider>

  <btn slot="footer" @click="repair" close=1>Repair ship</btn>
</modal>
    `,
  });
});
