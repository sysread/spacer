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
        combat:       combat,
        tick:         combat.currentRound,
        isPlayerTurn: combat.isPlayerTurn,
        salvage:      false,
      };
    },

    computed: {
      logEntries: function() { return this.combat.log },
      isOver:     function() { return this.combat.isOver },
      escaped:    function() { return this.combat.escaped },
      loot:       function() { return this.combat.salvage },
      hasLoot:    function() { return this.loot && this.loot.sum() > 0 },
    },

    methods: {
      incTick() { ++this.tick },

      useAction(action) {
        this.isPlayerTurn = false;
        this.combat.playerAction(action);
        this.incTick();

        window.setTimeout(() => {
          if (this.combat.isOver) {
            if (this.combat.player.isDestroyed) {
              window.localStorage.removeItem('game');
            }
            else {
              game.save_game();
            }
          }
          else {
            this.combat.opponentAction();
            window.setTimeout(() => {
              this.incTick();
              this.isPlayerTurn = true;
            }, 250);
          }
        }, 250);
      },

      complete() {
        this.salvage = false;

        if (this.combat.player.isDestroyed) {
          this.game.delete_game();
          this.game.open('newgame');
        }
        else {
          this.game.save_game();
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

  <div v-if="!isOver" class="my-3">
    <combat-action v-for="a of combat.player.actions" :key="a.name" :action="a" :disabled="!isPlayerTurn" @click="useAction(a)" />
  </div>

  <div v-else class="p-3 m-3 border border-danger">
    <div v-if="combat.player.isDestroyed" class="my-3 text-warning">
      {{combat.player.name}} has died of dysentery.
      <btn @click="complete">New game</btn>
    </div>

    <div v-else>
      <div v-if="combat.opponent.isDestroyed" class="my-3 text-success">
        You destroyed your opponent's ship.

        <span v-if="hasLoot">
          Amid the wreckage of the drifting hulk, some cargo containers appear to remain intact.

          <btn @click="salvage=true" block=1 class="mt-3">Salvage</btn>
        </span>

        <modal v-if="hasLoot && salvage" @close="complete" title="Salvage" close="Leave the hulk" xclose=1>
          <exchange :store="loot" class="small" />
        </modal>
      </div>

      <div v-else-if="escaped === combat.player.name" class="my-3 large font-italic text-center">
        You have escaped your opponent.
      </div>

      <div v-else-if="escaped === combat.opponent.name" class="my-3 large font-italic text-center">
        Your opponent has escaped.
      </div>

      <btn @click="complete" block=1>Leave</btn>
    </div>
  </div>

  <combat-log :log="combat.log" :tick="tick" />
</card>
    `,
  });


  Vue.component('combat-log', {
    props: ['log', 'tick'],
    template: `
<div class="m-0 p-3" style="overflow-y: scroll; overflow-x: hidden; height: 250px;">
  <div v-for="actions in log" :key="actions.round" class="row">
    <div class="col-5">
      <transition name="fade">
        <combat-log-entry v-show="actions.player" who="You" :entry="actions.player" />
      </transition>
    </div>

    <div class="col-2 text-center p-0">{{actions.round}}</div>

    <div class="col-5">
      <transition name="fade">
        <combat-log-entry v-show="actions.opponent" who="The enemy" :entry="actions.opponent" class="text-right" />
      </transition>
    </div>
  </div>
</div>
    `,
  });


  Vue.component('combat-log-entry', {
    props: ['who', 'entry'],
    computed: {
      isHit:          function() { return this.entry.effect === 'hit' },
      isDestroyed:    function() { return this.entry.effect === 'destroyed' },
      isGlancingBlow: function() { return this.isHit && this.entry.pct < 1 },
      isStrongHit:    function() { return this.isHit && this.entry.pct >= 10 },
      isHaymaker:     function() { return this.isHit && this.entry.pct >= 20 },
    },
    template: `
<div class="font-italic small py-2 px-1 border-danger" style="border-top: 1px solid">
  <div v-if="entry" :class="{'text-warning': isHit && !isHaymaker, 'text-danger': isHaymaker || isDestroyed}">
    <div v-if="entry.effect === 'flee'" class="text-success">
      {{who}} fled the battle!
    </div>
    <div v-else-if="entry.effect === 'chase'">
      {{who}} attempted to flee battle unsuccesfully.
    </div>
    <div v-else>
      {{who}} attacked with {{entry.type}}
      <span      v-if="entry.effect === 'miss'">but missed.</span>
      <span v-else-if="entry.effect === 'intercepted'">but point defenses intercepted the attack.</span>
      <span v-else-if="entry.effect === 'dodged'">but the target manuevered to avoid the attack.</span>
      <span v-else-if="entry.effect === 'destroyed'">and destroyed the target!</span>
      <span v-else-if="entry.effect === 'hit'">
        <span v-if="isHaymaker">and struck directly amidships, visibly staggering the vessel.</span>
        <span v-else-if="isStrongHit">and scored a direct hit, causing significant damage.</span>
        <span v-else-if="isGlancingBlow">and struck a glancing blow; damage was negligible.</span>
        <span v-else>and hit the target.</span>
      </span>
    </div>
  </div>
</div>
    `,
  });


  Vue.component('combat-action', {
    props: ['action', 'disabled'],
    template: `
<card-btn @click="$emit('click')" :disabled="disabled || !action.isReady" class="btn-sm text-left" block=1>
  {{action.name|caps}} [{{action.count}}]

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
    computed: {
      hull:  function() {return util.R(this.combatant.pctHull  * 100, 1)},
      armor: function() {return util.R(this.combatant.pctArmor * 100, 1)},
    },
    template: `
<div class="col-5">
  <combat-stat k="Armor" :class="{'text-success': armor > 75, 'text-warning': armor <= 50 && armor > 35, 'text-danger': armor <= 35}">{{armor}}%</combat-stat>
  <combat-stat k="Hull" :class="{'text-success': hull > 75, 'text-warning': hull <= 50 && hull > 35, 'text-danger': hull <= 35}">{{hull}}%</combat-stat>
</div>
    `,
  });


  Vue.component('combat-stat', {
    props: ['k', 'v'],
    template: `
<row class="p-0 m-0">
  <div class="col-6 p-0 m-0 font-weight-bold text-right">{{k}}</div>
  <div class="col-6 p-0 m-0 text-right"><slot /></div>
</row>
    `,
  });
});
