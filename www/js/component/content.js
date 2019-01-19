define(function(require, exports, module) {
  "use strict"

  const Vue       = require('vendor/vue');
  const util      = require('util');
  const t         = require('common');
  const resources = require('resource').resources;

  window.Physics = require('physics');

  require('component/global');
  require('component/common');
  require('component/card');

  require('component/newgame');
  require('component/summary');
  require('component/news');
  require('component/work');
  require('component/commerce');
  require('component/fabricators');
  require('component/shipyard');
  require('component/ships');
  require('component/addons');
  require('component/navcomp');
  require('component/transit');
  require('component/status');

  Vue.component('Content', {
    props: ['page'],

    methods: {
      open(page) {
        this.$emit('open', page);
      },
    },

    template: `
      <div id="spacer-content" class="container-fluid pt-3 pb-1 mt-5">
        <new-game           v-if="page == 'newgame'"     @open="open" />
        <SummaryPage        v-if="page == 'summary'"     @open="open" />
        <NewsFeeds     v-else-if="page == 'news'"        @open="open" />
        <work          v-else-if="page == 'work'"        @open="open" />
        <market        v-else-if="page == 'commerce'"    @open="open" />
        <fabricators   v-else-if="page == 'fabricators'" @open="open" />
        <shipyard      v-else-if="page == 'shipyard'"    @open="open" />
        <ships         v-else-if="page == 'ships'"       @open="open" />
        <addons        v-else-if="page == 'addons'"      @open="open" />
        <NavComp       v-else-if="page == 'navigation'"  @open="open" />
        <transit       v-else-if="page == 'transit'"     @open="open" />
        <player-status v-else-if="page == 'status'"      @open="open" />
        <Testing       v-else-if="page == 'test'"        @open="open" />
      </div>
    `,
  });


  Vue.component('Testing', {
      data() {
        return {
          item: 'water',
        };
      },

      computed: {
        turns:     function() { return this.game.turns },
        resources: function() { return Object.keys(this.data.resources) },
        bodies:    function() { return Object.keys(this.game.planets) },
        places:    function() { return Object.values(this.game.planets) },
        resource:  function() { return resources[this.item] },

        value: function() {
          if (this.resource) return Math.floor(this.resource.value);
          return 0;
        },
      },

      methods: {
        gameTurns: function(turns) {
          let left = turns;
          let intvl;

          intvl = window.setInterval(() => {
            if (left > 0) {
              const batch = Math.min(3, left);
              left -= batch;

              for (let i = 0; i < batch; ++i) {
                this.game.turn(batch, true);
              }
            }
            else {
              window.clearInterval(intvl);
              intvl = null;
              console.log(turns, 'turns complete');
              this.game.save_game();
            }

            this.$forceUpdate();
          }, 200);
        },

        fixMe: function() {
          this.game.player.ship.damage.hull = this.game.player.ship.damage.armor = 0;
          this.game.player.ship.fuel = this.game.player.ship.tank;
          this.game.save_game();
        },
      },

      template: `
<card title="Testing">
  <div class="btn-group">
    <btn @click="fixMe">Fix me</btn>
    <btn @click="gameTurns(1)">1 turns</btn>
    <btn @click="gameTurns(3)">3 turns</btn>
    <btn @click="gameTurns(9)">9 turns</btn>
    <btn @click="gameTurns(30)">30 turns</btn>
    <btn @click="gameTurns(90)">90 turns</btn>
  </div>

  <div class="my-3 input-group">
    <h4 class="mx-1">Resource</h4>

    <select v-model="item" class="form-control mx-1">
      <option value="">Resource</option>
      <option v-for="item in resources" :key="item" :value="item">{{item|caps}}</option>
    </select>

    <badge>
      {{value}}c
    </badge>
  </div>

  <table v-if="item" class="table table-sm mini">
    <thead>
      <tr>
        <th>Loc</th>
        <th class="text-right">Stock</th>
        <th class="text-right">Price</th>
        <th class="text-right">Demand</th>
        <th class="text-right">Supply</th>
        <th class="text-right">Need</th>
        <th class="text-right">Net</th>
        <th class="text-right">Avg</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="place in places">
      <tr :class="{'text-info': place.isNetExporter(item)}">
        <td>{{place.name|caps}}</td>
        <td class="text-right">{{place.getStock(item)}}</td>
        <td class="text-right">{{place.price(item)|csn}}</td>
        <td class="text-right">{{place.getDemand(item)|R(2)}}</td>
        <td class="text-right">{{place.getSupply(item)|R(2)}}</td>
        <td class="text-right" :class="{'text-success': place.hasSurplus(item), 'text-danger': place.hasShortage(item)}">{{place.getNeed(item)|R(2)}}</td>
        <td class="text-right">{{place.netProduction(item)|R(2)}}</td>
        <td class="text-right">{{place.avgProduction(item)|R(2)}}</td>
      </tr>
      </template>
    </tbody>
  </table>
</card>
      `,
    });

});
