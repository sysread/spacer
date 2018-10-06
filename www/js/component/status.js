define(function(require, exports, module) {
  const util    = require('util');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/modal');
  require('component/row');

  Vue.component('person-status', {
    props: ['person'],
    computed: {
      money   : function() {return this.person.money},
      home    : function() {return this.data.bodies[this.person.home].name},
      faction : function() {return this.person.faction.full_name},
      accel   : function() {return this.person.maxAcceleration() / Physics.G },
    },
    methods: {
      newGame: function() {
        this.$emit('open', 'newgame');
      }
    },
    template: `
<card>
  <card-header slot="header">
    <button @click="newGame" type="button" class="btn btn-dark">New Game</button>
    <h3>Captain</h3>
  </card-header>
  <def term="Money" :def="money|csn|unit('c')" />
  <def term="Home" :def="home|caps" />
  <def term="Faction" :def="faction|caps" />
  <def term="Thrust endurance" :def="accel|R(2)|unit('G')" />
</card>
    `,
  });

  Vue.component('faction-status', {
    props: ['person'],
    computed: {
      factions: function() {return Object.keys(this.data.factions)},
    },
    methods: {
      factionStanding: function(faction) {
        const label    = this.game.player.getStandingLabel(faction);
        const standing = this.game.player.getStanding(faction);
        return `${label} <span class="badge badge-pill">${standing}</span>`;
      },
      standing: function(faction) {
        return this.game.player.getStanding(faction);
      },
      label: function(faction) {
        return this.game.player.getStandingLabel(faction);
      },
    },
    template: `
<card>
  <card-header slot="header">
    <h3>Faction standing</h3>
  </card-header>
  <def v-for="faction of factions" :key="faction" caps="true" :term="faction">
    <span slot="def">
      {{label(faction)}}
      <span class="badge badge-pill ml-2">{{standing(faction)}}</span>
    </span>
  </def>
</card>
    `,
  });

  Vue.component('ship-status', {
    props: ['ship'],
    data: function() {
      return {
        showAddOn: false,
      };
    },
    computed: {
      mass:      function() {return util.csn(Math.floor(this.ship.currentMass()))},
      thrust:    function() {return util.csn(this.ship.thrust)},
      acc:       function() {return util.R(this.ship.currentAcceleration() / Physics.G, 2)},
      tank:      function() {return util.R(this.ship.fuel, 2) + '/' + this.ship.tank},
      burn:      function() {return util.csn(this.ship.maxBurnTime() * this.data.hours_per_turn)},
      addons:    function() {return this.ship.addons},
      addOnData: function() {return this.data.addons[this.showAddOn]},
      fuelRate:  function() {return this.ship.fuelrate / this.data.hours_per_turn},

      cargo:     function() {
        const cargo = [];
        for (const item of this.ship.cargo.keys) {
          const amt = this.ship.cargo.get(item);
          if (amt === 0) continue;
          cargo.push({name: item, amount: amt, mass: this.data.resources[item].mass * amt});
        }

        return cargo;
      },
    },
    methods: {
      addOnName: function(addon) {
        return this.data.addons[addon].name;
      },

      toggleAddOn: function(addon) {
        if (this.showAddOn === addon)
          this.showAddOn = false;
        else
          this.showAddOn = addon;
      },
    },
    template: `
<card>
  <card-header slot="header">
    <h3>Ship</h3>
  </card-header>
  <def term="Class" :def="ship.type|caps" />

  <def term="Cargo">
    <div slot="def">
      {{ship.cargoUsed}}/{{ship.cargoSpace}} bays full
      <div v-if="ship.cargoUsed" v-for="item in cargo" :key="item.name">
        {{item.amount|csn}} units of {{item.name}} ({{item.mass|csn}} tonnes)
      </div>
    </div>
  </def>

  <def term="Hull" :def="ship.hull" />
  <def term="Armor" :def="ship.armor" />
  <def term="Hard points" :def="ship.hardpoints" />
  <def term="Mass" :def="mass|unit('tonnes')" />
  <def term="Thrust" :def="thrust|unit('kN')" />
  <def term="Max Acc." :def="acc|unit('G')" />
  <def term="Fuel" :def="tank|unit('tonnes')" />
  <def term="Range" :def="burn|unit('hours at maximum thrust')" />
  <def term="Fuel rate">
    {{fuelRate|unit('tonnes/hr')}} at maximum thrust
  </def>
  <def term="Drive" :def="ship.drives|unit(ship.drive.name)" />
  <def term="Stealth" :def="(ship.stealth * 100) + '%'" />

  <def term="Upgrades">
    <div slot="def" v-if="ship.addons.length > 0">
      <btn v-for="(addon, idx) of addons" :key="idx" block=1 @click="toggleAddOn(addon)">{{addOnName(addon)|caps}}</btn>
      <modal v-if="showAddOn" @close="toggleAddOn(showAddOn)" close="Close" :title="addOnName(showAddOn)">
        <def v-for="(value, key) of addOnData" :key="key" :term="key|caps" :def="value" />
      </modal>
    </div>
    <span slot="def" v-else>None</span>
  </def>
</card>
    `,
  });

  Vue.component('player-status', {
    computed: {
      person: function() {
        return this.game.player;
      }
    },

    methods: {
      open(page) {
        this.$emit('open', page);
      },
    },

    template: `
<div>
  <person-status :person="person" class="my-3" @open="open" />
  <faction-status :person="person" class="my-3" />
  <ship-status :ship="person.ship" class="my-3" />
</div>
    `,
  });
});
