<template>
<div>
  <div class="row">
    <div :style="img_css"></div>

    <Section :notitle="!showtitle" :title="planet.name" class="col-12 col-md-6">
      <template #title-pre><Flag v-if="showtitle" :faction="planet.faction.abbrev" :width="50" class="m-1" /></template>
      <template #title-post><img v-if="showtitle && is_home" :src="'img/home.png'" class="circle-thingy circle-thingy-big mx-2 float-end" /></template>

      <def y=1 v-if="isThere" term="Location" def="Docked" />
      <def y=1 v-else term="Distance" :def="$unit($csn($R(distance, 2)), 'AU')" />

      <def y=1 term="Faction" :def="$caps(faction)" />

      <def y=1 term="Standing">
        Your standing with this faction is <span :class="standing_color_class">{{$lower(standing)}}</span>
      </def>

      <def y=1 term="Economy" :def="$caps(planet.size)" />
      <def y=1 term="Environ" :def="$caps(kind)" />

      <def y=1 term="Details">
        <template #def>
          <template v-if="traits">
            <div v-for="trait in traits" :key="trait" class="fst-italic">
              {{$caps(trait)}}
            </div>
          </template>
          <span v-else>N/A</span>
        </template>
      </def>
    </Section>

    <div class="col-12 col-md-6">
      <Section title="Local news"><News :body="planet.body" /></Section>

      <Section v-if="!mini" :title="'About ' + planet.name">
        <p v-for="(line, idx) of desc" :key="idx" class="fst-italic">{{line}}</p>
      </Section>
    </div>
  </div>
</div>
</template>

<script>
import Physics from '../physics';

export default {
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
        opacity:             0.3;
        position:            fixed;
        top:                 120px;
        right:               60px;
        z-index:             0;
        pointer-events:      none;
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
};
</script>
