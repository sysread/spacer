define(function(require, exports, module) {
  const Npc     = require('npc');
  const Ship    = require('ship');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');

  require('component/common');
  require('component/card');
  require('component/combat');

  Vue.component('transit', {
    props: ['plan'],
    data: function() {
      return {
        paused:     false,
        timer:      this.schedule(),
        stoppedBy:  {},
        inspection: null,
        daysLeft:   null,
        velocity:   0,
      };
    },
    computed: {
      destination: function() { return system.name(this.plan.dest) },
    },
    methods: {
      pause: function() {
        this.paused = true;
      },

      resume: function() {
        this.paused = false;
        this.timer = this.schedule();
      },

      schedule: function() {
        this.inspection = null;
        this.velocity = this.plan.velocity;
        this.daysLeft = Math.floor(this.plan.left * data.hours_per_turn / 24);
        this.distance = util.R(this.plan.auRemaining(), 2);
        return window.setTimeout(() => { this.turn() }, 75);
      },

      turn: function() {
        if (this.plan.left > 0) {
          if (this.inspectionChance()) {
            return;
          }
          else {
            game.turn(1, true);
            game.player.ship.burn(this.plan.accel);
            this.plan.turn();

            if (this.paused) {
              window.clearTimeout(this.timer);
              this.timer = null;
            }
            else {
              this.timer = this.schedule();
            }
          }
        }
        else {
          window.clearTimeout(this.timer);
          this.timer = null;
          $('#spacer').data({state: null, data: null});
          game.transit(this.plan.dest);
          game.open('summary');
        }
      },

      nearby: function() {
        const ranges = system.ranges(this.plan.coords);
        const bodies = {};

        for (const body of Object.keys(ranges)) {
          const au = ranges[body] / Physics.AU;

          if (au <= data.jurisdiction) {
            bodies[body] = ranges[body];
          }
        }

        return bodies;
      },

      inspectionChance: function() {
        if (this.plan.velocity >= 750000)
          return;

        const ranges = this.nearby();

        for (const body of Object.keys(ranges)) {
          const km = Math.floor(ranges[body] / 1000);

          if (game.planets[body].inspectionChance(km)) {
            const faction = data.bodies[body].faction;

            if (this.stoppedBy[faction]) {
              continue;
            }
            else {
              const dist = util.R(Physics.distance(this.plan.coords, system.position(body)) / Physics.AU, 3);
              this.stoppedBy[faction] = true;
              this.inspection = {
                body:     body,
                faction:  data.bodies[body].faction,
                distance: dist,
              };

              return true;
            }
          }
        }

        return false;
      },
    },
    template: `
<div class="p-0 m-0">
  <card>
    <card-header slot="header">
      Transiting from {{plan.origin|caps}} to {{plan.dest|caps}}
      <btn v-if="paused" @click="resume">Resume</btn>
      <btn v-else @click="pause">Pause</btn>
    </card-header>

    <row v-show="!inspection" class="p-0 m-0">
      <cell size=4 brkpt="sm" y=0>
        <table class="transit-detail table table-sm my-2">
          <tr>
            <th scope="col">Time</th>
            <td>{{daysLeft|R|unit('days')}}</td>
            <th scope="col">Distance</th>
            <td>{{distance|R(1)|unit('AU')}}</td>
          </tr>
          <tr>
            <th scope="col">Status</th>
            <td>{{plan.pct_complete < 50 ? 'Accelerating' : 'Decelerating'}} at {{plan.accel|R(2)|unit('G')}}</td>
            <th scope="col">Speed</th>
            <td>{{(velocity/1000)|R|csn|unit('km/s')}}</td>
          </tr>
        </table>
      </cell>
      <cell size=8 brkpt="sm" y=0 class="p-0 m-0">
        <plot :controls="false" :plan="plan" :focus="plan.coords" />
      </cell>
    </row>

    <transit-inspection
      v-if="inspection"
      @done="schedule"
      :body="inspection.body"
      :faction="inspection.faction"
      :distance="inspection.distance"
      class="my-3"
    />
  </card>
</div>
    `,
  });

  Vue.component('transit-inspection', {
    props: ['faction', 'body', 'distance'],
    data: function() {
      // TODO more (any) randomness in ship and loadout, customizations based
      // on faction and scale of origin body
      const ship = new Ship({
        type: util.oneOf(['corvette', 'frigate', 'destroyer']),
        addons: ['railgun_turret', 'light_torpedo', 'pds', 'ecm'],
      });

      return {
        npc: new Npc({
          name:    'Police Patrol',
          faction: this.faction,
          ship:    ship,
        }),
        choice: 'ready',
        fine: 0,
      };
    },
    computed: {
      planet: function() { return game.planets[this.body] },
      bribeAmount: function() { return Math.ceil(game.player.ship.price() * 0.03) },
      canAffordBribe: function() { return this.bribeAmount <= game.player.money },

      hasContraband: function() {
        for (const item of Object.keys(data.resources)) {
          if (data.resources[item].contraband) {
            if (game.player.ship.cargo.get(item) > 0) {
              return true;
            }
          }
        }

        return false;
      },
    },
    methods: {
      setChoice(choice) {
        this.choice = choice || 'ready';
      },

      submit: function() {
        let fine = 0;
        for (const item of game.player.ship.cargo.keys) {
          const amt = game.player.ship.cargo.count(item);
          if (data.resources[item].contraband) {
            fine += amt * this.planet.inspectionFine();
          }
        }

        this.fine = Math.min(fine, game.player.money);

        if (this.fine > 0) {
          game.player.debit(this.fine);

          for (const [item, amt] of game.player.ship.cargo.entries()) {
            if (amt > 0 && data.resources[item].contraband) {
              game.player.ship.cargo.dec(item, amt);
              game.player.decStanding(this.faction, data.resources[item].contraband);
            }
          }

          this.setChoice('submit-fined');
        }
        else {
          this.setChoice('submit-done');
        }
      },

      bribe: function() {
        game.player.debit(this.bribeAmount);
        this.done();
      },

      flee: function() {
        $('#spacer').data({state: null, data: null});
        window.localStorage.removeItem('game');
        game.open('newgame');
      },

      done: function() {
        this.choice = 'ready';
        this.$emit('done');
      },
   },
    template: `
<card :title="'Police inspection: ' + faction">
  <div v-if="choice=='ready'">
    <card-text>
      You have been hailed by a {{faction}} patrol ship operating {{distance}} AU
      out of {{body|caps}}. The captain orders you to cease acceleration and
      peacefully submit to an inspection.
    </card-text>

    <button type="button" class="btn btn-dark btn-block" @click="submit">Submit</button>
    <button type="button" class="btn btn-dark btn-block" @click="setChoice('bribe')">Bribe</button>
    <button type="button" class="btn btn-dark btn-block" @click="setChoice('flee')">Flee</button>
    <button type="button" class="btn btn-dark btn-block" @click="setChoice('attack-confirm')">Attack</button>
  </div>

  <ok v-if="choice=='submit-fined'" @ok="done">
    Your contraband cargo was found and confiscated.
    You have been fined {{fine|csn}} credits.
    Your reputation with {{faction}} has taken a serious hit.
  </ok>
  <ok v-if="choice=='submit-done'" @ok="done">
    No contraband was found.
    The police apologize for the inconvenience and send you on your way.
  </ok>

  <ask v-if="choice=='bribe'" @pick="setChoice" :choices="{'bribe-yes': 'Yes, it is my duty as a fellow captain', 'ready': 'No, that would be dishonest'}">
    After a bit of subtle back and forth, the patrol's captain intimates that they could use {{bribeAmount|csn}} for "repairs to their tracking systems".
    While making said repairs, they might miss a ship like yours passing by.
    Do you wish to contribute to the captain's maintenance efforts?
  </ask>
  <ok v-if="choice=='bribe-yes' && !canAffordBribe" @ok="setChoice(null)">
    You cannot do not have enough money to bribe this officer.
  </ok>
  <ok v-if="choice=='bribe-yes' && canAffordBribe" @ok="bribe">
    The, uh, "contribution" has been debited from your account. You are free to go.
  </ok>

  <ask v-if="choice=='flee'" @pick="setChoice" :choices="{'ready': 'Oh well', 'flee-run': 'Run for Proxima'}" class="text-warning">
    This isn't the an action movie.
    The captain of the patrol ship can read the navigation and tracking data as well as you and will eventually overtake your ship.
    That is, unless you are planning to make a run for Proxima...
  </ask>
  <ok v-if="choice=='flee-run'" @ok="flee" class="text-danger">
    You angle away and gun the engines.
    In just a 5 short years, your navigation computer flips the ship on automatic and begins the deceleration burn.
    Your corpse and those of your crew arrive at Proxima Centauri after perhaps 10 years, relativistic effects notwithstanding.
  </ok>

  <ask v-if="choice=='attack-confirm'" @pick="setChoice" :choices="{'attack': 'Yes', 'ready': 'No'}">
    Are you sure you wish to attack the police?
    <span v-if="!hasContraband">You are not carrying any contraband.</span>
  </ask>

  <melee v-if="choice=='attack'" :opponent="npc" @complete="done" />
</card>
    `,
  });
});
