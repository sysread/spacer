define(function(require, exports, module) {
  const data = require('data');
  const util = require('util');
  const Game = require('game');
  const Vue  = require('vendor/vue');

  require('component/card');
  require('component/row');

  Vue.component('person-status', {
    props: ['person'],
    computed: {
      money   : function() {return util.csn(this.person.money) + ' c'},
      home    : function() {return data.bodies[this.person.home].name},
      faction : function() {return data.factions[this.person.faction].full_name},
      accel   : function() {return this.person.maxAcceleration().toFixed(2) + ' G'},
    },
    methods: {
      newGame: function() {
        Game.open('newgame');
      }
    },
    template: `
<card>
  <card-header slot="header">
    <button @click="newGame" type="button" class="btn btn-dark">New Game</button>
    <h3>Captain</h3>
  </card-header>
  <def caps=true term="Money"     :def="money" />
  <def caps=true term="Home"      :def="home" />
  <def caps=true term="Faction"   :def="faction" />
  <def caps=true term="Endurance" :def="accel" />
</card>
    `,
  });

  Vue.component('faction-status', {
    props: ['person'],
    computed: {
      factions: function() {return Object.keys(data.factions)},
    },
    methods: {
      factionStanding: function(faction) {
        const label    = Game.game.player.getStandingLabel(faction);
        const standing = Game.game.player.getStanding(faction);
        return `${label} <span class="badge badge-pill">${standing}</span>`;
      },
      standing: function(faction) {
        return Game.game.player.getStanding(faction);
      },
      label: function(faction) {
        return Game.game.player.getStandingLabel(faction);
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
    computed: {
      mass   : function() {return util.csn(Math.floor(this.ship.currentMass())) + ' tonnes'},
      thrust : function() {return util.csn(this.ship.thrust) + ' kN'},
      fuel   : function() {return `${Math.round(this.ship.fuel * 100) / 100}/${this.ship.tank}`},
      burn   : function() {return `${util.csn(this.ship.maxBurnTime() * data.hours_per_turn)} hours at maximum thrust`},
      addons : function() {return ship.addons.map((a) => {return data.shipAddOns[a].name})},
      cargo  : function() {
        const cargo = [];
        for (let [item, amt] of this.ship.cargo.entries()) {
          if (amt > 0) {
            let mass = util.csn(data.resources[item].mass * amt);
            cargo.push(`${mass} tonnes of ${item} (${amt} cu)`);
          }
        }

        return cargo;
      }
    },
    template: `
<card>
  <card-header slot="header">
    <h3>Ship</h3>
  </card-header>
  <def caps=true term="Class" :def="ship.opt.shipclass" />
  <def caps=true term="Cargo"><span slot="def">{{ship.cargoUsed}}/{{ship.cargoSpace}}</span></def>
  <def caps=true term="Hull" :def="ship.hull" />
  <def caps=true term="Armor" :def="ship.armor" />
  <def caps=true term="Hard points" :def="ship.hardPoints" />
  <def term="Mass" :def="mass" />
  <def term="Thrust" :def="thrust" />
  <def caps=true term="Fuel" :def="fuel" />
  <def term="Range" :def="burn" />
  <def caps=true term="Drives" :def="ship.shipclass.drives" />
  <def caps=true term="Drive type" :def="ship.shipclass.drive" />

  <def term="Upgrades">
    <ul slot="def" v-if="ship.addons.length > 0">
      <li v-for="addon of addons">{{addon}}</li>
    </ul>
    <span slot="def" v-else>None</span>
  </def>

  <def term="Cargo">
    <ul slot="def" v-if="cargo.length > 0">
      <li v-for="item of cargo">{{item}}</li>
    </ul>
    <span slot="def" v-else>None</span>
  </def>
</card>
    `,
  });

  Vue.component('player-status', {
    computed: {
      person: function() {
        return Game.game.player;
      }
    },
    template: `
<div>
  <person-status :person="person" class="my-3" />
  <faction-status :person="person" class="my-3" />
  <ship-status :ship="person.ship" class="my-3" />
</div>
    `,
  });
});