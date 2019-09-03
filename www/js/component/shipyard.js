"use strict"

define(function(require, exports, module) {
  const Vue  = require('vendor/vue');
  const util = require('util');
  const data = require('data');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/exchange');
  require('component/modal');
  require('component/row');

  const FuelMass = data.resources.fuel.mass;

  Vue.component('shipyard', {
    data() {
      return {
        modal: '',
      };
    },
    methods: {
      affordFuel() { return this.game.player.money >= this.game.here.fuelPricePerTonne(this.game.player) },
      needsFuel()  { return !this.game.player.ship.tankIsFull() },
      hasFuel()    { return this.game.player.ship.cargo.count('fuel') > 0 },
      hasDamage()  { return this.game.player.ship.hasDamage() },
      open(loc)    { this.$emit('open', loc) },
    },
    template: `
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
    `,
  });


  Vue.component('shipyard-refuel', {
    data() {
      return { change: 0 };
    },

    computed: {
      need()  { return this.game.player.ship.refuelUnits() },
      max()   { return Math.min(this.need, Math.floor(this.game.player.money / this.price)) },
      price() { return this.game.here.fuelPricePerTonne(this.game.player) },
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

    template: `
<modal title="Refuel" close="Nevermind" xclose=true @close="$emit('close')">
  <p>
    A dock worker wearing worn, grey coveralls approaches gingerly. A patch on
    his uniform identifies him as "Ray". He nods at your ship, "Fill 'er up?"
  </p>
  <def term="Price" :def="price|csn|unit('cr / tonne')" />
  <def term="Fuel" :def="change|csn|unit('tonnes')" />
  <def term="Total" :def="(price * change)|csn|unit('cr')" />
  <slider class="my-3" :value.sync="change" min=0 :max="max" step="1" minmax=true />
  <btn slot="footer" @click="fillHerUp" close=1>Purchase fuel</btn>
</modal>
    `,
  });


  Vue.component('shipyard-transfer', {
    data() {
      return { change: 0 };
    },
    computed: {
      ship()  { return this.game.player.ship },

      // cargo units
      need()  { return Math.ceil(this.ship.refuelUnits() / FuelMass) },
      have()  { return this.ship.cargo.count('fuel') },
      max()   { return Math.min(this.have, this.need) },
      used()  { return this.change },
      left()  { return this.have - this.used },

      // tonnes
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
    template: `
<modal title="Transfer fuel to tank" close="Nevermind" xclose=true @close="$emit('close')">
  <p>You may transfer fuel purchased in the market from your cargo hold to your ship's fuel tank here.</p>

  <def term="Cargo">
    {{hold|R(2)|unit('tonnes')}} ({{left|R(2)|unit('cu')}})
  </def>

  <def term="Tank">
    {{tank|R(2)|unit('tonnes')}} ({{used|R(2)|unit('cu')}})
  </def>

  <def term="Waste">
    {{waste|R(2)|unit('tonnes')}}
  </def>

  <slider class="my-3" :value.sync="change" min=0 :max="max" step=1 minmax=true />
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
      avail()            { return this.game.here.getStock('metal') },
      money()            { return this.game.player.money },
      need_hull()        { return Math.ceil(this.game.player.ship.damage.hull) },
      need_armor()       { return Math.ceil(this.game.player.ship.damage.armor) },
      has_repairs()      { return this.game.here.hasRepairs() },
      price_hull_each()  { return this.game.here.hullRepairPrice(this.game.player) },
      price_armor_each() { return this.game.here.armorRepairPrice(this.game.player) },
      price_hull()       { return this.price_hull_each * this.repair_hull },
      price_armor()      { return this.price_armor_each * this.repair_armor },
      price_total()      { return this.price_hull + this.price_armor },

      max_hull() {
        return Math.min(
          (this.money - this.price_armor) / this.price_hull_each,
          this.need_hull,
          this.has_repairs - this.repair_armor,
        );
      },

      max_armor() {
        return Math.min(
          (this.money - this.price_hull) / this.price_armor_each,
          this.need_armor,
          this.has_repairs - this.repair_hull,
        );
      },

      next_availability() {
        const turns = this.game.here.estimateAvailability('metal');

        if (turns != undefined) {
          return Math.ceil(turns / this.data.turns_per_day);
        }
      }
    },

    methods: {
      repair() {
        if (this.price_total) {
          const count = this.repair_hull + this.repair_armor;
          this.game.here.buy('metal', count);
          this.game.player.debit(this.price_total);
          this.game.player.ship.repairDamage(this.repair_hull, this.repair_armor);
          this.game.turn();
        }
      },
    },

    template: `
<modal title="Repair your ship" :close="has_repairs ? 'Nevermind' : 'OK'" xclose=true @close="$emit('close')">
  <template v-if="has_repairs">
    <p>
      The shipyard is capable of repairing most structural damage to a ship.
      There are {{avail|csn}} units of metal in the market available for repairs.
      You have {{money|csn|unit('c')}} available for repairs.
    </p>

    <def term="Total price"  :def="price_total|R(1)|csn|unit('c')"      />
    <def term="Hull repair"  :def="price_hull_each|R(1)|csn|unit('c')"  />
    <def term="Armor repair" :def="price_armor_each|R(1)|csn|unit('c')" />

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
  </template>

  <div v-else class="font-italic text-warning">
    <p>The shipyard is currently unable to effect repairs due to a shortage of refined metal.</p>

    <p>
      <template v-if="next_availability == undefined">
        The dockyard supervisor does not know when they can expect a new shipment of metal to arrive.
      </template>

      <template v-else>
        The dockyard supervisor notes that they are expecting a load of refined metal in {{next_availability}} days.
      </template>

      If there is raw ore is available in the market, you could have some refined in the fabricators.
    </p>
  </div>
</modal>
    `,
  });
});
