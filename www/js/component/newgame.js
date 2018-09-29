define(function(require, exports, module) {
  const Person = require('person');
  const Ship   = require('ship');
  const Vue    = require('vendor/vue');
  const util   = require('util');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/row');

  Vue.component('new-game', {
    data: function() {
      return {
        name:          'Marco Solo',
        home:          'mars',
        starting:      false,
        turnsComplete: 0,
      };
    },
    computed: {
      bodies:      function() { return this.data.bodies },
      body:        function() { return this.bodies[this.home] },
      faction:     function() { return this.data.factions[this.body.faction] },
      gravity:     function() { return this.system.gravity(this.home) },
      deltaV:      function() { return this.gravity * this.data.grav_deltav_factor },
      homeDesc:    function() { return this.body.desc.split('|') },
      factionDesc: function() { return this.faction.desc.split('|') },
      startTurns:  function() { return this.data.initial_days * 24 / this.data.hours_per_turn },
      step:        function() { return Math.ceil(this.startTurns / 25) },
      percent:     function() { return Math.min(100, Math.floor((this.turnsComplete / this.startTurns) * 100)) },
      display:     function() { return this.percent + '%' },
    },
    methods: {
      startGame: function() {
        this.starting = true;

        $('#spacer-nav').data('in-transit', true);

        const ship = this.data.initial_ship;

        const me = new Person({
          name:    this.name,
          home:    this.home,
          faction: this.body.faction,
          ship:    new Ship({type: ship}),
          money:   1000,
        });

        this.game.new_game(me, this.home);
        this.game.freeze = true;

        let timer; timer = window.setInterval(() => {
          if (this.turnsComplete < this.startTurns) {
            const count = Math.min(this.startTurns - this.turnsComplete, this.step);
            this.turnsComplete += count;
            this.game.turn(count);
            this.$nextTick(this.$forceUpdate);
          }
          else {
            this.game.freeze = false;
            this.game.refresh();
            window.clearInterval(timer);
            this.$nextTick(() => this.game.open('summary'));
          }
        }, 500);
      },
    },
    template: `
<div class="container container-fluid">
  <card v-if="starting" title="Starting game">
    <progress-bar :percent="percent">{{display}}</progress-bar>
  </card>

  <card v-else>
    <card-header slot="header">
      <h3>
        New Game
        <btn @click="startGame">Start game</btn>
      </h3>
    </card-header>

    <form>
      <div class="form-group">
        <label for="name">Captain's name</label>
        <input class="form-control" type="text" v-model="name" />
      </div>

      <div class="form-group">
        <label for="home">Home</label>
        <select class="form-control" v-model="home">
          <option v-for="(body, id) of bodies" :key="id" :value="id">{{body.name}}</option>
        </select>
      </div>

      <card class="my-3">
        <card-text v-for="line of homeDesc" :key="line" class="font-italic">{{line}}</card-text>
      </card>

      <card class="my-3">
        <card-text class="text-warning font-italic">
          As a native growing up under {{gravity|R(3)|unit('G')}} of gravity,
          your physiology can tolerate a maximum sustained acceleration of
          {{deltaV|R(3)|unit('G')}}.
        </card-text>
      </card>

      <div class="form-group">
        <label for="faction">Faction</label>
        <input class="form-control" type="text" :value="faction.full_name" readonly>
      </div>

      <card class="my-3">
        <card-text v-for="line of factionDesc" :key="line" class="font-italic">{{line}}</card-text>
      </card>
    </form>
  </card>
</div>
    `,
  });
});
