define(function(require, exports, module) {
  const Vue    = require('vendor/vue');
  const data   = require('data');
  const util   = require('util');
  const model  = require('model');
  const Npc    = require('npc');
  const Combat = require('combat');

  require('component/common');
  require('component/modal');
  require('component/card');
  require('component/row');

  Vue.component('melee', {
    props: ['opponent'],

    data: function() {
      return {
        combat: new Combat.Combat({opponent: this.opponent}),
      };
    },

    computed: {
    },

    methods: {
      useAction(action) {
        this.combat.playerAction(action);
      }
    },

    template: `
<card>
  <row>
    <div class="col-4 text-left font-weight-bold">You</div>
    <div class="col-4 text-center">Round {{combat.currentRound}}</div>
    <div class="col-4 text-right font-weight-bold">{{combat.opponent.name}}</div>
  </row>

  <row>
    <small class="col-12 text-center text-weight-light font-italic">
      {{combat.player.faction}} vs. {{combat.opponent.faction}}
    </small>
  </row>

  <row>
    <combatant :combatant="combat.player" />
    <div class="col-2"></div>
    <combatant :combatant="combat.opponent" />
  </row>

  <card-btn
      v-for="action of combat.player.actions"
      :key="action.name"
      :disabled="!combat.isPlayerTurn || !action.isReady"
      @click="useAction(action)"
      block=1>
    {{action.name|caps}}
    <badge right=1 v-if="action.isReloadable" class="mx-2">
      {{action.magazineRemaining}}/{{action.magazine}}
    </badge>
    <badge right=1 v-if="action.isReloadable && action.isReloading">
      Reloading: {{action.roundsUntilReload}}
    </badge>
  </card-btn>

  <ul class="my-3">
    <li v-for="entry in combat.log" class="font-italic small">{{entry}}</li>
  </ul>
</card>
    `,
  });


  Vue.component('combatant', {
    props: ['combatant'],
    template: `
<div class="col-5">
  <combat-stat k="Armor" :v="combatant.armor|R(2)" />
  <combat-stat k="Hull" :v="combatant.hull|R(2)" />
</div>
    `,
  });


  Vue.component('combat-stat', {
    props: ['k', 'v'],
    template: `
<row class="p-0 m-0">
  <div class="col-5 p-0 m-0 font-weight-bold text-right">{{k}}</div>
  <div class="col-4 p-0 m-0 text-right">{{v}}</div>
</row>
    `,
  });
});
