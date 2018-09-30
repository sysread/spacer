define(function(require, exports, module) {
  const Npc     = require('npc');
  const Ship    = require('ship');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');
  const util    = require('util');
  const Layout  = require('layout');
  const model   = require('model');

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/combat');
  require('component/navcomp');

  require('vendor/TweenMax.min');


  Vue.component('transit', {
    props: ['plan'],

    data() {
      return {
        paused:        false,
        timer:         null,
        stoppedBy:     {'pirate': 0},
        encounter:     null,
        daysLeft:      null,
        layout:        null,
        ship_inserted: false,
      };
    },

    mounted() {
      this.$nextTick(this.schedule);
    },

    watch: {
      ship_pos() {
        this.set_position();
      },
    },

    computed: {
      encounter_possible() {
        return this.plan.velocity <= this.data.max_encounter_velocity;
      },

      ship_pos() {
        if (this.layout) {
          return this.layout.scale_point(this.plan.coords);
        }

        return [0, 0];
      },

      destination() {
        return this.system.name(this.plan.dest);
      },

      compression() {
        return Math.sin( Math.PI * Math.max(this.plan.currentTurn, 1) / this.plan.turns );
      },

      nearest_skip() {
        const skip = {};
        skip[this.plan.dest] = true;
        skip[this.plan.origin] = true;
        if (this.system.central(this.plan.dest) != 'sun') skip[this.system.central(this.plan.dest)] = true;
        if (this.system.central(this.plan.origin) != 'sun') skip[this.system.central(this.plan.origin)] = true;
        return skip;
      },

      nearest_body() {
        const skip = this.nearest_skip;
        const ranges = this.system.ranges(this.plan.end);

        const nearest = Object.keys(ranges)
          .filter(b => !skip[b] && (this.system.central(b) == 'sun' || !skip[this.system.central(b)]))
          .reduce((a, b) => ranges[a] > ranges[b] ? b : a);

        return nearest;
      },

      center_point() {
        return Physics.centroid(
          this.plan.start,
          this.plan.end,
          this.system.position(this.nearest_body),
        );
      },

      fov() {
        const c = this.center_point;

        const d = Math.max(
          Physics.distance(this.plan.start, c),
          Physics.distance(this.plan.end, c),
          Physics.distance(this.system.position(this.nearest_body), c),
        );

        return d / Physics.AU * 1.1;
      },

      interval() {
        const intvl = 300 - Math.ceil(300 * this.compression);
        return util.clamp(intvl, 100, 300);
      },
    },

    methods: {
      set_position(inserted) {
        if (this.$refs.ship && this.layout) {
          const time = this.ship_inserted ? 0.5 : 0;

          TweenLite.to(this.$refs.ship, time, {
            'x': this.ship_pos[0],
            'y': this.ship_pos[1],
            'ease': Power0.easeNone,
          }).play();

          if (!this.ship_inserted) {
            this.ship_inserted = true;
          }
        }
      },

      pause() {
        this.paused = true;
      },

      resume() {
        this.paused = false;
        this.timer = this.schedule();
      },

      schedule() {
        this.daysLeft = Math.floor(this.plan.left * this.data.hours_per_turn / 24);
        this.distance = util.R(this.plan.auRemaining(), 2);
        window.setTimeout(() => { this.turn() }, this.interval);
      },

      turn() {
        if (this.plan.left > 0) {
          if (this.game.player.ship.isDestroyed) {
            this.game.open('newgame');
          }
          if (this.encounter) {
            return;
          }
          else if (this.inspectionChance()) {
            return;
          }
          else if (this.piracyChance()) {
            return;
          }
          else {
            this.game.turn(1, true);
            this.plan.turn(1);
            this.game.player.ship.burn(this.plan.accel);

            if (this.paused) {
              window.clearTimeout(this.timer);
              this.timer = null;
              return;
            }
            else {
              this.$forceUpdate();
              this.timer = this.schedule();
            }
          }
        }
        else {
          window.clearTimeout(this.timer);
          this.timer = null;
          $('#spacer').data({data: null});
          this.game.transit(this.plan.dest);
          this.game.open('summary');
        }
      },

      complete_encounter() {
        this.encounter = null;
        this.timer = this.schedule();
      },

      nearby() {
        const ranges = this.system.ranges(this.plan.coords);
        const bodies = {};

        for (const body of Object.keys(ranges)) {
          const au = ranges[body] / Physics.AU;
          bodies[body] = ranges[body];
        }

        return bodies;
      },

      inspectionChance() {
        if (!this.encounter_possible) {
          return;
        }

        const ranges = this.nearby();

        for (const body of Object.keys(ranges)) {
          if (ranges[body] / Physics.AU > this.data.jurisdiction) {
            continue;
          }

          const km = Math.floor(ranges[body] / 1000);

          if (this.game.planets[body].inspectionChance(km)) {
            const faction = this.data.bodies[body].faction;

            if (this.stoppedBy[faction]) {
              continue;
            }
            else {
              const dist = util.R(Physics.distance(this.plan.coords, this.system.position(body)) / Physics.AU, 3);
              this.stoppedBy[faction] = true;
              this.encounter = {
                type:     'inspection',
                body:     body,
                faction:  this.data.bodies[body].faction,
                distance: dist,
              };

              return true;
            }
          }
        }

        return false;
      },

      piracyChance() {
        if (!this.encounter_possible) {
          return;
        }

        let chance = 0.05;

        const ranges = this.nearby();

        for (const body of Object.keys(ranges)) {
          const au = ranges[body] / Physics.AU;
          const pct = this.data.jurisdiction / au;
          const patrol = this.game.planets[body].faction.patrol * pct;
          chance -= patrol;
        }

        if (chance > 0) {
          const rand = Math.random();

          if (rand < chance) {
            ++this.stoppedBy.pirate;
            this.encounter = {type: 'pirate'};
            return true;
          }
        }

        return false;
      },
    },

    template: `
      <card nopad=1>
        <card-header slot="header">
          Transiting to {{plan.dest|caps}}
          <btn v-if="paused" @click="resume">Resume</btn>
          <btn v-else @click="pause">Pause</btn>
        </card-header>

        <div class="row" style="font-size:0.8rem">
          <span class="col-2">Arrival</span>
          <span class="col-2">{{plan.days_left|unit('days')}}</span>
          <span class="col-2">Distance</span>
          <span class="col-2">{{plan.auRemaining()|R(2)|unit('AU')}}</span>
          <span class="col-2">Velocity</span>
          <span class="col-2">{{plan.velocity/1000|R|csn|unit('km/s')}}</span>
        </div>

        <NavPlot v-show="!encounter"
                 :layout.sync="layout"
                 :center="center_point"
                 :fov="fov"
                 :focus="plan.dest"
                 :transit="plan">

          <text slot="svg"
                ref="ship"
                v-if="layout"
                text-anchor="middle"
                alignment-baseline="middle"
                style="fill:yellow; font:16px monospace;">
            &tridot;
          </text>

        </NavPlot>

        <transit-inspection
            v-if="encounter && encounter.type == 'inspection'"
            @done="complete_encounter"
            :body="encounter.body"
            :faction="encounter.faction"
            :distance="encounter.distance"
            class="my-3" />

        <PirateEncounter
            v-if="encounter && encounter.type == 'pirate'"
            @done="complete_encounter"
            class="my-3" />

      </card>
    `,
  });

  Vue.component('transit-inspection', {
    props: ['faction', 'body', 'distance'],

    data() {
      // TODO more (any) randomness in ship and loadout, customizations based
      // on faction and scale of origin body
      const ship = new Ship({
        type: util.oneOf(['schooner', 'corvette', 'cruiser']),
        addons: ['railgun_turret', 'pds'],
      });

      for (let i = 0; i < ship.hardpoints && i < 3; ++i) {
        let addon;
        while (!addon || ship.hasAddOn(addon)) {
          addon = util.oneOf(['light_torpedo', 'medium_torpedo', 'ecm']);
        }

        ship.installAddOn(addon);
      }

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
      planet()         { return this.game.planets[this.body]                    },
      bribeAmount()    { return Math.ceil(this.game.player.ship.price() * 0.03) },
      canAffordBribe() { return this.bribeAmount <= this.game.player.money      },

      hasContraband() {
        for (const item of Object.keys(this.data.resources)) {
          if (this.data.resources[item].contraband) {
            if (this.game.player.ship.cargo.get(item) > 0) {
              return true;
            }
          }
        }

        return false;
      },

      isHostile() {
        return this.game.player.hasStandingOrLower('Untrusted');
      },
    },

    methods: {
      setChoice(choice) {
        if (choice == 'attack') {
          this.game.player.setStanding(this.standing, -50);
        }

        this.choice = choice || 'ready';
      },

      submit() {
        let fine = 0;
        for (const item of this.game.player.ship.cargo.keys) {
          const amt = this.game.player.ship.cargo.count(item);
          if (this.data.resources[item].contraband) {
            fine += amt * this.planet.inspectionFine();
          }
        }

        this.fine = Math.min(fine, this.game.player.money);

        if (this.fine > 0) {
          this.game.player.debit(this.fine);

          for (const [item, amt] of this.game.player.ship.cargo.entries()) {
            if (amt > 0 && this.data.resources[item].contraband) {
              this.game.player.ship.cargo.dec(item, amt);
              this.game.player.decStanding(this.faction, this.data.resources[item].contraband);
            }
          }

          this.setChoice('submit-fined');
        }
        else {
          this.setChoice('submit-done');
        }
      },

      bribe() {
        this.game.player.debit(this.bribeAmount);
        this.game.player.decStanding(this.faction, 3);
        this.done();
      },

      flee() {
        $('#spacer').data({state: null, data: null});
        window.localStorage.removeItem('game');
        this.game.open('newgame');
      },

      done(result) {
        if (result == 'surrendered') {
          this.submit();
        }
        else {
          this.choice = 'ready';
          this.$emit('done');
        }
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
    <template v-if="isHostile">
      The police do not seem convinced and assure you that they <i>will</i> catch you the next time around.
    </template>
    <template v-else>
      The police apologize for the inconvenience and send you on your way.
    </template>
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


  Vue.component('PirateEncounter', {
    props: [],

    data() {
      const faction = util.oneOf(['UN', 'MC', 'CERES', 'JFT', 'TRANSA']);

      const ship = new Ship({
        type: util.oneOf(['schooner', 'corvette', 'neptune']),
        addons: ['railgun_turret'],
      });

      for (let i = 0; i < ship.hardpoints && i < 4; ++i) {
        let addon;
        while (!addon || ship.hasAddOn(addon)) {
          addon = util.oneOf(['light_torpedo', 'pds', 'ecm', 'stealthPlating']);
        }

        ship.installAddOn(addon);
      }

      return {
        npc: new Npc({
          name:    'Pirate',
          faction: faction,
          ship:    ship,
        }),

        choice: 'ready',
        took: null,
      };
    },

    methods: {
      setChoice(choice) {
        this.choice = choice || 'ready';

        if (this.choice == 'submit-yes') {
          this.took = this.plunder();
        }
      },

      plunder() {
        const value  = (item) => model.resources[item].value;
        const player = this.game.player.ship;
        const npc    = this.npc.ship;
        const took   = {};

        while (!npc.holdIsFull && !player.holdIsEmpty) {
          const items = player.cargo.keys.filter(a => player.cargo.get(a) > 0);

          items.sort((a, b) => {
            const va = value(a);
            const vb = value(b);
            if (va > vb) {
              return -1;
            } else if (vb > va) {
              return 1;
            } else {
              return 0;
            }
          });

          player.unloadCargo(items[0], 1);
          npc.loadCargo(items[0], 1);

          if (!took[items[0]]) {
            took[items[0]] = 0;
          }

          ++took[items[0]];
        }

        return took;
      },

      done(result) {
        if (result == 'surrendered') {
          this.setChoice('submit-yes');
        }
        else {
          this.choice = 'ready';
          this.$emit('done');
        }
      },
    },

    template: `
      <card title="Pirate">
        <div v-if="choice=='ready'">
          <card-text>
            The lights go dim as an emergency klaxxon warns you that your ship has been
            targeted by an incoming pirate <b class="text-warning">{{npc.ship.type|caps}}</b>.

            Before long, the radio begins to chirp, notifying you of the pirate's ultimatum.
          </card-text>

          <button type="button" class="btn btn-dark btn-block" @click="setChoice('submit')">Surrender your ship</button>
          <button type="button" class="btn btn-dark btn-block" @click="setChoice('attack')">Defend yourself</button>
        </div>

        <melee v-if="choice=='attack'" :opponent="npc" @complete="done" />

        <ask v-if="choice=='submit'" @pick="setChoice" :choices="{'submit-yes': 'I am certain', 'ready': 'Nevermind'}">
          If you surrender to the pirates, they will help themselves to your
          cargo, but probably spare your life. Are you certain you wish to
          do this?
        </ask>

        <ok v-if="choice=='submit-yes'" @ok="done">
          Armed pirates board your ship, roughing you and your crew up while
          they take anything of value they can fit aboard their ship. Forcing
          you to help with the loading, the pirates plunder your ship's hold.

          <ul>
            <li v-for="(count, item) of took">
              {{count}} {{item}}
            </li>
          </ul>
        </ok>
      </card>
    `,
  });
});
