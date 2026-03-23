<template>
<div>
<row>
  <div class="col-4 text-start fw-bold">You</div>
  <small class="col-4 text-center fw-light fst-italic">{{combat.player.faction.abbrev}} vs. {{combat.opponent.faction.abbrev}}</small>
  <div class="col-4 text-end fw-bold">{{combat.opponent.name}}</div>
</row>

<row>
  <div class="col-4 text-start fw-light fst-italic">{{$caps(combat.player.ship.type)}}</div>
  <small class="col-4 text-center fw-light fst-italic">Round {{combat.currentRound}}</small>
  <div class="col-4 text-end fw-light fst-italic">{{$caps(combat.opponent.ship.type)}}</div>
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

    <div v-else-if="escaped === combat.player.name" class="my-3 large fst-italic text-center">
      You have escaped your opponent.
    </div>

    <div v-else-if="escaped === combat.opponent.name" class="my-3 large fst-italic text-center">
      Your opponent has escaped.
    </div>

    <div v-else-if="surrendered == combat.player.name" class="my-3 large fst-italic text-center">
      You surrendered to your opponent.
    </div>

    <div v-else-if="surrendered == combat.opponent.name" class="my-3 large fst-italic text-center">
      Your opponent has surrendered.
    </div>

    <btn @click="complete" block=1>Acknowledge</btn>
  </div>
</div>

<combat-log :log="combat.log" :tick="tick" />
</div>
</template>

<script>
import { Combat } from '../combat';

export default {
  props: ['opponent', 'init_flee'],

  data() {
    const combat = new Combat({opponent: this.opponent});
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
          this.$emit('complete', 'player-surrendered', this.tick);
        } else if (this.combat.opponentSurrendered) {
          this.$emit('complete', 'opponent-surrendered', this.tick);
        } else if (this.combat.opponentIsDestroyed) {
          this.$emit('complete', 'won', this.tick);
        } else {
          this.$emit('complete', 'fled', this.tick); // TODO this is brittle as hell
        }
      }
    },
  },
};
</script>
