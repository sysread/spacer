define(function(require, exports, module) {
  const Physics = require('physics');
  const Vue     = require('vendor/vue');

  require('component/common');
  require('component/card');
  require('component/row');

  Vue.component('planet-summary', {
    props: ['planet', 'mini'],
    computed: {
      desc:     function() {return this.planet.desc.split('|')},
      isThere:  function() {return this.planet.body === game.locus},
      distance: function() {return this.planet.distance(game.locus) / Physics.AU},
      kind:     function() {return this.planet.kind},
      faction:  function() {return this.planet.faction.full_name},
    },
    template: `
<div>
  <def y=1 v-if="isThere" term="Location" def="Docked" />
  <def y=1 v-else term="Distance" :def="distance|R(2)|csn|unit('AU')" />

  <def y=1 term="Environ" :def="kind|caps" />
  <def y=1 term="Faction" :def="faction|caps" />
  <def y=1 term="Economy" :def="planet.size|caps" />

  <def y=1 term="Details">
    <row y=0 slot="def" v-if="planet.traits.length">
      <cell y=0 class="col-sm-6 font-italic" v-for="trait in planet.traits" :key="trait.name">{{trait.name|caps}}</cell>
    </row>
    <span v-else slot="def">N/A</span>
  </def>

  <card v-if="!mini" class="my-3">
    <card-text v-for="(line, idx) of desc" :key="idx" class="font-italic">{{line}}</card-text>
  </card>
</div>
    `,
  });
});
