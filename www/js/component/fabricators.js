define(function(require, exports, module) {
  const Vue  = require('vendor/vue');
  const data = require('data');
  const game = require('game');
  const util = require('util');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/exchange');
  require('component/modal');
  require('component/row');

  class FabricationQueue {
    constructor(opt) {
      this.item      = opt.item;
      this.goal      = opt.goal || 1;
      this.player    = game.player;
      this.planet    = game.here;
      this.recipe    = data.resources[this.item].recipe.materials;
      this.completed = 0;
      this.result    = null;
      this.success   = null;
    }

    /*
     * Updates the goal and resets the queue state.
     */
    set_goal(new_goal) {
      this.goal      = new_goal;
      this.completed = 0;
      this.result    = null;
    }

    /*
     * Returns the number of items remaining to craft to meet the goal.
     */
    get remaining() {
      return this.goal - this.completed;
    }

    /*
     * Returns the number of turns required to fabricate the next item in the
     * queue based on the availability of fabrication resources in the market.
     */
    get next_turns() {
      return this.planet.fabricationTime(this.item, 1);
    }

    /*
     * Returns the fee for fabricating the next item in the queue based on the
     * player's standing, faction tax, and the availability of fabrication
     * resources in the market.
     */
    get next_fee() {
      return this.planet.fabricationFee(this.item, 1, this.player);
    }

    /*
     * Returns true if the player has the materials required for the crafting
     * recipe.
     */
    get has_materials() {
      return this.player.canCraft(this.item) > 0;
    }

    /*
     * Returns true if the player has the money necessary to pay the fee for
     * crafting the next time in the queue.
     */
    get has_money() {
      return this.next_fee <= this.player.money;
    }

    /*
     * Returns true if the goal number of items to fabricate has been reached.
     */
    get goal_reached() {
      return this.completed == this.goal;
    }

    /*
     * Fabricates the next item in the queue. Removes the items required for
     * crafting the item from the player's ship, debits the fee from the
     * player's wallet, places the crafted item in the player's cargo hold,
     * runs the number of turns required. Does NOT save the game or refresh the
     * status bar.
     */
    fabricate() {
      if (!this.has_materials) {
        this.result  = 'Materials required for fabrication have been exhausted.';
        this.success = false;
        return false;
      }

      if (!this.has_money) {
        this.result  = 'You do not have enough money to pay for the fabrication fee.';
        this.success = false;
        return false;
      }

      const turns = this.next_turns;
      const fee   = this.next_fee;

      // Pay for use of the fabricator
      this.player.debit(fee);

      // Remove required materials from the player's cargo
      for (const mat of Object.keys(this.recipe)) {
        this.player.ship.unloadCargo(mat, this.recipe[mat]);
      }

      // Use fabricators
      this.planet.fabricate(this.item);

      // Load crafted item onto player's ship
      this.player.ship.loadCargo(this.item, 1);

      // Run the game the specified number of turns
      game.turn(turns);

      // Increment the completed count
      ++this.completed;

      if (this.goal_reached) {
        this.result  = `Successfully fabricated ${this.completed} units of ${this.item}. They have been placed in your ship's cargo hold.`;
        this.success = true;
        return false;
      }
      else {
        return true;
      }
    }
  };

  Vue.component('fabrication', {
    props: ['item'],

    data() {
      return {
        running: false,
        queue:   new FabricationQueue({item: this.item}),
      };
    },

    computed: {
      left()    { return this.queue.remaining },
      fee()     { return this.queue.next_fee },
      turns()   { return this.queue.next_turns },
      hours()   { return this.data.hours_per_turn * this.turns },
      percent() { return 100 * this.queue.completed / this.queue.goal },
      price()   { return this.game.here.sellPrice(this.item) },

      amount() {
        return Math.min(
          Math.floor(this.game.player.money / this.fee),
          this.game.player.canCraft(this.item),
        );
      },
    },

    methods: {
      start() {
        this.game.freeze = true;
        this.running = true;
        this.$nextTick(() => this.turn());
      },

      finish() {
        this.game.refresh();
        this.game.save_game();
        this.running = false;
        this.game.freeze = false;
      },

      turn() {
        this.running = this.queue.fabricate();
        if (!this.running) {
          this.finish();
        } else {
          this.game.refresh();
        }
      },

      reset() {
        this.queue.set_goal(1);
      },

      complete() {
        this.reset();
        this.$emit('done');
      },
    },

    template: `
      <card>
        <card-title>
          <btn block=1 @click="complete" :disabled="running">
            Return to fabricators
          </btn>
        </card-title>

        <ok v-if="queue.result" @ok="complete">
          <span :class="{'text-warning': !queue.success}">
            {{ queue.result }}
          </span>
        </ok>

        <template v-else>
          <card-text v-if="amount == 0" class="font-italic text-warning">
            You do not have the resources necessary to fabricate this item.
          </card-text>

          <template v-else>
            <card-text class="font-italic text-success">
              You have the resources and cargo space to fabricate {{amount|csn}} of this item.
            </card-text>

            <card-text>
              The fabricators may be scheduled to continuously create as many items as you have the resources for.
              Each use of the fabricators reduces their available capacity, resulting in higher fees and fabrication times.
              As cybernetics become available in the market, they may be used to replenish the fabricators.
            </card-text>

            <template v-if="!running">
              <slider class="my-3" :value.sync="queue.goal" min=1 :max="amount" minmax=1 step=1 />
              <btn block=1 @click="start" class="my-3">Push the big red button</btn>
            </template>

            <template v-else>
              <progress-bar :percent="percent" @ready="turn" />
              <btn block=1 @click="finish" class="my-3">Stop</btn>
            </template>
          </template>

          <table class="table my-2">
            <tr v-if="amount">
              <th>&nbsp;</th>
              <th>Each</th>
              <th>Total (est)</th>
            </tr>
            <tr v-if="amount">
              <th>Count</th>
              <td>{{queue.goal|csn}}</td>
              <td>{{left|csn}}</td>
            </tr>
            <tr>
              <th>Market value</th>
              <td>{{price|csn|unit('credits')}}</td>
              <td v-if="amount" class="text-success">{{price*queue.goal|csn|unit('credits')}}</td>
            </tr>
            <tr>
              <th>Fee</th>
              <td>{{fee|csn|unit('credits')}}</td>
              <td v-if="amount" class="text-success">{{fee*queue.goal|csn|unit('credits')}}</td>
            </tr>
            <tr>
              <th>Time</th>
              <td>{{hours|csn|unit('hours')}}</td>
              <td v-if="amount" class="text-success">{{hours*queue.goal|csn|unit('hours')}}</td>
            </tr>
            <tr v-for="(amt, item) of queue.recipe">
              <th>{{item|caps}}</th>
              <td>{{amt|csn}}</td>
              <td v-if="amount" class="text-success">{{amt*queue.goal|csn}}</td>
            </tr>
          </table>
        </template>
      </card>
    `,
  });

  Vue.component('fabricators', {
    data() {
      return {
        selected: null,
      };
    },

    computed: {
      planet() { return this.game.here },
      player() { return this.game.player },
      availability() { return this.planet.fabricationAvailability() },

      resources() {
        return Object.keys(this.data.resources)
          .filter( (k) => this.data.resources[k].hasOwnProperty('recipe') );
      },
    },

    methods: {
      clear()         { this.selected = null },
      is_shown(item)  { return item === this.selected },
      can_craft(item) { return this.player.canCraft(item) > 0 },

      select(item) {
        if (this.is_shown(item)) {
          this.clear();
        } else {
          this.selected = item;
        }
      },
    },

    template: `
      <card title="Fabricators" class="my-3">
        <template v-if="!selected">
          <card-text>
            A triumph of cybernetics, the von Neumann fabricators are able to
            manufacture nearly anything, given the necessary materials and plans...
            and a small fee, of course.
          </card-text>

          <card-text>
            Use of the fabricators is based on the value of the resource being
            manufactured and increases based on the availability of fabricator
            resources themselves, faction tax rate, a small usage fee, and
            faction standing.
          </card-text>

          <card-text>
            {{availability}}% of fabricator capacity is available at this time.
          </card-text>

          <template v-for="item of resources">
            <card-btn block=1 @click="select(item)" class="my-2 py-2" :muted="!can_craft(item)">
              {{item|caps}}
            </card-btn>
          </template>
        </template>

        <template v-else>
          <card-text>
            {{availability}}% of fabricator capacity is available at this time.
          </card-text>

          <fabrication :item="selected" @done="clear" />
        </template>
      </card>
    `,
  });
});
