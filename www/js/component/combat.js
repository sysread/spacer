"use strict"

define(function(require, exports, module) {
  const Vue    = require('vendor/vue');
  const data   = require('data');
  const util   = require('util');
  const Npc    = require('npc');
  const Combat = require('combat');

  require('component/card');
  require('component/common');
  require('component/exchange');
  require('component/modal');
  require('component/row');

  Vue.component('melee', {
    props: ['opponent', 'init_flee'],

    data() {
      const combat = new Combat.Combat({opponent: this.opponent});
      combat.start();

      return {
        combat:       combat,
        tick:         combat.currentRound,
        isPlayerTurn: combat.isPlayerTurn,
        salvage:      false,
        queue:        [],
      };
    },

    mounted() {
      if (this.init_flee) {
        const flee = this.combat.player.actions.filter(a => a.name == 'Flee');
        this.useAction(flee[0]);
      }

      this.process_queue();
    },

    computed: {
      isOver()      { return this.combat.isOver               },
      escaped()     { return this.combat.escaped              },
      surrendered() { return this.combat.surrendered          },
      loot()        { return this.combat.salvage              },
      hasLoot()     { return this.loot && this.loot.sum() > 0 },
    },

    watch: {
      isOver() {
        if (this.isOver) {
          if (this.combat.player.isDestroyed) {
            window.localStorage.removeItem('game');
          } else {
            game.save_game();
          }
        }
      },
    },

    methods: {
      async process_queue() {
        const promise = new Promise((resolve, reject) => {
          setTimeout(() => {
            if (this.queue.length > 0) {
              const fn = this.queue.shift();
              fn();
            }

            resolve();
          }, 500);
        });

        await promise;
        this.process_queue();
      },

      incTick() { ++this.tick },

      useAction(action) {
        this.isPlayerTurn = false;
        this.combat.playerAction(action);
        this.incTick();

        if (!this.combat.isOver) {
          this.queue.push(() => {
            this.combat.opponentAction();
            this.incTick();
            this.isPlayerTurn = true;
          });
        }
      },

      complete() {
        this.salvage = false;

        if (this.combat.player.isDestroyed) {
          this.game.delete_game();
          this.$emit('complete', 'destroyed');
        }
        else {
          this.game.save_game();

          if (this.combat.playerSurrendered) {
            this.$emit('complete', 'player-surrendered');
          } else if (this.combat.opponentSurrendered) {
            this.$emit('complete', 'opponent-surrendered');
          } else if (this.combat.opponentIsDestroyed) {
            this.$emit('complete', 'won');
          } else {
            this.$emit('complete', 'fled'); // TODO this is brittle as hell
          }
        }
      },
    },

    template: `
<div>
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
      <btn @click="complete" block=1>New game</btn>
    </div>

    <div v-else>
      <div v-if="combat.opponent.isDestroyed" class="my-3">
        <span class="text-success">You destroyed your opponent's ship.</span>

        <span v-if="hasLoot">
          Amid the wreckage of the drifting hulk, some cargo containers appear to remain intact.

          <btn @click="salvage=true" block=1 class="mt-3">Salvage</btn>
        </span>

        <modal v-if="hasLoot && salvage" @close="complete" title="Salvage" close="Leave the hulk" xclose=1>
          <exchange :store="loot" class="small" />
        </modal>
      </div>

      <div v-else-if="combat.opponentSurrendered" class="my-3">
        Your opponent surrendered.

        <span v-if="hasLoot" class="text-success">
          Your boarding party notes that there is intact cargo in the hold.
          <btn @click="salvage=true" block=1 class="mt-3">Salvage</btn>
        </span>

        <modal v-if="hasLoot && salvage" @close="complete" title="Salvage" close="Leave" xclose=1>
          <exchange :store="loot" class="small" />
        </modal>
      </div>

      <div v-else-if="escaped === combat.player.name" class="my-3 large font-italic text-center">
        You have escaped your opponent.
      </div>

      <div v-else-if="escaped === combat.opponent.name" class="my-3 large font-italic text-center">
        Your opponent has escaped.
      </div>

      <div v-else-if="surrendered == combat.player.name" class="my-3 large font-italic text-center">
        You surrendered to your opponent.
      </div>

      <div v-else-if="surrendered == combat.opponent.name" class="my-3 large font-italic text-center">
        Your opponent has surrendered.
      </div>

      <btn @click="complete" block=1>Acknowledge</btn>
    </div>
  </div>

  <combat-log :log="combat.log" :tick="tick" />
</div>
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
      isHit()          { return this.entry.effect === 'hit'        },
      isDestroyed()    { return this.entry.effect === 'destroyed'  },
      isGlancingBlow() { return this.isHit && this.entry.pct < 1   },
      isStrongHit()    { return this.isHit && this.entry.pct >= 10 },
      isHaymaker()     { return this.isHit && this.entry.pct >= 20 },
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
    <div v-else-if="entry.effect === 'surrender'">
      {{who}} surrendered.
    </div>
    <div v-else>
      {{who}} attacked with <b>{{entry.type}}</b>
      <span      v-if="entry.effect === 'miss'">but <b>missed</b>.</span>
      <span v-else-if="entry.effect === 'intercepted'">but point defenses <b>intercepted</b> the attack.</span>
      <span v-else-if="entry.effect === 'dodged'">but the target <b>manuevered</b> to avoid the attack.</span>
      <span v-else-if="entry.effect === 'destroyed'">and <b>destroyed</b> the target!</span>
      <span v-else-if="entry.effect === 'hit'">
        <span v-if="isHaymaker">and <b>struck directly amidships</b>, visibly staggering the vessel.</span>
        <span v-else-if="isStrongHit">and scored a <b>direct hit</b>, causing significant damage.</span>
        <span v-else-if="isGlancingBlow">and struck a <b>glancing blow</b>; damage was negligible.</span>
        <span v-else>and <b>hit</b> the target.</span>
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
  {{action.name|caps}}

  <template v-if="action.count">
    [{{action.count}}]
  </template>

  <badge right=1 class="mx-2">
    {{action.magazineRemaining}}/{{action.magazine}}
  </badge>

  <badge right=1 v-if="action.isReloading">
    Reloading: {{action.roundsUntilReload}}
  </badge>
</card-btn>
    `
  });


  Vue.component('combatant', {
    props: ['combatant'],

    computed: {
      hull()  {return util.R(this.combatant.pctHull  * 100, 1)},
      armor() {return util.R(this.combatant.pctArmor * 100, 1)},
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
