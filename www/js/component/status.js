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

    data() {
      return {
        show_confirm: false,
      };
    },

    computed: {
      name    : function() {return this.person.name},
      money   : function() {return this.person.money},
      home    : function() {return this.data.bodies[this.person.home].name},
      faction : function() {return this.person.faction.full_name},
      accel   : function() {return this.person.maxAcceleration() / Physics.G },
    },

    methods: {
      newGameConfirm: function() {
        this.show_confirm = true;
      },

      newGame: function(confirmed) {
        if (confirmed) {
          this.$emit('open', 'newgame');
        } else {
          this.show_confirm = false;
        }
      },
    },

    template: `
<card :title="name">
  <def term="Name" :def="name" />
  <def term="Money" :def="money|csn|unit('c')" />
  <def term="Home" :def="home|caps" />
  <def term="Faction" :def="faction|caps" />
  <def term="Thrust endurance" :def="accel|R(2)|unit('G')" />

  <btn @click="newGameConfirm" class="float-right">New Game</btn>

  <confirm v-if="show_confirm" yes="Yes" no="No" @confirm="newGame">
    Delete this game and begin a new game? This cannot be undone.
  </confirm>
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
<card title="Politics">
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
      stealth:   function() {return util.R(this.ship.stealth * 100, 2)},
      intercept: function() {return util.R(this.ship.intercept * 100, 2)},
      dodge:     function() {return util.R(this.ship.dodge * 100, 2)},

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
<card :title="ship.type|caps">
  <card class="my-3">
    <def term="Cargo">
      <div slot="def">
        {{ship.cargoUsed}}/{{ship.cargoSpace}} bays full
        <div v-if="ship.cargoUsed" v-for="item in cargo" :key="item.name">
          {{item.amount|csn}} units of {{item.name}} ({{item.mass|csn}} tonnes)
        </div>
      </div>
    </def>

    <def term="Mass" :def="mass|unit('tonnes')" />
    <def term="Thrust" :def="thrust|unit('kN')" />
    <def term="Max Acc." :def="acc|unit('G')" />
    <def term="Fuel" :def="tank|unit('tonnes')" />
    <def term="Drive" :def="ship.drives|unit(ship.drive.name)" />
    <def term="Range" :def="burn|unit('hours at max thrust')" />
    <def term="Fuel rate" :def="fuelRate|R(4)|unit('tonnes/hr at max thrust')" />
  </card>

  <card class="my-3">
    <def term="Hull">{{ship.hull|R(2)}} / {{ship.fullHull}}</def>
    <def term="Armor">{{ship.armor|R(2)}} / {{ship.fullArmor}}</def>
    <def term="Hard points">{{ship.hardpoints - ship.availableHardPoints()}} / {{ship.hardpoints}}</def>
    <def term="Stealth" :def="stealth + '%'" info="Reduction in the chance of being noticed by patrols and pirates while en route" />
    <def term="Intercept" :def="intercept + '%'" info="The chance of intercepting a missile attack with defensive armaments" />
    <def term="Evasion" :def="dodge + '%'" info="The chance of dodging an attack based on the mass to thrust ratio of the ship" />

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
