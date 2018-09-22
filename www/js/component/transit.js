define(function(require, exports, module) {
  const Npc     = require('npc');
  const Ship    = require('ship');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');
  const Layout  = require('layout');

  require('component/common');
  require('component/card');
  require('component/combat');
  require('component/navcomp');

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
        layout:     new Layout,
      };
    },
    computed: {
      destination: function() {
        return system.name(this.plan.dest);
      },

      fov: function() {
        return this.plan.au;
      },

      ship_x: function() {
        return this.layout.scale_x(this.plan.coords[0]);
      },

      ship_y: function() {
        return this.layout.scale_y(this.plan.coords[1]);
      },

      transit_center: function() {
        return Physics.centroid(this.plan.start, this.plan.end);
      },

      transit_path: function() {
        return this.layout.scale_path(
          this.plan.path
            .map(p => p.position)
        );
      },

      target_path() {
        return this.layout.scale_path(
          system.orbit_by_turns(this.plan.dest)
            .slice(0, this.plan.turns)
        );
      },

      batch_size() {
        return Math.ceil(this.plan.turns / 200);
      },
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
            const turns = Math.max(1, Math.min(this.batch_size, this.plan.left));
            game.turn(turns, true);
            this.plan.turn(turns);
            //game.player.ship.burn(this.plan.accel);

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
<card nopad=1>
  <card-header slot="header">
    Transiting from {{plan.origin|caps}} to {{plan.dest|caps}}
    <btn v-if="paused" @click="resume">Resume</btn>
    <btn v-else @click="pause">Pause</btn>
  </card-header>

  <NavMapPlot v-show="!inspection" :layout.sync="layout" :focus="plan.dest" :center="transit_center" :fov="fov">
    <span class="float-left m-2 text-success">{{daysLeft|R|unit('days')}}</span>
    <span class="float-left m-2 text-info">{{distance|R(1)|unit('AU')}}</span>
    <span class="float-left m-2 text-danger">{{plan.accel|R(2)|unit('G')}}</span>
    <span class="float-left m-2 text-warning">{{(velocity/1000)|R|csn|unit('km/s')}}</span>

    <NavMapPoint :top="ship_y" :left="ship_x" class="text-success">
      &#9660;
    </NavMapPoint>

    <NavMapPoint
        v-for="(p, idx) in transit_path"
        :class="{'text-dark': idx <= plan.currentTurn, 'text-muted': idx > plan.currentTurn}"
        :key="'transit-' + idx"
        :left="p[0]"
        :top="p[1]">
      <span class="tiny">&sdot;</span>
    </NavMapPoint>

    <NavMapPoint
        v-for="(p, idx) in target_path"
        :class="{'text-dark': idx <= plan.currentTurn, 'text-warning': idx > plan.currentTurn}"
        :key="'target-' + idx"
        :left="p[0]"
        :top="p[1]">
      <span class="tiny">&sdot;</span>
    </NavMapPoint>

  </NavMapPlot>

  <transit-inspection
    v-if="inspection"
    @done="schedule"
    :body="inspection.body"
    :faction="inspection.faction"
    :distance="inspection.distance"
    class="my-3" />
</card>
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
