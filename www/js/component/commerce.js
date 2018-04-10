define(function(require, exports, module) {
  const Vue    = require('vendor/vue');
  const data   = require('data');
  const system = require('system');
  const util   = require('util');
  const model  = require('model');

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
      planet:    function() { return game.here },
      player:    function() { return game.player },
      resources: function() { return Object.keys(data.resources) },
    },
    methods: {
      dock: function(item) { return this.planet.getStock(item) },
      hold: function(item) { return this.player.ship.cargo.count(item) },
      buy:  function(item) { return this.planet.buyPrice(item, this.player) },
      sell: function(item) { return this.planet.sellPrice(item) },
    },
    template: `
<card title="Commerce">
  <card-text>
    There are endless warehouses along the docks. As you approach the resource
    exchange, you are approached by several warehouse managers and sales people
    eager to do business with you.
  </card-text>

  <div class="container container-fluid">
    <row v-for="item of resources" :key="item" :class="{'text-muted':dock(item) == 0 && hold(item) == 0}">
      <cell size=4 brkpt="sm" y=0 class="px-0 my-1">
        <btn @click="trade=item" block=1 :class="{'btn-secondary':dock(item) == 0 && hold(item) == 0}">{{item|caps}}</btn>
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
        credits: game.player.money,
        hold:    game.player.ship.cargo.get(this.item),
        dock:    game.here.getStock(this.item),
        cargo:   game.player.ship.cargoUsed,
        report:  false,
        caught:  false,
      };
    },
    computed: {
      planet:     function() { return game.here },
      player:     function() { return game.player },
      faction:    function() { return this.planet.faction },
      buy:        function() { return this.planet.buyPrice(this.item, this.player) },
      sell:       function() { return this.planet.sellPrice(this.item, this.player) },
      count:      function() { return this.hold - this.player.ship.cargo.get(this.item) },
      contraband: function() { return data.resources[this.item].contraband },

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
            const [bought, price] = game.here.buy(this.item, this.count, this.player);
          }
          else {
            const [bought, price, standing] = game.here.sell(this.item, -this.count, this.player);
            if (standing > 1)
              alert(`You ended the local supply shortage of ${this.item}! Your standing with this faction has increased.`);
          }
        }

        game.save_game();
        game.refresh();
        this.$emit('update:item', null);
      },
    },
    template: `
<div>
  <modal @close="$emit('update:item', null)" close="Cancel" :title="'Exchange of ' + this.item">
    <button @click="report=true" slot="header" type="button" class="btn btn-dark">Report</button>

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

    <slider minmax=true :value.sync="hold" min=0 :max="max" step=1 @update:value="updateState" />

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
    data: function() { return { relprices: false } },
    computed: {
      here:   function() { return game.locus },
      bodies: function() { return Object.keys(data.bodies) },
    },
    template: `
<div>
  <btn block=1 @click="relprices=!relprices" class="my-3">
    <span v-if="relprices">Show absolute prices</span>
    <span v-else>Show relative prices</span>
  </btn>

  <table class="table table-sm">
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
</div>
    `
  });

  Vue.component('resource-report-row', {
    props: ['item', 'body', 'relprices'],
    computed: {
      player:  function() { return game.player },
      isHere:  function() { return this.body === game.locus },
      remote:  function() { return game.planets[this.body] },
      local:   function() { return game.here },
      stock:   function() { return this.remote.getStock(this.item) },
      rBuy:    function() { return this.remote.buyPrice(this.item, this.player) },
      rSell:   function() { return this.remote.sellPrice(this.item) },
      lBuy:    function() { return this.local.buyPrice(this.item, this.player) },
      lSell:   function() { return this.local.sellPrice(this.item) },
      relBuy:  function() { return this.rBuy - this.lSell },
      relSell: function() { return this.rSell - this.lBuy },
      central: function() { return system.central(this.body) },
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
    props: ['body'],
    data: function() { return { relprices: false } },
    computed: {
      planet:    function() { return game.planets[this.body] },
      resources: function() { return Object.keys(model.resources) },
    },
    template: `
<div>
  <h3>Market report for {{planet.name}}</h3>

  <btn block=1 @click="relprices=!relprices" class="my-3">
    <span v-if="relprices">Show absolute prices</span>
    <span v-else>Show relative prices</span>
  </btn>

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
      player:  function() { return game.player },
      local:   function() { return game.here },
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
