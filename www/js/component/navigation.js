define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const util    = require('util');
  const system  = require('system');
  const Physics = require('physics');
  const NavComp = require('navcomp');

  require('component/common');
  require('component/card');
  require('component/modal');
  require('component/exchange');
  require('component/summary');
  require('component/commerce');

  Vue.component('nav-list', {
    data: function() {
      return {
        opened:  null,
        navComp: new NavComp,
      };
    },
    computed: {
      /* Introductory text */
      player:            function(){ return game.player },
      playerDeltaV:      function(){ return util.R(game.player.maxAcceleration() / Physics.G, 3) },
      shipDeltaV:        function(){ return util.R(game.player.shipAcceleration() / Physics.G, 3) },
      shipMass:          function(){ return util.csn(util.R(game.player.ship.currentMass())) },
      shipFuelMass:      function(){ return util.R(game.player.ship.fuel, 3) },
      shipBurnTime:      function(){ return game.player.ship.maxBurnTime() * data.hours_per_turn },
      systemBodies:      function(){ return system.bodies() },
      playerLocus:       function(){ return game.locus },
    },
    methods: {
      openPlot: function() { game.open('plot') },
      beginTransit: function(body, selected) {
        $('#spacer').data('info', this.navComp.transits[body][selected].transit);
        this.opened = null;
        $('.modal-backdrop').remove(); // TODO make this less hacky
        game.open('transit');
        $('#spacer').data('state', 'transit');
      },
    },
    template: `
<card>
  <card-header slot="header">
    <h3>
      Navigation
      <btn @click="openPlot()">Map</btn>
    </h3>
  </card-header>

  <card-text>Your navigational computer automatically calculates the optimal trajectory from your current location to the other settlements in the system.</card-text>
  <card-text>Being born on {{player.home.name}}, your body is adapted to {{player.home.gravity}}G, allowing you to endure a sustained burn of {{playerDeltaV}}G.</card-text>
  <card-text>Your ship is capable of {{shipDeltaV}}Gs of acceleration with her current load out ({{shipMass}} metric tonnes). With {{shipFuelMass}} tonnes of fuel, your ship has a maximum burn time of {{shipBurnTime}} hours at maximum thrust.</card-text>

  <nav-dest
    v-for="body of systemBodies"
    v-if="body !== playerLocus"
    :key="body"
    :planet="body"
    :opened.sync="opened" />

  <nav-plan v-if="opened" @engage="beginTransit" @close="opened=null" :body="opened" :navcomp="navComp" />
</card>
    `,
  });

  Vue.component('nav-dest', {
    props: ['planet', 'disabled'],
    computed: {
      name:    function(){ return system.short_name(this.planet) },
      faction: function(){ return system.faction(this.planet) },
      kind:    function(){ return system.kind(this.planet) },
      type:    function(){ return system.type(this.planet) },
      isMoon:  function(){ return this.type === 'moon' },
      dist:    function(){
        let au = Math.round(system.distance(game.locus, this.planet) / Physics.AU * 100) / 100;
        return (au < 0.01) ? '< 0.01' : au;
      },
    },
    template: `
<div class="row">
  <div class="col col-sm-6 py-2">
    <button
      @click="$emit('update:opened', planet)"
      type="button"
      class="btn btn-dark btn-block text-left"
      :class="{'btn-dark': !disabled, 'disabled': disabled}">
      {{name}}
      <span class="badge badge-pill float-right">
        <span v-if="isMoon">{{kind}} |</span>
        {{faction}}
      </span>
    </button>
  </div>

  <div class="row col-12 col-sm-6 py-2">
    <div class="col-6 mute">{{dist}} AU</div>
    <div class="col-6 mute">{{faction}}</div>
  </div>
</div>
    `,
  });

  Vue.component('nav-plan', {
    props: ['body', 'navcomp'],
    data: function() {
      const fastest = this.navcomp.fastest(this.body);
      return {
        routes:   this.navcomp.transits[this.body],
        selected: fastest ? fastest.index : 0,
        info:     this.body === game.locus,
        market:   false,
      };
    },
    computed: {
      isRemote:    function(){ return this.body !== game.locus },
      hasRoute:    function(){ return this.routes.length > 0 },
      planet:      function(){ return game.planets[this.body] },
      destination: function(){ return this.planet.name },
      route:       function(){ if (this.hasRoute) return this.routes[this.selected] },
      plan:        function(){ if (this.hasRoute) return this.route.transit },
      distance:    function(){ if (this.hasRoute) return `${Math.round(this.plan.au * 100) / 100} AU (${util.csn(Math.round(this.plan.km))} km)`},
      flipPoint:   function(){ if (this.hasRoute) return `${Math.round((this.plan.au / 2) * 100) / 100} AU (${util.csn(Math.round(this.plan.km / 2))} km)`},
      maxVelocity: function(){ if (this.hasRoute) return util.csn(util.R(this.plan.maxVelocity / 1000)) + ' km/s' },
      fuel:        function(){ if (this.hasRoute) return util.R(this.route.fuel, 2) + ' tonnes (est)' },
      time:        function(){ if (this.hasRoute) return `${util.csn(this.plan.days_hours[0])} days, ${util.csn(this.plan.days_hours[1])} hours` },
      deltaV:      function(){
        if (this.hasRoute) {
          const g = Math.round(this.plan.accel / Physics.G * 1000) / 1000;
          return g === 0 ? '< 0.001 G' : g + ' G';
        }
      },
    },
    template: `
<modal @close="$emit('close')" :title="destination" close="Cancel">
  <div slot="header" class="float-right">
    <div class="input-group">
      <span v-if="isRemote" class="input-group-btn"><btn @click="market=false;info=false">&#8982;</btn></span>
      <span class="input-group-btn"><btn @click="market=false;info=!info">?</btn></span>
      <span class="input-group-btn"><btn @click="info=false;market=!market">$</btn></span>
    </div>
  </div>

  <btn slot="footer" v-if="hasRoute" @click="$emit('engage', body, selected)" close=1>
    Engage
  </btn>

  <planet-summary v-if="info" mini=true :planet="planet" />
  <market-report v-if="market" :body="body" />

  <div v-if="!market && !info">
    <div v-if="hasRoute">
      <def split="4" term="Total"        :def="distance" />
      <def split="4" term="Flip point"   :def="flipPoint" />
      <def split="4" term="Acceleration" :def="deltaV" />
      <def split="4" term="Max velocity" :def="maxVelocity" />
      <def split="4" term="Fuel"         :def="fuel" />
      <def split="4" term="Time"         :def="time" />

      <row y=1>
        <cell size=12>
          <slider minmax=true step="1" min="0" :max="routes.length - 1" :value.sync="selected" />
        </cell>
      </row>
    </div>
    <p v-else class="text-warning font-italic">
      Your ship, as loaded, cannot reach this destination in less than 1 year with available fuel.
    </p>
  </div>
</modal>
    `,
  });
});
