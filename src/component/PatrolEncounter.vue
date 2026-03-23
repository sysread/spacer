<template>
<div class="p-3">
<h5>
  <Flag :faction="faction" width="75" />
  <template v-if="isBlockade">Blockade: {{faction}}</template>
  <template v-else>Police inspection: {{$caps(body)}}</template>
</h5>

<template v-if="choice=='ready'">
  <p v-if="isBlockade">
    You are hailed by a {{faction}} military patrol ship enforcing a blockade
    against {{target}}. You are ordered to heave to and prepare to be boarded.
    If there are any trade goods on board, they will be seized and result in
    a large fine and loss of standing with {{faction}}.
  </p>
  <p v-else>
    You are being hailed by a {{faction}} patrol ship operating {{distance}} AU
    out of {{$caps(body)}}. The captain orders you to cease acceleration and
    peacefully submit to an inspection. Any contraband on board will be seized
    and result in a fine and loss of standing with {{faction}}.
  </p>

  <div>
    <btn block=1 @click="submit">Submit</btn>
    <btn block=1 @click="setChoice('bribe')">Bribe</btn>
    <btn block=1 @click="setChoice('flee-confirm')">Flee</btn>
    <btn block=1 @click="setChoice('attack-confirm')">Attack</btn>
  </div>
</template>

<ask v-if="choice=='flee-confirm'" @pick="setChoice" :choices="{'flee': 'Yes', 'ready': 'Nevermind'}">
  Are you sure you wish to flee from the police?
  <span v-if="!hasContraband">You are not carrying any contraband.</span>
</ask>

<div v-if="choice=='submit-fined'">
  <!--Your contraband cargo was found and confiscated.
  You have been fined {{$csn(fine)}} credits.
  Your reputation with {{faction}} has taken a serious hit.-->
  <btn block=1 @click="done">Ok</btn>
</div>

<div v-if="choice=='submit-done'">
  No contraband was found.
  <template v-if="isHostile">
    The police do not seem convinced and assure you that they <i>will</i> catch you the next time around.
  </template>
  <template v-else>
    The police apologize for the inconvenience and send you on your way.
  </template>
  <btn block=1 @click="done" class="my-2">Ok</btn>
</div>

<ask v-if="choice=='bribe'" @pick="setChoice" :choices="{'bribe-yes': 'Yes, it is my duty as a fellow captain', 'ready': 'No, that would be dishonest'}">
  After a bit of subtle back and forth, the patrol's captain intimates that they could use {{$csn(bribeAmount)}} for "repairs to their tracking systems".
  While making said repairs, they might miss a ship like yours passing by.
  Do you wish to contribute to the captain's maintenance efforts?
</ask>
<ok v-if="choice=='bribe-yes' && !canAffordBribe" @ok="setChoice(null)">
  You cannot do not have enough money to bribe this officer.
</ok>
<ok v-if="choice=='bribe-yes' && canAffordBribe" @ok="bribe">
  The, uh, "contribution" has been debited from your account. You are free to go.
</ok>

<ask v-if="choice=='attack-confirm'" @pick="setChoice" :choices="{'attack': 'Yes', 'ready': 'Nevermind'}">
  Are you sure you wish to attack the police?
  <span v-if="!hasContraband">You are not carrying any contraband.</span>
</ask>

<melee v-if="choice=='attack'" :opponent="npc" :init_flee="init_flee" @complete="done" />
</div>
</template>

<script>
import NPC from '../npc';
import * as Event from '../events';
import { factions } from '../faction';

export default {
  props: ['faction', 'body', 'distance', 'dest', 'target'],

  data() {
    return {
      choice: 'ready',
      init_flee: false,
      fine: 0,

      npc: new NPC({
        name:          'Police Patrol',
        faction:       this.faction,
        ship:          ['shuttle', 'schooner', 'cutter', 'corvette', 'guardian', 'cruiser', 'battleship'],
        addons:        ['armor', 'railgun_turret', 'light_torpedo', 'medium_torpedo', 'ecm'],
        always_addons: ['pds'],
        min_addons:    3,
      }),
    };
  },

  computed: {
    planet() { return this.game.planets[this.body] },
    canAffordBribe() { return this.bribeAmount <= this.game.player.money },

    bribeAmount() {
      const base = Math.ceil(this.game.player.ship.price(false, this.planet.pricing) * 0.03);
      return this.isBlockade ? base * 2 : base;
    },

    // true if the inspection's faction holds a trade ban against the
    // destination's faction
    isBlockade() {
      return this.target != undefined;
    },

    hasContraband() {
      if (this.isBlockade && !this.game.player.ship.holdIsEmpty)
        return true;

      const faction = factions[this.faction];
      for (const item of Object.keys(this.data.resources))
        if (faction.isContraband(item, this.game.player))
          return true;

      return false;
    },

    isHostile() {
      return this.game.player.hasStandingOrLower(this.faction, 'Untrusted');
    },
  },

  methods: {
    setChoice(choice) {
      if (choice == 'flee') {
        this.init_flee = true;
        choice = 'attack';
      }

      if (choice == 'attack') {
        this.game.player.setStanding(this.standing, -50);
      }

      this.choice = choice || 'ready';
    },

    submit() {
      const isBlockade = this.isBlockade;
      const faction = factions[this.faction];
      const isContraband = (item) => isBlockade || faction.isContraband(item, this.game.player);

      const found = {};
      let busted = false;

      for (const item of this.game.player.ship.cargo.keys()) {
        if (this.game.player.ship.cargo.get(item) > 0 && isContraband(item)) {
          const amt = this.game.player.ship.cargo.count(item);
          found[item] = found[item] || 0;
          found[item] += amt;
          busted = true;
        }
      }

      if (busted) {
        const dest_faction = this.data.bodies[this.dest].faction;
        Event.trigger(new Event.CaughtSmuggling({faction: dest_faction, found: found}));
        this.setChoice('submit-fined');
      } else {
        this.setChoice('submit-done');
      }
    },

    bribe() {
      this.game.player.debit(this.bribeAmount);
      this.game.player.decStanding(this.faction, 3);
      this.done(1);
    },

    done(result, rounds) {
      if (result == 'destroyed') {
        this.$emit('dead');
      }
      else if (result == 'player-surrendered') {
        this.submit();
      }
      else {
        this.choice = 'ready';
        this.$emit('done', Math.max(rounds || 0, 0));
      }
    },
  },
};
</script>
