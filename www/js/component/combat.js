define(function(require, exports, module) {
  const Vue    = require('vendor/vue');
  const data   = require('data');
  const util   = require('util');
  const model  = require('model');
  const Npc    = require('npc');
  const Combat = require('combat');

  require('component/card');
  require('component/common');
  require('component/exchange');
  require('component/modal');
  require('component/row');

  Vue.component('melee', {
    props: ['opponent'],

    data: function() {
      const combat = new Combat.Combat({opponent: this.opponent});
      combat.start();

      return {
        combat:   combat,
        logSize:  4,
        longLogs: false,
        loot:     undefined,
      };
    },

    computed: {
      logs: function() {
        if (this.longLogs) {
          return this.combat.log;
        } else {
          return this.combat.log.slice(0, this.logSize);
        }
      },

      hasHiddenLogs: function() {
        return this.combat.log.length > this.logSize;
      },

      isPlayerTurn: function() {
        return this.combat.isPlayerTurn;
      },

      isOver: function() {
        return this.combat.isOver;
      },
    },

    methods: {
      useAction(action) {
        this.combat.playerAction(action);

        if (this.combat.isOver) {
          if (this.combat.player.isDestroyed) {
            window.localStorage.removeItem('game');
          }
          else {
            this.loot = this.combat.opponent.ship.cargo;
            game.save_game();
          }
        }
      },

      complete() {
        if (this.combat.player.isDestroyed) {
          game.open('newgame');
        }
        else {
          game.save_game();
          this.$emit('complete');
        }
      },
    },

    template: `
<card>
  <row>
    <div class="col-4 text-left font-weight-bold">You</div>
    <small class="col-4 text-center text-weight-light font-italic">{{combat.player.faction.abbrev}} vs. {{combat.opponent.faction.abbrev}}</small>
    <div class="col-4 text-right font-weight-bold">{{combat.opponent.name}}</div>
  </row>

  <row>
    <div class="col-4 text-left font-weight-light font-italic">{{combat.player.ship.type|caps}}</div>
    <small class="col-4 text-center text-weight-light font-italic">Round {{combat.currentRound}}</small>
    <div class="col-4 text-right font-weight-light font-italic">{{combat.opponent.ship.type|caps}}</div>
  </row>

  <row>
    <combatant :combatant="combat.player" />
    <div class="col-2"></div>
    <combatant :combatant="combat.opponent" />
  </row>

  <div v-if="!combat.isOver" class="my-3">
    <combat-action v-for="a of combat.player.actions" :key="a.name" :action="a" :disabled="!isPlayerTurn" @click="useAction(a)" />
  </div>

  <div v-else>
    <modal v-if="combat.player.isDestroyed" @close="complete" title="You lost" close="New game" static=1>
      {{combat.player.name}} has died of dysentery.
    </modal>

    <modal v-else @close="complete" xclose=1 title="You won" footer=1 close="Leave">
      <exchange :store="loot" style="font-size: 0.9em" />
      <btn slot="footer" close=1>Complete transfer</btn>
    </modal>
  </div>

  <card-text v-for="entry in logs" :key="entry" class="mt-2 font-italic small">
    {{entry}}
  </card-text>

  <card-btn v-if="hasHiddenLogs" @click="longLogs=!longLogs" muted=1 class="btn-sm mt-2">
    ...
  </card-btn>
</card>
    `,
  });


  Vue.component('combat-action', {
    props: ['action', 'disabled'],
    template: `
<card-btn @click="$emit('click')" :disabled="disabled || !action.isReady" class="btn-sm" block=1>
  {{action.name|caps}}

  <badge right=1 v-if="action.isReloadable" class="mx-2">
    {{action.magazineRemaining}}/{{action.magazine}}
  </badge>

  <badge right=1 v-if="action.isReloadable && action.isReloading">
    Reloading: {{action.roundsUntilReload}}
  </badge>
</card-btn>
    `
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
