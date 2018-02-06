define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');

  require('component/common');
  require('component/card');
  require('component/row');

  Vue.component('person-status', {
    props: ['person'],
    computed: {
      money   : function() {return this.person.money},
      home    : function() {return data.bodies[this.person.home].name},
      faction : function() {return data.factions[this.person.faction].full_name},
      accel   : function() {return this.person.maxAcceleration() / Physics.G },
    },
    methods: {
      newGame: function() {
        game.open('newgame');
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
      factions: function() {return Object.keys(data.factions)},
    },
    methods: {
      factionStanding: function(faction) {
        const label    = game.player.getStandingLabel(faction);
        const standing = game.player.getStanding(faction);
        return `${label} <span class="badge badge-pill">${standing}</span>`;
      },
      standing: function(faction) {
        return game.player.getStanding(faction);
      },
      label: function(faction) {
        return game.player.getStandingLabel(faction);
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
      mass   : function() {return util.csn(Math.floor(this.ship.currentMass()))},
      thrust : function() {return util.csn(this.ship.thrust)},
      tank   : function() {return util.R(this.ship.fuel, 2) + '/' + this.ship.tank},
      burn   : function() {return util.csn(this.ship.maxBurnTime() * data.hours_per_turn)},
      addons : function() {return this.ship.addons.map((a) => {return data.shipAddOns[a].name})},
      cargo  : function() {
        const cargo = [];
        for (const item of this.ship.cargo.keys) {
          const amt = this.ship.cargo.get(item);
          if (amt === 0) continue;
          cargo.push({name: item, amount: amt, mass: data.resources[item].mass * amt});
        }

        return cargo;
      }
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
  <def term="Fuel" :def="tank|unit('tonnes')" />
  <def term="Range" :def="burn|unit('hours at maximum thrust')" />
  <def term="Drive" :def="ship.drives|unit(ship.drive.name)" />

  <def term="Upgrades">
    <ul slot="def" v-if="ship.addons.length > 0">
      <li v-for="addon of addons">{{addon|caps}}</li>
    </ul>
    <span slot="def" v-else>None</span>
  </def>
</card>
    `,
  });

  Vue.component('player-status', {
    computed: {
      person: function() {
        return game.player;
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
