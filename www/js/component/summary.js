"use strict"

define(function(require, exports, module) {
  const Physics = require('physics');
  const Vue     = require('vue');

  require('component/global');
  require('component/common');
  require('component/row');
  require('component/news');


  Vue.component('Flag', {
    props: ['faction', 'width'],

    computed: {
      path() { return 'img/flag-' + this.faction.toLowerCase() + '.png' },

      css() {
        return {
          'width': this.width + 'px',
          'border': '1px solid #333',
        };
      },
    },

    template: `
      <img :src="path" :style="css" />
    `,
  });


  Vue.component('Flag-Bg', {
    props: ['faction', 'top', 'right', 'width'],

    computed: {
      path() { return 'img/flag-' + this.faction.toLowerCase() + '.png' },

      css() {
        const top    = 62 + (this.top || 0);   // status bar is 47.62px + 15px body padding
        const right  = 31 + (this.right || 0); // 15px body padding, 16px card padding
        const width  = this.width || 100;
        const height = width * 0.625;

        return `
          background-image:    url("${this.path}");
          background-repeat:   no-repeat;
          background-position: center;
          background-size:     ${width}px ${height}px;
          width:               ${width + 2}px;
          height:              ${height + 2}px;
          opacity:             1.0;
          background-color:    #333;
          position:            fixed;
          top:                 ${top}px;
          right:               ${right}px;
        `
      },
    },

    template: `
      <div :style="css"></div>
    `,
  });


  Vue.component('SummaryPage', {
    computed: {
      planet() { return this.game.here },
    },

    template: `
      <planet-summary :planet="planet" showtitle=1 />
    `,
  });


  Vue.component('planet-summary', {
    props: ['planet', 'mini', 'showtitle'],

    computed: {
      is_home()      { return this.planet.body == this.game.player.home },
      desc()         { return this.planet.desc.split('|') },
      isThere()      { return this.planet.body === this.game.locus },
      distance()     { return this.planet.distance(this.game.locus) / Physics.AU },
      kind()         { return this.planet.kind },
      faction()      { return this.planet.faction.full_name },
      faction_abbr() { return this.planet.faction.abbrev },
      standing()     { return this.game.player.getStandingLabel(this.faction_abbr) },
      is_hostile()   { return this.game.player.hasStandingOrLower(this.faction_abbr, 'Untrusted') },
      is_dubious()   { return this.game.player.hasStandingOrLower(this.faction_abbr, 'Dubious') },
      is_neutral()   { return this.game.player.hasStandingOrLower(this.faction_abbr, 'Neutral') },
      is_friendly()  { return this.game.player.hasStanding(this.faction_abbr, 'Friendly') },
      img()          { return 'img/' + this.planet.body + '.png' },
      traits()       { return this.planet.traits.map(t => t.name).sort() },

      img_css() {
        return `
          background-image:    url("${this.img}");
          background-repeat:   no-repeat;
          background-position: top right;
          background-size:     200px 200px;
          height:              200px;
          width:               200px;
          opacity:             0.5;
          color:               black;
          position:            fixed;
          top:                 120px;
          right:               60px;
        `
      },

      standing_color_class() {
        return this.is_hostile  ? 'text-danger'
             : this.is_dubious  ? 'text-warning'
             : this.is_neutral  ? 'text-secondary'
             : this.is_friendly ? 'text-success'
                                : '';
      },
    },

    template: `
<div>
  <div class="row">
    <div :style="img_css"></div>

    <Section :notitle="!showtitle" :title="planet.name" class="col-12 col-md-6">
      <Flag slot="title-pre" v-if="showtitle" :faction="planet.faction.abbrev" :width="50" class="m-1" />
      <img slot="title-post" v-if="showtitle && is_home" src="img/home.png" class="circle-thingy circle-thingy-big mx-2 float-right" />

      <def y=1 v-if="isThere" term="Location" def="Docked" />
      <def y=1 v-else term="Distance" :def="distance|R(2)|csn|unit('AU')" />

      <def y=1 term="Faction" :def="faction|caps" />

      <def y=1 term="Standing">
        Your standing with this faction is <span :class="standing_color_class">{{standing|lower}}</span>
      </def>

      <def y=1 term="Economy" :def="planet.size|caps" />
      <def y=1 term="Environ" :def="kind|caps" />

      <def y=1 term="Details">
        <div slot="def" v-if="traits" v-for="trait in traits" :key="trait" class="font-italic">
          {{trait|caps}}
        </div>
        <span v-else slot="def">N/A</span>
      </def>
    </Section>

    <div class="col-12 col-md-6">
      <News :body="planet.body" title="Local news" />

      <Section v-if="!mini" :title="'About ' + planet.name">
        <div v-for="(line, idx) of desc" :key="idx" class="font-italic">{{line}}</div>
      </Section>
    </div>
  </div>
</div>
    `,
  });
});
