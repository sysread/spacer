define(function(require, exports, module) {
  const Vue   = require('vendor/vue');
  const util  = require('util');
  const model = require('model');

  require('component/global');
  require('component/common');
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
      planet:    function() { return this.game.here },
      player:    function() { return this.game.player },
      resources: function() { return Object.keys(this.data.resources) },
    },
    methods: {
      dock:          function(item) { return this.planet.getStock(item) },
      hold:          function(item) { return this.player.ship.cargo.count(item) },
      buy:           function(item) { return this.planet.buyPrice(item, this.player) },
      sell:          function(item) { return this.planet.sellPrice(item) },
      is_contraband: function(item) { return this.data.resources[item].contraband },
    },
    template: `
<card title="Commerce">
  <card-text>
    There are endless warehouses along the docks. As you approach the resource
    exchange, you are approached by several warehouse managers and sales people
    eager to do business with you. Moving here and there among the throng you
    notice the occasional security agent or inspector watching for evidence of
    contraband.
  </card-text>

  <div class="container container-fluid">
    <row v-for="item of resources" :key="item" :class="{'text-muted':dock(item) == 0 && hold(item) == 0}">
      <cell size=4 brkpt="sm" y=0 class="px-0 my-1">
        <btn @click="trade=item" block=1 :class="{'btn-secondary': dock(item) == 0 && hold(item) == 0, 'text-warning': is_contraband(item)}">
          {{item|caps}}
        </btn>
      </cell>
      <cell size=8 brkpt="sm" y=0>
        <table class="table table-sm table-mini table-noborder">
          <tr>
            <th scope="col" class="w-25">Buy</th><td class="w-25">{{buy(item)|csn}}</td>
            <th scope="col" class="w-25">Sell</th><td class="w-25">{{sell(item)|csn}}</td>
          </tr>
          <tr>
            <th scope="col" class="w-25">Dock</th><td class="w-25" :class="{'text-warning': dock(item) > 0}">{{dock(item)}}</td>
            <th scope="col" class="w-25">Ship</th><td class="w-25" :class="{'text-success': hold(item) > 0}">{{hold(item)}}</td>
          </tr>
        </table>
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
        report:     false,
        caught:     false,
        tx_dock:    null,
        tx_hold:    null,
        tx_credits: null,
        tx_cargo:   null,
      };
    },
    computed: {
      planet:     function() { return this.game.here },
      player:     function() { return this.game.player },
      faction:    function() { return this.planet.faction },
      buy:        function() { return this.planet.buyPrice(this.item, this.player) },
      sell:       function() { return this.planet.sellPrice(this.item, this.player) },
      count:      function() { return this.hold - this.player.ship.cargo.get(this.item) },
      contraband: function() { return this.data.resources[this.item].contraband },

      dock: {
        get() {
          if (this.tx_dock === null) this.tx_dock = this.game.here.getStock(this.item);
          return this.tx_dock;
        },

        set(new_value) {
          this.tx_dock = new_value;
        }
      },

      hold: {
        get() {
          if (this.tx_hold === null) this.tx_hold = this.game.player.ship.cargo.get(this.item);
          return this.tx_hold;
        },

        set(new_value) {
          this.tx_hold = new_value;
        }
      },

      credits: {
        get() {
          if (this.tx_credits === null) this.tx_credits = this.game.player.money;
          return this.tx_credits;
        },

        set(new_value) {
          this.tx_credits = new_value;
        }
      },

      cargo: {
        get() {
          if (this.tx_cargo === null) this.tx_cargo = this.game.player.ship.cargoUsed;
          return this.tx_cargo;
        },

        set(new_value) {
          this.tx_cargo = new_value;
        }
      },

      max: function() {
        const cred  = this.player.money;
        const hold  = this.player.ship.cargo.count(this.item);
        const dock  = this.planet.getStock(this.item);
        const cargo = this.player.ship.cargoLeft;
        return hold + Math.min(dock, Math.floor(cred / this.buy), cargo);
      },
    },
    methods: {
      agentGender: function() {
        return util.oneOf(['man', 'woman']);
      },

      fine: function() {
        const base = this.planet.inspectionFine();
        return Math.min(this.player.money, base * Math.abs(this.count));
      },

      updateState: function() {
        const cred   = this.player.money;
        const hold   = this.player.ship.cargo.get(this.item);
        const dock   = this.planet.getStock(this.item);
        const diff   = this.hold - hold;
        this.dock    = dock - diff;
        this.credits = cred - (diff * (diff > 0 ? this.buy : this.sell));
        this.cargo   = this.player.ship.cargoUsed + diff;
      },

      complete: function() {
        if (this.contraband && this.planet.inspectionChance(0)) {
          this.player.debit(this.fine());
          this.player.decStanding(this.faction.abbrev, this.contraband);

          if (this.count < 0) {
            this.player.ship.cargo.set(this.item, 0);
          }
          else {
            this.planet.store.dec(this.item, this.count);
          }

          alert(
              `As you complete your exchange, ${this.faction.abbrev} agents in powered armor smash their way into the room.`
            + `A ${this.agentGender()} with a corporal's stripes informs you that your cargo has been confiscated and you have been fined ${this.fine()} credits.`,
            + `Your reputation with this faction has decreased by ${this.contraband}.`
          );
        }
        else {
          if (this.count > 0) {
            const [bought, price] = this.game.here.buy(this.item, this.count, this.player);
          }
          else {
            const [bought, price, standing] = this.game.here.sell(this.item, -this.count, this.player);
            if (standing > 1)
              alert(`You ended the local supply shortage of ${this.item}! Your standing with this faction has increased.`);
          }
        }

        this.game.save_game();
        this.game.refresh();
        this.$emit('update:item', null);
      },
    },
    template: `
<div>
  <modal @close="$emit('update:item', null)" close="Cancel" :title="'Exchange of ' + this.item">
    <button @click="report=true" slot="header" type="button" class="btn btn-dark">Report</button>

    <p v-if="contraband" class="text-warning font-italic">
      Trade in contraband goods may result in fines and loss of standing.
    </p>

    <row>
      <cell size="3" class="font-weight-bold">Credits</cell><cell size="3">{{credits|csn}}</cell>
      <cell size="3" class="font-weight-bold">Cargo</cell><cell size="3">{{cargo|csn}}</cell>
    </row>

    <row>
      <cell size="3" class="font-weight-bold">Buy</cell><cell size="3">{{buy|csn}}</cell>
      <cell size="3" class="font-weight-bold">Sell</cell><cell size="3">{{sell|csn}}</cell>
    </row>

    <row>
      <cell size="3" class="font-weight-bold">Dock</cell><cell size="3" class="text-warning">{{dock|csn}}</cell>
      <cell size="3" class="font-weight-bold">Hold</cell><cell size="3" class="text-success">{{hold|csn}}</cell>
    </row>

    <slider minmax=true :value.sync="tx_hold" min=0 :max="max" step=1 @update:value="updateState" />

    <btn slot="footer" @click="complete" close=1>Complete transaction</btn>
  </modal>

  <modal v-if="report" @close="report=false" close="Close" xclose=true :title="'System market report for ' + item">
    <resource-report :item="item" />
  </modal>
</div>
    `,
  });

  Vue.component('resource-report', {
    props: ['item'],
    data() { return { relprices: false, show_routes: false } },
    computed: {
      here()   { return this.game.locus },
      bodies() { return Object.keys(this.data.bodies) },

      routes() {
        const info = this.game.trade_routes()[this.item];
        const routes = [];

        for (const from of Object.keys(info).sort()) {
          for (const to of Object.keys(info[from]).sort()) {
            routes.push([from, to, info[from][to]]);
          }
        }

        return routes;
      },
    },
    template: `
<div>
  <div class="my-2">
    <btn @click="show_routes=!show_routes">
      <span v-if="show_routes">Shipments</span>
      <span v-else>Price report</span>
    </btn>

    <btn v-if="!show_routes" @click="relprices=!relprices">
      <span v-if="relprices">Relative prices</span>
      <span v-else>Absolute prices</span>
    </btn>
  </div>

  <table class="table table-sm" v-if="!show_routes">
    <thead>
      <tr>
        <th>Market</th>
        <th class="text-right">Buy</th>
        <th class="text-right">Sell</th>
        <th class="text-right d-none d-sm-table-cell">Stock</th>
      </tr>
    </thead>
    <tbody>
      <resource-report-row v-for="body in bodies" :key="body" :item="item" :body="body" :relprices="relprices" />
    </tbody>
  </table>

  <table class="table table-sm" v-else>
    <thead>
      <tr>
        <th>Source</th>
        <th>Destination</th>
        <th class="text-right">Tonnes</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="[from, to, amount] of routes">
        <th scope="row">{{from|caps}}</th>
        <td>{{to|caps}}</td>
        <td class="text-right">{{amount|csn}}</td>
      </tr>
    </tbody>
  </table>
</div>
    `
  });

  Vue.component('resource-report-row', {
    props: ['item', 'body', 'relprices'],
    computed: {
      player:  function() { return this.game.player },
      isHere:  function() { return this.body === this.game.locus },
      remote:  function() { return this.game.planets[this.body] },
      local:   function() { return this.game.here },
      stock:   function() { return this.remote.getStock(this.item) },
      rBuy:    function() { return this.remote.buyPrice(this.item, this.player) },
      rSell:   function() { return this.remote.sellPrice(this.item) },
      lBuy:    function() { return this.local.buyPrice(this.item, this.player) },
      lSell:   function() { return this.local.sellPrice(this.item) },
      relBuy:  function() { return this.rBuy - this.lSell },
      relSell: function() { return this.rSell - this.lBuy },
      central: function() { return this.system.central(this.body) },
    },
    template: `
<tr :class="{'bg-dark': isHere}">
  <th scope="row">
    {{body|caps}}
    <badge v-if="central != 'sun'" right=1 class="ml-1">{{central|caps}}</badge>
  </th>
  <td class="text-right" :class="{'text-success': stock && relBuy < 0, 'text-muted': !stock}">
    <span v-if="relprices"><span v-if="relBuy > 0">+</span>{{relBuy|csn}}</span>
    <span v-else>{{rBuy|csn}}</span>
  </td>
  <td class="text-right" :class="{'text-success': relSell > 0}">
    <span v-if="relprices"><span v-if="relSell > 0">+</span>{{relSell|csn}}</span>
    <span v-else>{{rSell|csn}}</span>
  </td>
  <td class="text-right d-none d-sm-table-cell">{{stock}}</td>
</tr>
    `,
  });

  Vue.component('market-report', {
    props: ['body', 'relprices'],
    computed: {
      planet:    function() { return this.game.planets[this.body] },
      resources: function() { return Object.keys(model.resources) },
    },
    template: `
<div>
  <table class="table table-sm">
    <thead>
      <tr>
        <th>Resource</th>
        <th class="text-right">Buy</th>
        <th class="text-right">Sell</th>
        <th class="text-right d-none d-sm-table-cell">Stock</th>
      </tr>
    </thead>
    <tbody>
      <market-report-row v-for="resource in resources" :key="resource.name" :resource="resource" :planet="planet" :relprices="relprices" />
    </tbody>
  </table>
</div>
    `
  });

  Vue.component('market-report-row', {
    props: ['resource', 'planet', 'relprices'],
    computed: {
      player:  function() { return this.game.player },
      local:   function() { return this.game.here },
      stock:   function() { return this.planet.getStock(this.resource) },
      rBuy:    function() { return this.planet.buyPrice(this.resource, this.player) },
      rSell:   function() { return this.planet.sellPrice(this.resource) },
      lBuy:    function() { return this.local.buyPrice(this.resource, this.player) },
      lSell:   function() { return this.local.sellPrice(this.resource) },
      relBuy:  function() { return this.rBuy - this.lSell },
      relSell: function() { return this.rSell - this.lBuy },
    },
    template: `
<tr>
  <th scope="row">{{resource|caps}}</th>

  <td class="text-right" :class="{'text-success': stock && relBuy < 0, 'text-muted': !stock}">
    <span v-if="relprices"><span v-if="relBuy > 0">+</span>{{relBuy|csn}}</span>
    <span v-else>{{rBuy|csn}}</span>
  </td>

  <td class="text-right" :class="{'text-success': relSell > 0}">
    <span v-if="relprices"><span v-if="relSell > 0">+</span>{{relSell|csn}}</span>
    <span v-else>{{rSell|csn}}</span>
  </td>
  <td class="text-right d-none d-sm-table-cell">{{stock}}</td>
</tr>
    `,
  });
});
