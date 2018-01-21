define(function(require, exports, module) {
  const Game   = require('game');
  const Vue    = require('vendor/vue');
  const data   = require('data');
  const system = require('system');
  const util   = require('util');

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
      adjust: function() { return Game.game.player.getStandingPriceAdjustment(Game.game.here.faction) },
    },
    methods: {
      dock: function(item) { return Game.game.place().currentSupply(item) },
      hold: function(item) { return Game.game.player.ship.cargo.get(item) },
      buy:  function(item) { return Math.ceil(Game.game.place().buyPrice(item)  * (1 - this.adjust)) },
      sell: function(item) { return Math.ceil(Game.game.place().sellPrice(item) * (1 + this.adjust)) },
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
          <cell size=3 y=0>Buy</cell> <cell size=3 y=0 class="muted">{{buy(item)|csn}}</cell>
          <cell size=3 y=0>Sell</cell><cell size=3 y=0 class="muted">{{sell(item)|csn}}</cell>
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
        caught:  false,
      };
    },
    computed: {
      faction:    function() { return Game.game.place().faction },
      buy:        function() { return Game.game.place().buyPrice(this.item)  },
      sell:       function() { return Game.game.place().sellPrice(this.item) },
      count:      function() { return this.hold - Game.game.player.ship.cargo.get(this.item) },
      contraband: function() { return data.resources[this.item].contraband },

      max: function() {
        const cred  = Game.game.player.money;
        const hold  = Game.game.player.ship.cargo.get(this.item);
        const dock  = Game.game.place().currentSupply(this.item);
        const cargo = Game.game.player.ship.cargoLeft;
        return hold + Math.min(dock, Math.floor(cred / this.buy), cargo);
      },
    },
    methods: {
      agentGender: function() {
        return util.oneOf(['man', 'woman']);
      },

      fine: function() {
        const base = Game.game.place().inspectionFine();
        return Math.min(Game.game.player.money, base * Math.abs(this.count));
      },

      updateState: function() {
        const cred   = Game.game.player.money;
        const hold   = Game.game.player.ship.cargo.get(this.item);
        const dock   = Game.game.place().currentSupply(this.item);
        const diff   = this.hold - hold;
        this.dock    = dock - diff;
        this.credits = cred - (diff * (diff > 0 ? this.buy : this.sell));
        this.cargo   = Game.game.player.ship.cargoUsed + diff;
      },

      complete: function() {
        if (this.contraband && Game.game.place().inspectionChance()) {
          alert(
              `As you complete your exchange, ${this.faction} agents in powered armor smash their way into the room.`
            + `A ${this.agentGender()} with a corporal's stripes informs you that your cargo has been confiscated and you have been fined ${this.fine()} credits.`,
            + `Your reputation with this faction has decreased by ${this.contraband}.`
          );
          Game.game.player.debit(this.fine());
          Game.game.player.decStanding(this.faction, this.contraband);
          Game.game.player.ship.cargo.set(this.item, 0);
        }
        else {
          if (this.count > 0) {
            Game.game.player.debit(Game.game.place().buy(this.item, this.count));
            Game.game.player.ship.loadCargo(this.item, this.count);
          }
          else {
            const underSupplied = Game.game.place().is_under_supplied(this.item);
            Game.game.player.credit(Game.game.place().sell(this.item, -this.count));
            Game.game.player.ship.unloadCargo(this.item, -this.count);

            if (underSupplied && !this.contraband) {
              // Player ended supply deficiency
              if (!Game.game.place().is_under_supplied(this.item)) {
                Game.game.player.incStanding(Game.game.place().faction, 5);
                alert('You ended the local supply shortage of ' + this.item + '! Your standing with this faction has increased.');
              }
              // Player helped address supply deficiency
              else {
                Game.game.player.incStanding(Game.game.place().faction, 1);
              }
            }
          }
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
      <cell size="3" class="font-weight-bold">Credits</cell><cell size="3">{{credits|csn}}</cell>
      <cell size="3" class="font-weight-bold">Cargo</cell><cell size="3">{{cargo}}</cell>
    </row>

    <row>
      <cell size="3" class="font-weight-bold">Buy</cell><cell size="3">{{buy}}</cell>
      <cell size="3" class="font-weight-bold">Sell</cell><cell size="3">{{sell}}</cell>
    </row>

    <row>
      <cell size="3" class="font-weight-bold">Dock</cell><cell size="3" class="text-warning">{{dock}}</cell>
      <cell size="3" class="font-weight-bold">Hold</cell><cell size="3" class="text-success">{{hold}}</cell>
    </row>

    <slider minmax=true :value.sync="hold" min=0 :max="max" step=1 @update:value="updateState" />

    <btn slot="footer" @click="complete" close=1>Complete transaction</btn>
  </modal>

  <modal v-if="report" @close="report=false" close="Close" xclose=true :title="'System market report for ' + item">
    <market-report :item="item" />
  </modal>
</div>
    `,
  });

  Vue.component('market-report', {
    props: ['item'],
    data: function() { return { relprices: false } },
    computed: {
      bodies: function() { return Object.keys(data.bodies) },
    },
    template: `
<div>
  <btn block=1 @click="relprices=!relprices" class="my-3">
    <span v-if="relprices">Show absolute prices</span>
    <span v-else>Show relative prices</span>
  </btn>

  <p class="font-italic d-none d-sm-block">
    Market data age is reported in hours due to light speed lag.
  </p>

  <table class="table">
    <thead>
      <tr>
        <th>Market</th>
        <th class="text-right">Buy</th>
        <th class="text-right">Sell</th>
        <th class="text-right d-none d-sm-table-cell">Stock</th>
        <th class="text-right d-none d-sm-table-cell">Age</th>
      </tr>
    </thead>
    <tbody>
      <market-report-row v-for="body in bodies" :key="body" :item="item" :body="body" :relprices="relprices" />
    </tbody>
  </table>
</div>
    `
  });

  Vue.component('market-report-row', {
    props: ['item', 'body', 'relprices'],
    computed: {
      buy:     function() { return Game.game.place().buyPrice(this.item) },
      sell:    function() { return Game.game.place().sellPrice(this.item) },
      report:  function() { return Game.game.market(this.body) },
      hasData: function() { return this.report.data.hasOwnProperty(this.item) },
      info:    function() { if (this.hasData) return this.report.data[this.item] },
      isLocal: function() { return this.body === Game.game.locus },
      central: function() { return system.central(this.body) },
    },
    methods: {
    },
    template: `
<tr :class="{'bg-dark': isLocal}">
  <th scope="row">
    {{body|caps}}
    <span v-if="central != 'sun'" class="badge badge-pill m-1">{{central|caps}}</span>
    <span v-if="info.trend > 0" class="badge badge-pill float-right">&uarr; {{info.trend}}</span>
    <span v-if="info.trend < 0" class="badge badge-pill float-right">&darr; {{info.trend}}</span>
  </th>
  <td class="text-right" :class="{'text-success': info.buy < sell}">
    <span v-if="relprices">{{info.buy - sell}}</span>
    <span v-else>{{info.buy}}</span>
  </td>
  <td class="text-right" :class="{'text-success': info.sell > buy}">
    <span v-if="relprices">{{info.sell - buy}}</span>
    <span v-else>{{info.sell}}</span>
  </td>
  <td class="text-right d-none d-sm-table-cell">{{info.stock}}</td>
  <td class="text-right d-none d-sm-table-cell">{{report.age}}</td>
</tr>
    `,
  });
});
