define(function(require, exports, module) {
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');
  const Game    = require('game');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');

  require('component/common');
  require('component/card');
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
<card :title="mini ? null : place.title">
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
</card>
    `,
  });
});
