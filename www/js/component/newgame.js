define(function(require, exports, module) {
  const Game   = require('game');
  const Person = require('person');
  const Ship   = require('ship');
  const Vue    = require('vendor/vue');
  const data   = require('data');
  const system = require('system');
  const util   = require('util');

  require('component/common');
  require('component/card');
  require('component/row');

  Vue.component('new-game', {
    data: function() {
      return {
        name:     'Marco Solo',
        home:     'mars',
        starting: false,
        percent:  0,
        display:  null,
      };
    },
    computed: {
      bodies:      function() { return data.bodies },
      body:        function() { return this.bodies[this.home] },
      faction:     function() { return data.factions[this.body.faction] },
      gravity:     function() { return system.gravity(this.home) },
      deltaV:      function() { return this.gravity * data.grav_deltav_factor },
      homeDesc:    function() { return this.body.desc.split('|') },
      factionDesc: function() { return this.faction.desc.split('|') },
    },
    methods: {
      startGame: function() {
        this.starting = true;

        $('#spacer-nav').data('in-transit', true);

        const ship = data.initial_ship;

        const me = new Person({
          name:    this.name,
          home:    this.home,
          faction: this.body.faction,
          ship:    new Ship({type: ship}),
          money:   1000,
        });

        game.new_game(me, this.home);

        const turns = data.initial_days * 24 / data.hours_per_turn;
        const step = Math.ceil(turns / 25);
        let done = 0;
        let timer;

        const interval = () => {
          if (done < turns) {
            const count = Math.min(turns - done, step);
            const pct = Math.floor((done / turns) * 100);
            done += count;
            game.turn(count);
            this.percent = pct;
            this.display = pct + '%';
            timer = window.setTimeout(interval, 200);
          }
          else {
            this.percent = 100;
            this.display = '100% - Done!';
            game.refresh();
            $('#spacer-nav').data('in-transit', false);
            window.setTimeout(() => {game.open('summary')}, 100);
          }
        };

        timer = window.setTimeout(interval, 50);
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
