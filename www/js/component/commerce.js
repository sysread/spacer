define(function(require, exports, module) {
  const Game    = require('game');
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');

  require('component/modal');
  require('component/card');
  require('component/row');
  require('component/exchange');

  Vue.component('market', {
    data: function() {
      return {
        trade: null,
      };
    },
    computed: {
      resources: function() { return Object.keys(data.resources) },
    },
    methods: {
      csn:  function(n)    { return util.csn(n)                           },
      buy:  function(item) { return Game.game.place().buyPrice(item)      },
      sell: function(item) { return Game.game.place().sellPrice(item)     },
      dock: function(item) { return Game.game.place().currentSupply(item) },
      hold: function(item) { return Game.game.player.ship.cargo.get(item) },
    },
    template: `
<card title="Commerce">
  <card-text>
    There are endless warehouses along the docks. As you approach the resource
    exchange, you are approached by several warehouse managers and sales people
    eager to do business with you.
  </card-text>

  <div class="container container-fluid">
    <row v-for="item of resources" :key="item">
      <cell size=4 brkpt="sm" y=1>
        <btn @click="trade=item" block=1>{{item|caps}}</btn>
      </cell>
      <cell size=8 brkpt="sm" y=1>
        <row y=0>
          <cell size=3 y=0>Buy</cell> <cell size=3 y=0 class="muted">{{csn(buy(item))}}</cell>
          <cell size=3 y=0>Sell</cell><cell size=3 y=0 class="muted">{{csn(sell(item))}}</cell>
          <cell size=3 y=0>Dock</cell><cell size=3 y=0 class="muted" :class="{'font-weight-bold': dock(item) > 0, 'text-warning': dock(item) > 0}">{{dock(item)}}</cell>
          <cell size=3 y=0>Ship</cell><cell size=3 y=0 class="muted" :class="{'font-weight-bold': hold(item) > 0, 'text-success': hold(item) > 0}">{{hold(item)}}</cell>
        </row>
      </cell>
    </row>
  </div>

  <market-trade v-if="trade" :item.sync="trade" />
</card>
    `
  });


  Vue.component('market-trade', {
    props: ['item'],
    data: function() {
      return {
        credits: Game.game.player.money,
        hold:    Game.game.player.ship.cargo.get(this.item),
        dock:    Game.game.place().currentSupply(this.item),
        cargo:   Game.game.player.ship.cargoUsed,
        report:  false,
      };
    },
    computed: {
      buy:  function() { return Game.game.place().buyPrice(this.item)  },
      sell: function() { return Game.game.place().sellPrice(this.item) },
      max:  function() {
        const cred  = Game.game.player.money;
        const hold  = Game.game.player.ship.cargo.get(this.item);
        const dock  = Game.game.place().currentSupply(this.item);
        const cargo = Game.game.player.ship.cargoLeft;
        return hold + Math.min(dock, Math.floor(cred / this.buy), cargo);
      },
    },
    methods: {
      csn: function(n) { return util.csn(n) },

      updateState() {
        const cred   = Game.game.player.money;
        const hold   = Game.game.player.ship.cargo.get(this.item);
        const dock   = Game.game.place().currentSupply(this.item);
        const diff   = this.hold - hold;
        this.dock    = dock - diff;
        this.credits = cred - (diff * (diff > 0 ? this.buy : this.sell));
        this.cargo   = Game.game.player.ship.cargoUsed + diff;
      },

      complete() {
        const count = this.hold - Game.game.player.ship.cargo.get(this.item);

        if (count > 0) {
          Game.game.player.debit(Game.game.place().buy(this.item, count));
          Game.game.player.ship.loadCargo(this.item, count);
        } else {
          Game.game.player.credit(Game.game.place().sell(this.item, -count));
          Game.game.player.ship.unloadCargo(this.item, -count);
        }

        Game.game.save_game();
        Game.game.refresh();

        this.$emit('update:item', null);
      },
    },
    template: `
<div>
  <modal @close="$emit('update:item', null)" close="Cancel" :title="'Exchange of ' + this.item">
    <button @click="report=true" slot="header" type="button" class="btn btn-dark">Report</button>

    <row>
      <cell size="3" class="font-weight-bold">Credits</cell><cell size="3">{{csn(credits)}}</cell>
      <cell size="3" class="font-weight-bold">Cargo</cell><cell size="3">{{cargo}}</cell>
    </row>

    <row>
      <cell size="3" class="font-weight-bold">Buy</cell><cell size="3">{{buy}}</cell>
      <cell size="3" class="font-weight-bold">Sell</cell><cell size="3">{{sell}}</cell>
    </row>

    <row>
      <cell size="3" class="font-weight-bold">Dock</cell><cell size="3">{{dock}}</cell>
      <cell size="3" class="font-weight-bold">Hold</cell><cell size="3">{{hold}}</cell>
    </row>

    <slider minmax=true :value.sync="hold" min=0 :max="max" step=1 @update:value="updateState" />

    <btn @click="complete" slot="footer" close=1>Complete transaction</btn>
  </modal>

  <modal v-if="report" @close="report=false" close="Close" xclose=true :title="'System market report for ' + item">
    <market-report :item="item" />
  </modal>
</div>
    `,
  });


  Vue.component('market-report', {
    props: ['item'],
    data: function() {
      return {
        relprices: false,
      };
    },
    computed: {
      bodies: function() { return Object.keys(data.bodies) },
    },
    template: `
<div class="container container-fluid" style="font-size: 0.9em">
  <btn block=1 @click="relprices=!relprices" class="my-3">Toggle relative prices</btn>

  <row y=0 class="font-weight-bold">
    <cell y=0 size=6>Market</cell>
    <cell y=0 size=3 class="text-right">Buy</cell>
    <cell y=0 size=3 class="text-right">Sell</cell>
  </row>

  <market-report-row v-for="body in bodies" :key="body" :item="item" :body="body" :relprices="relprices" />
</div>
    `
  });


  Vue.component('market-report-row', {
    props: ['item', 'body', 'relprices'],
    computed: {
      kind:    function() { return system.kind(this.body) },
      buy:     function() { return Game.game.place().buyPrice(this.item) },
      sell:    function() { return Game.game.place().sellPrice(this.item) },
      report:  function() { return Game.game.market(this.body) },
      hasData: function() { return this.report !== null },
      info:    function() { if (this.hasData) return this.report.data[this.item] },
      isLocal: function() { return this.body === Game.game.locus },
    },
    template: `
<row y=0 :class="{'font-weight-bold': isLocal, 'bg-dark': isLocal}"">
  <cell y=0 size=6>{{body|caps}}</cell>

  <cell y=0 size=3 :class="{'text-success': info.buy < sell, 'text-right': 1}">
    <span v-if="relprices">{{sell - info.buy}}</span>
    <span v-else>{{info.buy}}</span>
  </cell>

  <cell y=0 size=3 :class="{'text-success': info.sell > buy, 'text-right': 1}">
    <span v-if="relprices">{{info.sell - buy}}</span>
    <span v-else>{{info.sell}}</span>
  </cell>
</row>
    `,
  });
});
