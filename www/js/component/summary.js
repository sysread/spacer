define(function(require, exports, module) {
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');
  const Game    = require('game');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');

  require('component/common');
  require('component/card');
  require('component/modal');
  require('component/row');

  Vue.component('place-summary', {
    props: ['place', 'mini'],
    computed: {
      desc     : function() {return data.bodies[this.place.name].desc.split('|')},
      isThere  : function() {return this.place.name === Game.game.locus},
      distance : function() {return system.distance(Game.game.locus, this.place.name) / Physics.AU },
      kind     : function() {return system.kind(this.place.name)},
      faction  : function() {return data.factions[this.place.faction].full_name},
    },
    template: `
<div>
  <def y=1 v-if="isThere" term="Location" def="Docked" />
  <def y=1 v-else term="Distance" :def="distance|R(2)|csn|unit('AU')" />

  <def y=1 term="Environ" :def="kind|caps" />
  <def y=1 term="Faction" :def="faction|caps" />
  <def y=1 term="Economy" :def="place.size|caps" />

  <def y=1 term="Details">
    <row y=0 slot="def" v-if="place.traits.length">
      <cell y=0 class="col-sm-6 font-italic" v-for="trait in place.traits" :key="trait">{{trait|caps}}</cell>
    </row>
    <span v-else slot="def">N/A</span>
  </def>

  <def y=1 term="Special">
    <row y=0 slot="def" v-if="place.conditions.length">
      <cell y=0 class="col-sm-6 font-italic" v-for="cond in place.conditions" :key="cond">{{cond|caps}}</cell>
    </row>
    <span v-else slot="def">N/A</span>
  </def>

  <card v-if="!mini" class="my-3">
    <card-text v-for="(line, idx) of desc" :key="idx" class="font-italic">{{line}}</card-text>
  </card>
</div>
    `,
  });

  Vue.component('market-summary', {
    props: ['body'],
    data: function() {
      return {
        relprices: false,
      };
    },
    computed: {
      game:      function() { return Game.game },
      here:      function() { return Game.game.here },
      place:     function() { return Game.game.place(this.body) },
      player:    function() { return Game.game.player },
      resources: function() { return Object.keys(data.resources) },
      report:    function() { return Game.game.market(this.body) },
      age:       function() { return this.report.age },
    },
    methods: {
      info:    function(item) { return this.report.data[item] },
      stock:   function(item) { return this.info(item).stock },
      lBuy:    function(item) { return this.here.buyPrice(item, this.player) },
      lSell:   function(item) { return this.here.sellPrice(item) },
      rBuy:    function(item) { return this.place.buyPrice(item, this.player) },
      rSell:   function(item) { return this.place.sellPrice(item) },
      relBuy:  function(item) { return this.rBuy(item) - this.lSell(item) },
      relSell: function(item) { return this.rSell(item) - this.lBuy(item) },
    },
    template: `
<div>
  <btn block=1 @click="relprices=!relprices" class="my-3">
    <span v-if="relprices">Show absolute prices</span>
    <span v-else>Show relative prices</span>
  </btn>

  <p class="font-italic d-none d-sm-block">
    Market data is {{age}} hours old due to light speed lag.
  </p>

  <table class="table">
    <thead>
      <tr>
        <th>Resource</th>
        <th class="text-right">Stock</th>
        <th class="text-right">Buy</th>
        <th class="text-right">Sell</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in resources" :key="item">
        <th scope="row">
          {{item|caps}}
          <span v-if="info.trend > 0" class="badge badge-pill float-right">&uarr; {{info(item).trend}}</span>
          <span v-if="info.trend < 0" class="badge badge-pill float-right">&darr; {{info(item).trend}}</span>
        </th>

        <td class="text-right">{{stock(item)|csn}}</td>

        <td class="text-right" :class="{'text-success': rBuy(item) < lSell(item)}">
          <span v-if="relprices"><span v-if="relBuy(item) > 0">+</span>{{relBuy(item)|csn}}</span>
          <span v-else>{{rBuy(item)|csn}}</span>
        </td>

        <td class="text-right" :class="{'text-muted': stock(item) == 0, 'text-success': stock(item) > 0 && rSell(item) > lBuy(item)}">
          <span v-if="relprices"><span v-if="relSell(item) > 0">+</span>{{relSell(item)|csn}}</span>
          <span v-else>{{rSell(item)|csn}}</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
    `,
  });
});
