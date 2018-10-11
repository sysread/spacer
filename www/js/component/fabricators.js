define(function(require, exports, module) {
  const Vue  = require('vendor/vue');
  const util = require('util');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/exchange');
  require('component/modal');
  require('component/row');

  Vue.component('craft', {
    props: ['item'],

    data() {
      return {
        open:  false,
        run:   false,
        done:  false,
        count: 1, // # items to craft
        left:  0, // # turns remaining while running
      };
    },

    computed: {
      planet()    { return this.game.here },
      player()    { return this.game.player },
      base_fee()  { return this.data.craft_fee },
      price()     { return this.planet.sellPrice(this.item) },
      fee()       { return this.planet.fabricationFee(this.item, this.count, this.player) },
      turns()     { return this.planet.fabricationTime(this.item, this.count) },
      hours()     { return this.data.hours_per_turn * this.turns },
      materials() { return this.data.resources[this.item].recipe.materials },
      percent()   { return 100 * (this.turns - this.left) / this.turns },

      amount() {
        return Math.min(
          Math.floor(this.player.money / this.fee),
          this.player.canCraft(this.item),
        );
      },
    },

    methods: {
      turn() {
        this.$nextTick(() => {
          if (this.left > 0) {
            for (const mat of Object.keys(this.materials)) {
              this.player.ship.unloadCargo(mat, this.materials[mat]);
            }

            this.game.turn(this.turns);
            this.player.ship.loadCargo(this.item, 1);
            this.game.refresh();
            this.game.save_game();

            this.left -= 1;
          }
          else {
            this.run  = false;
            this.done = true;
          }
        });
      },

      fabricate() {
        this.left = this.turns;
        this.player.debit(this.fee);
        this.planet.fabricate(this.item);
        this.run = true;
        this.$nextTick(this.turn);
      },

      reset() {
        this.open  = false;
        this.done  = false;
        this.run   = false;
        this.count = 1;
        this.pct   = 0;
        this.$emit('done');
      },

      priceOf: function(item) {
        return this.planet.sellPrice(item);
      },
    },

    template: `
      <div class="my-2">
        <btn v-if="open" block=1 @click="open=false; $emit('click', item)" :disabled="run">
          Back to fabricators
        </btn>

        <btn v-else block=1 @click="open=true; $emit('click', item)" :class="{'btn-secondary': !amount}">
          {{item|caps}}
        </btn>

        <card v-if="open" class="my-3">
          <progress-bar v-if="run" :percent="percent" @ready="turn" />

          <template v-else-if="open && !done">
            <h3>{{item|caps}}</h3>

            <card-text>The current market value of {{item}} is {{price|csn}} credits.</card-text>
            <card-text v-if="amount" class="font-italic text-success">You have the resources and cargo space to fabricate {{amount}} of this item.</card-text>
            <card-text v-else class="font-italic text-warning">You do not have the required resources and cargo space to fabricate this item.</card-text>

            <def y=0 split=4 brkpt="sm" term="Count" :def="count" />

            <def y=0 split=4 brkpt="sm" term="Cost">
              <span slot="def" :class="{'text-danger': planet.fab_health < turns}">
                {{fee|R(0)|csn|unit('credits')}}
              </span>
            </def>

            <def y=0 split=4 brkpt="sm" term="Time">
              <span slot="def" :class="{'text-danger': planet.fab_health < turns}">
                {{hours|csn|unit('hours')}}
              </span>
            </def>

            <def y=0 split=4 brkpt="sm" term="Materials">
              <div slot="def" v-for="(amt, item) of materials">
                {{(amt * count)|csn|unit(item)}} ({{priceOf(item)|csn}} credits)
              </div>
            </def>

            <slider v-if="amount > 1" class="my-3" :value.sync="count" min="1" :max="amount" minmax=1 step=1 />
            <btn v-if="amount" block=1 @click="fabricate" class="my-3">Push the big red button</btn>
          </template>

          <ok v-else @ok="reset">
            {{count}} unit(s) of {{item}} have been placed in your ship's hold.
          </ok>
        </card>
      </div>
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
      select(item) {
        if (item === this.selected) {
          this.clear();
        } else {
          this.selected = item;
        }
      },

      clear() {
        this.selected = null;
      },

      is_shown(item) {
        return !this.selected || this.selected == item;
      },
    },

    template: `
      <card title="Fabricators" class="my-3">
        <card-text>
          A triumph of cybernetics, the fabricators are able to manufacture nearly
          anything, given the necessary materials and plans... and a small fee, of
          course.
        </card-text>

        <card-text>
          Use of the fabricators is based on the value of the resource being
          manufactured and increases based on the availability of fabricator
          resources themselves, faction tax rate, a small builder's fee, and
          faction standing.
        </card-text>

        <card-text>
          {{availability}}% of fabricator capacity is available at this time.
        </card-text>

        <craft v-for="item of resources"
               v-if="is_shown(item)"
               :key="item"
               :item="item"
               @click="select"
               @done="clear" />
      </card>
    `,
  });
});
