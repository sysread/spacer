import * as util from '../util';
import Physics from '../physics';
import Vue from 'vue';

import './global';
import './common';
import './modal';
import './row';
import './status';


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
<template #title-pre><Flag :width="50" :faction="person.faction.abbrev" class="m-1" /></template>

<def term="Name" :def="name" />
<def term="Money" :def="$unit($csn(money), 'c')" />
<def term="Home" :def="$caps(home)" />
<def term="Faction" :def="$caps(faction)" />
<def term="Thrust endurance" :def="$unit($R(accel, 2), 'G')" />

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
      return `${label} <span class="badge rounded-pill">${standing}</span>`;
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
  <template #def><span>
    {{label(faction)}}
    <span class="badge rounded-pill ms-2">{{$R(standing(faction))}}</span>
  </span></template>
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
    <template #def><div>
      {{ship.cargoUsed}}/{{ship.cargoSpace}} bays full
      <div v-if="ship.cargoUsed" v-for="item in cargo" :key="item.name">
        {{$csn(item.amount)}} units of {{item.name}} ({{$csn(item.mass)}} tonnes)
      </div>
    </div></template>
  </def>

  <def term="Mass" :def="$unit(mass, 'tonnes')" />
  <def term="Thrust" :def="$unit(thrust, 'kN')" />
  <def term="Max Acc." :def="$unit(acc, 'G')" />
  <def term="Fuel" :def="$unit(tank, 'tonnes')" />
  <def term="Drive" :def="$unit(ship.drives, ship.drive.name)" />
  <def term="Range" :def="$unit(burn, 'hours at max thrust')" />
  <def term="Fuel rate" :def="$unit($R(fuelRate, 4), 'tonnes/hr at max thrust')" />
</Section>

<Section notitle=1>
  <def term="Hull">{{$R(ship.hull, 2)}} / {{ship.fullHull}}</def>
  <def term="Armor">{{$R(ship.armor, 2)}} / {{ship.fullArmor}}</def>
  <def term="Hard points">{{ship.hardpoints - ship.availableHardPoints()}} / {{ship.hardpoints}}</def>
  <def term="Stealth" :def="stealth + '%'" info="Reduction in the chance of being noticed by patrols and pirates while en route" />
  <def term="Intercept" :def="intercept + '%'" info="The chance of intercepting a missile attack with defensive armaments" />
  <def term="Evasion" :def="dodge + '%'" info="The chance of dodging an attack based on the mass to thrust ratio of the ship" />

  <def term="Upgrades">
    <template #def>
      <div v-if="Object.keys(addons).length > 0">
        <btn v-for="addon of addons" :key="addon" block=1 @click="toggleAddOn(addon)" class="text-truncate">
          <template v-if="addOnCount(addon) > 1">[{{addOnCount(addon)}}]</template>
          {{$caps(addOnName(addon))}}
        </btn>
        <modal v-if="showAddOn" @close="toggleAddOn(showAddOn)" close="Close" :title="addOnName(showAddOn)">
          <def term="Installed" :def="addOnCount(showAddOn)" />
          <template v-for="(value, key) of addOnData" :key="key"><def v-if="key != 'price' && key != 'markets' && !key.startsWith('is_')" :term="$name($caps(key))" :def="value" /></template>
          <def term="Price" :def="$csn(addOnData.price)" />
        </modal>
      </div>
      <span v-else>None</span>
    </template>
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
