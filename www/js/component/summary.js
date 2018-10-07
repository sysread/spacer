define(function(require, exports, module) {
  const Physics = require('physics');
  const Vue     = require('vendor/vue');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/row');

  Vue.component('planet-summary', {
    props: ['planet', 'mini'],

    computed: {
      desc()     { return this.planet.desc.split('|')                            },
      isThere()  { return this.planet.body === this.game.locus                   },
      distance() { return this.planet.distance(this.game.locus) / Physics.AU     },
      kind()     { return this.planet.kind                                       },
      faction()  { return this.planet.faction.full_name                          },
      standing() { return this.game.player.getStandingLabel(this.planet.faction) },
      img()      { return 'img/' + this.planet.body + '.png'                     },

      img_css() {
        return `
          background-image:    url("${this.img}");
          background-repeat:   no-repeat;
          background-position: top right;
          background-size:     100px 100px;
          height:              100px;
          width:               100px;
          opacity:             0.5;
          color:               black;
          position:            fixed;
          top:                 auto;
          right:               54px;
        `
      },
    },

    methods: {
      is_hostile()   { return this.game.player.hasStandingOrLower(this.faction, 'Untrusted') },
      is_dubious()   { return this.game.player.hasStandingOrLower(this.faction, 'Dubious')   },
      is_respected() { return this.game.player.hasStanding(this.faction, 'Respected') },
    },

    template: `
<div>
  <div :style="img_css"></div>

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

  <def y=1 term="Standing">
    Your standing with this faction is
      <span v-if="is_hostile" class="text-success">{{standing|lower}}.</span>
      <span v-else-if="is_dubious" class="text-warning">{{standing|lower}}.</span>
      <span v-else-if="is_respected" class="text-danger" >{{standing|lower}}.</span>
      <span v-else>{{standing|lower}}.</span>
  </def>

  <card v-if="!mini" class="my-3">
    <card-text v-for="(line, idx) of desc" :key="idx" class="font-italic">{{line}}</card-text>
  </card>
</div>
    `,
  });
});
