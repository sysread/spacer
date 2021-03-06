"use strict"

define(function(require, exports, module) {
  const util    = require('util');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');

  require('component/global');
  require('component/common');
  require('component/modal');
  require('component/row');
  require('component/status');


  Vue.component('person-status', {
    props: ['person'],

    data() {
      return {
        show_confirm: false,
      };
    },

    computed: {
      name:    function() {return this.person.name},
      money:   function() {return Math.floor(this.person.money)},
      home:    function() {return this.data.bodies[this.person.home].name},
      faction: function() {return this.person.faction.full_name},
      accel:   function() {return this.person.maxAcceleration() / Physics.G },
    },

    methods: {
      openOptions: function() {
        this.$emit('open', 'options');
      },

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
<Section title="Player">
  <Flag slot="title-pre" :width="50" :faction="person.faction.abbrev" class="m-1" />

  <def term="Name" :def="name" />
  <def term="Money" :def="money|csn|unit('c')" />
  <def term="Home" :def="home|caps" />
  <def term="Faction" :def="faction|caps" />
  <def term="Thrust endurance" :def="accel|R(2)|unit('G')" />

  <div class="my-2">
    <btn @click="openOptions">Options</btn>
    <btn @click="newGameConfirm" class="mx-2">New Game</btn>
  </div>

  <confirm v-if="show_confirm" yes="Yes" no="No" @confirm="newGame">
    Delete this game and begin a new game? This cannot be undone.
  </confirm>
</Section>
    `,
  });


  Vue.component('contract-status', {
    props: ['person'],

    data() {
      return {
        show_confirm: false,
      };
    },

    methods: {
      cancel(contract, confirmed) {
        if (this.show_confirm) {
          if (confirmed) {
            this.$nextTick(() => contract.cancel());
          }

          this.show_confirm = false;
        }
        else {
          this.show_confirm = true;
        }
      }
    },

    template: `
<Section title="Contracts">
  <template v-if="person.contracts.length > 0">
    <Section v-for="(contract, idx) of person.contracts" :key="idx" :title="contract.short_title">
      <p>{{contract.description}}</p>
      <p>{{contract.description_remaining}}</p>

      <btn @click="cancel(contract)" block=1 class="my-3">Cancel contract</btn>

      <confirm v-if="show_confirm" yes="Yes" no="No" @confirm="cancel(contract, $event)">
        <h5>{{contract.short_title}}</h5>
        Breaking a contract may result in loss of standing or monetary penalties.
        Are you sure you wish to cancel this contract?
      </confirm>
    </Section>
  </template>
  <template v-else>
    No active contracts.
  </template>
</Section>
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
<Section title="Politics">
  <def v-for="faction of factions" :key="faction" caps="true" :term="faction">
    <span slot="def">
      {{label(faction)}}
      <span class="badge badge-pill ml-2">{{standing(faction)|R}}</span>
    </span>
  </def>
</Section>
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
      type()      { return util.ucfirst(this.ship.type) },
      mass()      { return util.csn(Math.floor(this.ship.currentMass())) },
      thrust()    { return util.csn(this.ship.thrust) },
      acc()       { return util.R(this.ship.currentAcceleration() / Physics.G, 2) },
      tank()      { return util.R(this.ship.fuel, 2) + ' / ' + this.ship.tank },
      burn()      { return util.csn(this.ship.maxBurnTime() * this.data.hours_per_turn) },
      addOnData() { return this.data.addons[this.showAddOn] },
      fuelRate()  { return this.ship.fuelrate / this.data.hours_per_turn },
      stealth()   { return util.R(this.ship.stealth * 100, 2) },
      intercept() { return util.R(this.ship.intercept * 100, 2) },
      dodge()     { return util.R(this.ship.dodge * 100, 2) },

      addons() {
        const addons = {};

        for (const a of this.ship.addons) {
          addons[a] = this.addOnName(a);
        }

        return Object.keys(addons).sort((a, b) => {
          if (addons[a] > addons[b]) {
            return 1;
          } else if (addons[a] < addons[b]) {
            return -1;
          } else {
            return 0;
          }
        });
      },

      cargo() {
        const cargo = [];
        for (const item of this.ship.cargo.keys()) {
          const amt = this.ship.cargo.get(item);
          if (amt === 0) continue;
          cargo.push({name: item, amount: amt, mass: this.data.resources[item].mass * amt});
        }

        return cargo;
      },
    },
    methods: {
      addOnCount(addon) {
        let count = 0;

        for (const a of this.ship.addons) {
          if (a == addon) {
            ++count;
          }
        }

        return count;
      },

      addOnName(addon) {
        return this.data.addons[addon].name;
      },

      toggleAddOn(addon) {
        if (this.showAddOn === addon)
          this.showAddOn = false;
        else
          this.showAddOn = addon;
      },
    },
    template: `
<Section title="Ship">
  <Section notitle=1>
    <def term="Class" :def="type" />
    <def term="Cargo" info="Cargo is measured in cargo units (cu), each enough to hold a standard-sized container of material. Mass for one cu varies by material.">
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
  </Section>

  <Section notitle=1>
    <def term="Hull">{{ship.hull|R(2)}} / {{ship.fullHull}}</def>
    <def term="Armor">{{ship.armor|R(2)}} / {{ship.fullArmor}}</def>
    <def term="Hard points">{{ship.hardpoints - ship.availableHardPoints()}} / {{ship.hardpoints}}</def>
    <def term="Stealth" :def="stealth + '%'" info="Reduction in the chance of being noticed by patrols and pirates while en route" />
    <def term="Intercept" :def="intercept + '%'" info="The chance of intercepting a missile attack with defensive armaments" />
    <def term="Evasion" :def="dodge + '%'" info="The chance of dodging an attack based on the mass to thrust ratio of the ship" />

    <def term="Upgrades">
      <div slot="def" v-if="Object.keys(addons).length > 0">
        <btn v-for="addon of addons" :key="addon" block=1 @click="toggleAddOn(addon)" class="text-truncate">
          <template v-if="addOnCount(addon) > 1">[{{addOnCount(addon)}}]</template>
          {{addOnName(addon)|caps}}
        </btn>
        <modal v-if="showAddOn" @close="toggleAddOn(showAddOn)" close="Close" :title="addOnName(showAddOn)">
          <def term="Installed" :def="addOnCount(showAddOn)" />
          <def v-for="(value, key) of addOnData" v-if="key != 'price' && key != 'markets' && !key.startsWith('is_')" :key="key" :term="key|caps|name" :def="value" />
          <def term="Price" :def="addOnData.price|csn" />
        </modal>
      </div>
      <span slot="def" v-else>None</span>
    </def>
  </Section>
</Section>
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
<div class="row">
  <person-status :person="person" class="my-3 col-md-6 col-12" @open="open" />
  <contract-status :person="person" class="my-3 col-md-6 col-12" />
  <faction-status :person="person" class="my-3 col-md-6 col-12" />
  <ship-status :ship="person.ship" class="my-3 col-md-6 col-12" />
</div>
    `,
  });
});
