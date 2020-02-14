define(function(require, exports, module) {
  "use strict"

  const Vue  = require('vendor/vue');
  const data = require('data');
  const game = require('game');
  const util = require('util');
  const fabs = require('fabricators');

  require('component/global');
  require('component/common');
  require('component/exchange');
  require('component/modal');
  require('component/row');

  Vue.component('fabrication', {
    props: ['item'],

    data() {
      return {
        show_confirm: false,
        running: false,
        queue:   new fabs.FabricationQueue({item: this.item}),
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
      confirm() {
        if (this.queue.has_fab_resources) {
          this.start();
        }
        else {
          this.show_confirm = true;
        }
      },

      confirm_start(confirmed) {
        this.show_confirm = false;

        if (confirmed) {
          this.queue.ignore_fab_health = true;
          this.start();
        }
      },

      start() {
        this.game.freeze();
        this.running = true;
        this.$nextTick(() => this.turn());
      },

      finish() {
        this.game.save_game();
        this.running = false;
        this.game.unfreeze();
      },

      turn() {
        setTimeout(() => {
          this.running = this.queue.fabricate();
          if (!this.running) {
            this.finish();
          }
        }, 400);
      },

      reset() {
        this.queue.set_goal(1);
      },
    },

    template: `
      <modal :title="item|caps" close="Close" xclose=1 size="lg" @close="$emit('close')">
        <p v-if="queue.result">
          {{queue.result}}
        </p>

        <p v-else-if="amount == 0" class="font-italic text-warning">
          You do not have the resources necessary to fabricate this item.
        </p>

        <template v-else>
          <p class="font-italic text-success">
            You have the resources and cargo space to fabricate {{amount|csn}} of this item.
          </p>

          <p>
            The fabricators may be scheduled to continuously create as many items as you have the resources for.
            Each use of the fabricators reduces their available capacity, resulting in higher fees and fabrication times.
            As cybernetics become available in the market, they may be used to replenish the fabricators.
          </p>

          <template v-if="show_confirm">
            <confirm yes="Confirm" no="Cancel" @confirm="confirm_start">
              The fabricators are too low on resources to complete the full batch. Unless replenished,
              they will need to be supplemented with more traditional, less efficient techniques, resulting
              in higher fees and a longer fabrication time.
            </confirm>
          </template>

          <template v-if="!running">
            <slider class="my-3" :value.sync="queue.goal" min=1 :max="amount" minmax=1 step=1 />
            <btn block=1 @click="confirm" class="my-3">Push the big red button</btn>
          </template>

          <template v-else>
            <progress-bar :percent="percent" @ready="turn" />
            <btn block=1 @click="finish" class="my-3">Stop</btn>
          </template>
        </template>

        <table v-if="!queue.result" class="table my-2">
          <tr v-if="amount">
            <th>&nbsp;</th>
            <th>Each</th>
            <th>Total (est)</th>
          </tr>
          <tr v-if="amount">
            <th>Count</th>
            <td>1</td>
            <td>{{left|csn}} / {{queue.goal|csn}}</td>
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
      </modal>
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
      <Section title="Fabricators">
        <template v-if="!selected">
          <p>
            A triumph of cybernetics, the von Neumann fabricators are able to
            manufacture nearly anything, given the necessary materials and plans...
            and a small fee, of course.
          </p>

          <p>
            Use of the fabricators is based on the value of the resource being
            manufactured and increases based on the availability of fabricator
            resources themselves, faction tax rate, a small usage fee, and
            faction standing.
          </p>

          <p>
            {{availability}}% of fabricator capacity is available at this time.
          </p>

          <template v-for="item of resources">
            <btn block=1 @click="select(item)" class="my-2 py-2" :muted="!can_craft(item)">
              {{item|caps}}
            </btn>
          </template>
        </template>

        <template v-else>
          <p>
            {{availability}}% of fabricator capacity is available at this time.
          </p>

          <fabrication :item="selected" @close="clear" />
        </template>
      </Section>
    `,
  });
});
