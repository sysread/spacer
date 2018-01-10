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
        info:    false,
        route:   null,
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

      /* Trip planner */
      tripPlace:       function(){ return Game.game.place(this.opened) },
      tripDestination: function(){ return system.name(this.opened) },
      tripFastest:     function(){ return this.navComp.fastest(this.opened) },
      tripRoutes:      function(){ return this.navComp.transits[this.opened] },
      tripRoute:       function(){ return this.tripRoutes[this.route] },
      tripPlan:        function(){ return this.tripRoute.transit },
      tripDistance:    function(){ return `${Math.round(this.tripPlan.au * 100) / 100} AU (${util.csn(Math.round(this.tripPlan.km))} km)`},
      tripFlipPoint:   function(){ return `${Math.round((this.tripPlan.au / 2) * 100) / 100} AU (${util.csn(Math.round(this.tripPlan.km / 2))} km)`},
      tripMaxVelocity: function(){ return util.csn(util.R(this.tripPlan.maxVelocity / 1000)) + ' km/s' },
      tripFuel:        function(){ return (Math.round(this.tripRoute.fuel * 100) / 100) + ' tonnes (est)' },
      tripTime:        function(){ return `${util.csn(this.tripPlan.days_hours[0])} days, ${util.csn(this.tripPlan.days_hours[1])} hours` },
      tripDeltaV:      function(){
        const g = Math.round(this.tripPlan.accel / Physics.G * 1000) / 1000;
        return g === 0 ? '< 0.001 G' : g + ' G';
      },
    },
    methods: {
      hasRoute: function(place) {
        return this.navComp.transits[place].length > 0;
      },
      openPlot: function() {
        Game.open('plot');
      },
      beginTransit: function() {
        $('#spacer').data('info', this.tripPlan);
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
    :disabled="hasRoute(body)"
    :key="body"
    :place="body"
    :has_route="hasRoute(body)"
    :opened.sync="opened"
    @update:opened="route = tripFastest.index" />

  <modal v-if="opened" :title="tripDestination" close="Cancel" @close="opened = null; info = false">
    <button slot="header" @click="info = !info" type="button" class="btn btn-dark float-right">Info</button>
    <button slot="footer" v-if="hasRoute(opened)" @click="beginTransit()" data-dismiss="modal" type="button" class="btn btn-secondary">Engage</button>

    <place-summary v-if="info" mini=true :place="tripPlace" class="my-4" />

    <div v-if="hasRoute(opened)">
      <def term="Total"        :def="tripDistance" />
      <def term="Flip point"   :def="tripFlipPoint" />
      <def term="Acceleration" :def="tripDeltaV" />
      <def term="Max velocity" :def="tripMaxVelocity" />
      <def term="Fuel"         :def="tripFuel" />
      <def term="Time"         :def="tripTime" />

      <slider minmax=true step="1" min="0" :max="tripRoutes.length - 1" :value.sync="route" />
    </div>
    <div v-else>
      Your ship, as loaded, cannot reach this destination in less than 1 year with available fuel.
    </div>
  </modal>
</card>
    `,
  });

  Vue.component('nav-dest', {
    props: ['place', 'has_route'],
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
      <span v-if="!has_route" class="badge badge-pill float-right">UNREACHABLE</span>
    </button>
  </div>

  <div class="row col-12 col-sm-6 py-2">
    <div class="col-6 mute">{{dist}} AU</div>
    <div class="col-6 mute">{{faction}}</div>
  </div>
</div>
    `,
  });
});
