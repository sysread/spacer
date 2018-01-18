define(function(require, exports, module) {
  const Game    = require('game');
  const Npc     = require('npc');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');

  require('component/common');
  require('component/card');

  Vue.component('transit-inspection', {
    props: ['faction', 'body', 'distance'],
    data: function() {
      return {
        npc: new Npc({
          label:     'Police Patrol',
          faction:   this.faction,
          shipClass: util.oneOf(['corvette', 'frigate', 'destroyer'])
        }),
        choice: 'ready',
      };
    },
    computed: {
      bribeAmount: function() { return Math.ceil(Game.game.player.ship.price() * 0.03) },
      canAffordBribe: function() { return this.bribeAmount <= Game.game.player.money },

      fine: function() {
        let fine = 0;

        for (const [item, amt] of Game.game.player.ship.cargo.entries()) {
          if (amt > 0 && data.resources[item].contraband) {
            fine += amt * 100 * data.resources[item].contraband;
          }
        }

        if (fine > 0) {
          fine = Math.min(fine, Game.game.player.money);
        }

        return fine;
      },
    },
    methods: {
      setChoice(choice) {
        this.choice = choice || 'ready';
      },

      submit: function() {
        if (this.fine > 0) {
          for (const [item, amt] of Game.game.player.ship.cargo.entries()) {
            if (amt > 0 && data.resources[item].contraband) {
              Game.game.player.ship.cargo.set(item, 0);
              Game.game.player.decStanding(this.faction, data.resources[item].contraband);
            }
          }

          Game.game.player.debit(this.fine);
          this.setChoice('submit-fined');
        }
        else {
          this.setChoice('submit-done');
        }
      },

      bribe: function() {
        Game.game.player.debit(this.bribeAmount);
        this.done();
      },

      flee: function() {
        $('#spacer').data({state: null, data: null});
        window.localStorage.removeItem('game');
        Game.open('newgame');
      },

      done: function() {
        this.choice = 'ready';
        this.$emit('done');
      },
   },
    template: `
<card title="Police inspection" :subtitle="faction">
  <card-text>
    You have been hailed by a {{faction}} patrol ship operating {{distance}} AU
    out of {{body|caps}}. The captain orders you to cease acceleration and
    peacefully submit to an inspection.
  </card-text>

  <button type="button" class="btn btn-dark btn-block" @click="submit">Submit</button>
  <button type="button" class="btn btn-dark btn-block" @click="setChoice('bribe')">Bribe</button>
  <button type="button" class="btn btn-dark btn-block" @click="setChoice('flee')">Flee</button>

  <ok v-if="choice=='submit-fined'" @ok="done">
    Your contraband cargo was found and confiscated.
    You have been fined {{fine|csn}} credits.
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
</card>
    `,
  });

  Vue.component('transit', {
    props: ['plan'],
    data: function() {
      return {
        timer:      this.schedule(),
        stoppedBy:  {},
        inspection: null,
      };
    },
    computed: {
      destination: function() { return system.name(this.plan.dest) },
      progress:    function() { return util.R(this.plan.pct_complete) },
      velocity:    function() { return util.csn(util.R(this.plan.velocity / 1000)) },
      distance:    function() { return util.R(this.plan.auRemaining(), 2) },
      status:      function() { return (this.progress > 50 ? 'Decelerating' : 'Accelerating') + ': ' + this.velocity + ' km/s' },
      display:     function() { return (this.distance < 0.25) ? util.csn(util.R(this.plan.distanceRemaining())) + ' km' : this.distance + ' AU' },
    },
    methods: {
      schedule: function() {
        this.inspection = null;
        return window.setTimeout(() => { this.turn() }, 100);
      },

      turn: function() {
        if (this.plan.left > 0) {
          if (this.inspectionChance()) {
            return;
          }
          else {
            const count = Math.min(this.plan.left, 48 / data.hours_per_turn);
            Game.game.turn(count);

            for (let i = 0; i < count; ++i) {
              Game.game.player.ship.burn(this.plan.accel);
              this.plan.turn();
            }

            this.timer = this.schedule();
          }
        }
        else {
          window.clearTimeout(this.timer);
          this.timer = null;
          $('#spacer').data({state: null, data: null});
          Game.game.transit(this.plan.dest);
          Game.open('summary');
        }
      },

      inspectionChance: function() {
        if (this.plan.velocity >= 750000)
          return;

        const ranges = system.ranges(this.plan.coords);

        for (const body of Object.keys(ranges)) {
          const au = ranges[body] / Physics.AU;

          if (au < 0.25) {
            const faction = data.bodies[body].faction;
            const patrol  = data.factions[faction].patrol;
            const scale   = data.scales[data.bodies[body].size];
            const adjust  = faction === Game.game.player.faction ? 0.5 : 1.0;
            const freq    = (1 - (Math.max(0.01, au) / 0.25)) * patrol * scale * adjust;
            const roll    = Math.random();

            if (roll <= freq) {
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
        }

        return false;
      },
    },
    template: `
<card :title="'Transit to ' + destination" :subtitle="status">
  <progress-bar :percent="progress" :display="display" />
  <transit-inspection v-if="inspection" @done="schedule" :body="inspection.body" :faction="inspection.faction" :distance="inspection.distance" />
</card>
    `,
  });
});
