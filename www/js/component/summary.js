define(function(require, exports, module) {
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');
  const Game    = require('game');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');
  require('component/card');
  require('component/row');

  Vue.component('place-summary', {
    props: ['place', 'mini'],
    computed: {
      desc     : function() {return data.bodies[this.place.name].desc.split('|')},
      isThere  : function() {return this.place.name === Game.game.locus},
      distance : function() {return util.R(system.distance(Game.game.locus, this.place.name) / Physics.AU, 2) + ' AU'},
      kind     : function() {return system.kind(this.place.name)},
      faction  : function() {return data.factions[this.place.faction].full_name},
      traits   : function() {return util.uniq(this.place.traits, ', ')     ||'None'},
      conds    : function() {return util.uniq(this.place.conditions, ', ') ||'None'},
    },
    template: `
<card :title="mini ? null : place.title">
  <card-text v-if="!mini" v-for="(line, idx) of desc" :key="idx"><i>{{line}}</i></card-text>
  <def caps=true v-if="!isThere" term="Distance" :def="distance" />
  <def caps=true v-else term="Location" def="Docked" />
  <def caps=true term="Environ" :def="kind" />
  <def caps=true term="Faction" :def="faction" />
  <def caps=true term="Economy" :def="place.size" />
  <def caps=true term="Details" :def="traits" />
  <def caps=true term="Special" :def="conds" />
</card>
    `,
  });
});
