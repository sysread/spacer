define(function(require, exports, module) {
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const util    = require('util');
  const system  = require('system');
  const Physics = require('physics');
  const Game    = require('game');
  const NavComp = require('navcomp');

  require('component/card');
  require('component/modal');
  require('component/exchange');
  require('component/summary');

  Vue.component('nav-list', {
    data: function() {
      return {
        opened:  null,
        navComp: new NavComp,
      };
    },
    computed: {
      /* Introductory text */
      playerHome:        function(){ return data.bodies[Game.game.player.home].name },
      playerHomeGravity: function(){ return data.bodies[Game.game.player.home].gravity },
      playerDeltaV:      function(){ return util.R(Game.game.player.maxAcceleration() / Physics.G, 3) },
      shipDeltaV:        function(){ return util.R(Game.game.player.shipAcceleration() / Physics.G, 3) },
      shipMass:          function(){ return util.csn(util.R(Game.game.player.ship.currentMass())) },
      shipFuelMass:      function(){ return util.R(Game.game.player.ship.fuel, 3) },
      shipBurnTime:      function(){ return Game.game.player.ship.maxBurnTime() * data.hours_per_turn },
      systemBodies:      function(){ return system.bodies() },
      playerLocus:       function(){ return Game.game.locus },
    },
    methods: {
      openPlot: function() {
        Game.open('plot');
      },
      beginTransit: function(body, selected) {
        $('#spacer').data('info', this.navComp.transits[body][selected].transit);
        this.opened = null;
        $('.modal-backdrop').remove(); // TODO make this less hacky
        Game.open('transit');
        $('#spacer').data('state', 'transit');
      },
    },
    template: `
<card>
  <card-header slot="header">
    <h3>Navigation</h3>
    <button @click="openPlot()" type="button" class="btn btn-dark btn-sm float-right ml-2">Map</button>
  </card-header>

  <card-text>Your navigational computer automatically calculates the optimal trajectory from your current location to the other settlements in the system.</card-text>
  <card-text>Being born on {{playerHome}}, your body is adapted to {{playerHomeGravity}}G, allowing you to endure a sustained burn of {{playerDeltaV}}G.</card-text>
  <card-text>Your ship is capable of {{shipDeltaV}}Gs of acceleration with her current load out ({{shipMass}} metric tonnes). With {{shipFuelMass}} tonnes of fuel, your ship has a maximum burn time of {{shipBurnTime}} hours at maximum thrust.</card-text>

  <nav-dest
    v-for="body of systemBodies"
    v-if="body !== playerLocus"
    :key="body"
    :place="body"
    :opened.sync="opened" />

  <nav-plan v-if="opened" @engage="beginTransit" @close="opened=null" :body="opened" :navcomp="navComp" />
</card>
    `,
  });

  Vue.component('nav-dest', {
    props: ['place'],
    computed: {
      name:    function(){ return system.short_name(this.place) },
      faction: function(){ return system.faction(this.place) },
      kind:    function(){ return system.kind(this.place) },
      type:    function(){ return system.type(this.place) },
      isMoon:  function(){ return this.type === 'moon' },
      dist:    function(){
        let au = Math.round(system.distance(Game.game.locus, this.place) / Physics.AU * 100) / 100;
        return (au < 0.01) ? '< 0.01' : au;
      },
    },
    template: `
<div class="row">
  <div class="col col-sm-6 py-2">
    <button @click="$emit('update:opened', place)" type="button" class="btn btn-dark btn-block text-left">
      {{name}}
      <span v-if="isMoon" class="badge badge-pill float-right">{{kind}}</span>
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
        info:     false,
      };
    },
    computed: {
      hasRoute:    function(){ return this.routes.length > 0 },
      place:       function(){ return Game.game.place(this.body) },
      destination: function(){ return system.name(this.body) },
      route:       function(){ if (this.hasRoute) return this.routes[this.selected] },
      plan:        function(){ if (this.hasRoute) return this.route.transit },
      distance:    function(){ if (this.hasRoute) return `${Math.round(this.plan.au * 100) / 100} AU (${util.csn(Math.round(this.plan.km))} km)`},
      flipPoint:   function(){ if (this.hasRoute) return `${Math.round((this.plan.au / 2) * 100) / 100} AU (${util.csn(Math.round(this.plan.km / 2))} km)`},
      maxVelocity: function(){ if (this.hasRoute) return util.csn(util.R(this.plan.maxVelocity / 1000)) + ' km/s' },
      fuel:        function(){ if (this.hasRoute) return (Math.round(this.route.fuel * 100) / 100) + ' tonnes (est)' },
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
  <button slot="header" @click="info = !info" type="button" class="btn btn-dark float-right">Info</button>
  <button slot="footer" v-if="hasRoute" @click="$emit('engage', body, selected)" data-dismiss="modal" type="button" class="btn btn-dark">Engage</button>

  <place-summary v-if="info" mini=true :place="place" class="my-4" />

  <div v-if="hasRoute">
    <def term="Total"        :def="distance" />
    <def term="Flip point"   :def="flipPoint" />
    <def term="Acceleration" :def="deltaV" />
    <def term="Max velocity" :def="maxVelocity" />
    <def term="Fuel"         :def="fuel" />
    <def term="Time"         :def="time" />

    <slider minmax=true step="1" min="0" :max="routes.length - 1" :value.sync="selected" />
  </div>
  <div v-else>
    Your ship, as loaded, cannot reach this destination in less than 1 year with available fuel.
  </div>
</modal>
    `,
  });
});
