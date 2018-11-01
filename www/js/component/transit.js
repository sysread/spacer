define(function(require, exports, module) {
  const NPC     = require('npc');
  const Ship    = require('ship');
  const Physics = require('physics');
  const Vue     = require('vendor/vue');
  const data    = require('data');
  const util    = require('util');
  const Layout  = require('layout');
  const model   = require('model');
  const intvl   = 0.3;
  const turns_per_day = 24 / data.hours_per_turn;

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/combat');
  require('component/navcomp');

  require('vendor/TweenMax.min');

  Vue.component('transit', {
    mixins: [ Layout.LayoutMixin ],

    data() {
      return {
        layout_target_id: 'transit-plot-root',
        timeline:  null,
        building:  false,
        paused:    false,
        stoppedBy: {'pirate': 0, 'police': 0},
        encounter: null,
      };
    },

    computed: {
      intvl()        { return intvl },
      plan()         { return this.game.transit_plan },
      destination()  { return this.system.name(this.plan.dest) },
      current_turn() { return this.plan.currentTurn },
      daysLeft()     { return Math.floor(this.plan.left * this.data.hours_per_turn / 24) },
      percent()      { return this.plan.pct_complete },
      distance()     { return util.R(this.plan.auRemaining()) },

      fov() {
        let center = this.center;
        const points = [];

        const dest_central = this.system.central(this.plan.dest);
        const orig_central = this.system.central(this.plan.origin);

        // Moon to moon in same system
        if (dest_central == orig_central && dest_central != 'sun') {
          for (const body of this.system.bodies()) {
            if (this.system.central(body) == dest_central) {
              points.push(this.system.position(body));
            }
          }
        }
        // Planet to its own moon
        else if (this.plan.origin == dest_central) {
          for (const body of this.system.bodies()) {
            if (this.system.central(body) == dest_central) {
              points.push(this.system.position(body));
            }
          }
        }
        // Moon to it's host planet
        else if (this.plan.dest == orig_central) {
          for (const body of this.system.bodies()) {
            if (this.system.central(body) == orig_central) {
              points.push(this.system.position(body));
            }
          }
        }
        // Cross system path
        else {
          points.push(this.plan.end);
          points.push(this.plan.start);
        }

        const max = Math.max(...points.map(p => Physics.distance(p, center)));
        return max / Physics.AU * 1.2;
      },

      center() {
        let center;

        const dest_central = this.system.central(this.plan.dest);
        const orig_central = this.system.central(this.plan.origin);
        const bodies = [];

        // Moon to moon in same system
        if (dest_central == orig_central && dest_central != 'sun') {
          bodies.push(this.system.position(dest_central));
        }
        // Planet to its own moon
        else if (this.game.locus == dest_central) {
          bodies.push(this.system.position(this.plan.origin));
        }
        // Moon to it's host planet
        else if (this.plan.dest == orig_central) {
          bodies.push(this.system.position(this.plan.dest));
        }
        // Cross system path
        else {
          bodies.push(this.system.position(this.plan.dest));
          bodies.push(this.system.position(this.plan.origin));
        }

        bodies.push(this.plan.flip_point);
        bodies.push(this.plan.start);
        bodies.push(this.plan.end);

        return Physics.centroid(...bodies);
      },

      bodies() {
        // Build list of planetary bodies to show
        const bodies = {};
        for (const body of this.system.bodies()) {
          const central = this.system.central(body);

          if (central != 'sun') {
            bodies[central] = true;
          }

          bodies[body] = true;
        }

        return Object.keys(bodies);
      },
    },

    methods: {
      dead()          { this.$emit('open', 'newgame') },
      layout_set()    { this.build_timeline()         },
      layout_resize() { this.rebuild_timeline()       },

      rebuild_timeline() {
        const paused = this.paused;

        if (!this.building) {
          this.pause();

          if (this.timeline) {
            this.timeline.kill();
            this.timeline = null;
          }

          // Execute in next tick to allow timeline to terminate
          this.$nextTick(() => {
            this.build_timeline();

            if (!paused) {
              this.resume();
            }
          });
        }
      },

      build_timeline() {
        if (!this.$refs.sun)  return;
        if (!this.$refs.ship) return;
        for (const body of this.bodies) {
          if (!this.$refs[body]) {
            return;
          }
        }

        this.building = true;

        this.layout.set_center(this.center);
        this.layout.set_fov_au(this.fov);

        const timeline = new TimelineLite;

        const timelines = {
          sun:  new TimelineLite,
          ship: new TimelineLite({
            onComplete: () => {
              this.$nextTick(() => {
                this.game.arrive();
                this.game.unfreeze();
                this.game.save_game();
                this.game.refresh();
                this.$emit('open', 'summary');
              });
            },
          }),
        };

        const orbits = {};
        for (const body of this.bodies) {
          orbits[body]= this.system.orbit_by_turns(body);
          timelines[body] = new TimelineLite;
        }

        for (let turn = this.plan.currentTurn; turn < this.plan.turns; ++turn) {
          // On the first turn, do not animate transition to starting location
          const time = turn == this.plan.currentTurn ? 0 : this.intvl;

          if (turn == this.plan.currentTurn || turn % turns_per_day == 0 || turn == this.plan.turns - 1) {
            const mark = 'mark-' + turn;

            // Update sun
            const [sun_x, sun_y] = this.layout.scale_point([0, 0]);
            const sun_d = this.layout.scale_body_diameter('sun');
            timelines.sun.to(this.$refs.sun, time, {
              x:      sun_x,
              y:      sun_y,
              height: sun_d,
              width:  sun_d,
              ease:   Power0.easeNone,
            });

            // Update planets
            for (const body of this.bodies) {
              const [x, y] = this.layout.scale_point(orbits[body][turn]);
              const d = this.layout.scale_body_diameter(body);

              timelines[body].add(mark);

              timelines[body].to(this.$refs[body], time * turns_per_day, {
                x:      x,
                y:      y,
                height: d,
                width:  d,
                ease:   Power0.easeNone,
              }, mark);

              timelines[body].to(this.$refs[body + '_label'], time * turns_per_day, {
                x: x + 10,
                y: y + (d / 3),
                ease: Power0.easeNone,
              }, mark);
            }
          }

          // Update ship
          const [ship_x, ship_y] = this.layout.scale_point(this.plan.path[turn].position);
          timelines.ship.to(this.$refs.ship, time, {
            x:    ship_x,
            y:    ship_y,
            ease: Power0.easeNone,

            onComplete: () => {
              if (this.paused || this.encounter) {
                if (!timeline.paused()) {
                  timeline.pause();
                }

                return;
              }

              this.$nextTick(() => this.turn());
            },
          });
        }

        for (const tl of Object.values(timelines)) {
          timeline.add(tl, 0);
        }

        this.building = false;
        this.timeline = timeline;

        return timeline;
      },

      bg_css() {
        return {
          width:  this.layout ? this.layout.width_px  + 'px' : '100%',
          height: this.layout ? this.layout.height_px + 'px' : '100%',
        };
      },

      show_plot() {
        if ($(this.$refs.plot).width() < 300) {
          return false;
        }

        if (this.encounter) {
          return false;
        }

        return true;
      },

      show_label(body) {
        const central = this.system.central(body);

        if (this.plan.dest == body && central == 'sun') {
          return true;
        }

        const position = this.system.position(body);
        const center   = central == 'sun' ? [0, 0] : this.system.position(central);
        const distance = Physics.distance(position, center) / Physics.AU;
        return distance > this.layout.fov_au / 5;
      },

      pause() {
        this.paused = true;
        this.timeline.pause();
      },

      resume() {
        this.paused = false;
        this.timeline.resume();
      },

      turn() {
        if (this.game.player.ship.isDestroyed) {
          this.$emit('open', 'newgame');
        }

        if (this.encounter) {
          return;
        }

        if (this.current_turn % 3 == 0) {
          if (this.inspectionChance()) {
            return;
          }
          else if (this.piracyChance()) {
            return;
          }
        }

        this.game.turn(1, true);
        this.plan.turn(1);
        this.game.player.ship.burn(this.plan.accel);
      },

      complete_encounter() {
        this.encounter = null;

        if (!this.paused) {
          this.resume();
        }
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

      inspectionChancePct() {
        const ranges = this.nearby();
        let total = 0;
        let count = 0;

        for (const body of Object.keys(ranges)) {
          const faction = this.data.bodies[body].faction;
          const au = ranges[body] / Physics.AU;

          if (au > this.data.jurisdiction) {
            continue;
          }

          let chance = this.game.planets[body].inspectionRate(au)
                     - this.game.player.ship.stealth;

          if (this.plan.velocity > 1000) {
            chance -= Math.log(this.plan.velocity / 1000) / 300;
          }

          chance /= 1 + (this.stoppedBy[faction] || 0);
          chance = util.clamp(chance, 0, data.max_patrol_rate);

          total += chance;
          ++count;
        }

        return total / count;
      },

      inspectionChance() {
        const ranges = this.nearby();

        for (const body of Object.keys(ranges)) {
          const faction = this.data.bodies[body].faction;
          const au = ranges[body] / Physics.AU;

          if (au > this.data.jurisdiction) {
            continue;
          }

          let chance = this.game.planets[body].inspectionRate(au)
                     - this.game.player.ship.stealth;

          if (this.plan.velocity > 1000) {
            chance -= Math.log(this.plan.velocity / 1000) / 300;
          }

          chance /= 1 + this.stoppedBy.police;
          chance = util.clamp(chance, 0, data.max_patrol_rate);

          if (chance > 0) {
            if (Math.random() <= chance) {
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
        }

        return false;
      },

      piracyChancePct() {
        let chance = this.data.default_piracy_rate
                   - this.game.player.ship.stealth;

        const ranges = this.nearby();

        for (const body of Object.keys(ranges)) {
          const au = ranges[body] / Physics.AU;
          const rate = this.game.planets[body].inspectionRate(au, true);
          chance -= rate;
        }

        return Math.max(chance, 0);
      },

      piracyChance() {
        let chance = this.piracyChancePct();
        let speed_bonus = 0;

        if (this.plan.velocity > 1000) {
           speed_bonus = Math.log(this.plan.velocity / 1000) / 200;
        }

        chance -= speed_bonus;
        chance /= 1 + this.stoppedBy.pirate;

        if (chance > 0) {
          if (Math.random() <= chance) {
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
        <table class="table table-sm m-0" :style="{width: show_plot() && layout ? layout.width_px + 'px' : '100%'}">
          <tr>
            <td class="text-left">{{plan.days_left|unit('days')}}</td>
            <td class="text-center">{{plan.velocity/1000|R|csn|unit('km/s')}}</td>
            <td class="text-right">{{plan.auRemaining()|R(2)|sprintf('%0.2f')|unit('AU')}}</td>
          </tr>
          <tr v-if="!show_plot()">
            <td colspan="3">
              <progress-bar width=100 :percent="percent" :frame_rate="intvl" />
            </td>
          </tr>
        </table>

        <div v-layout ref="plot" v-show="show_plot()" id="transit-plot-root" :style="layout_css_dimensions" class="plot-root border border-dark">
          <div class="plot-root-bg" :style="bg_css()"></div>

          <SvgPlot :layout="layout" v-if="layout">
            <text style="fill:red;font:12px monospace" x=5 y=17>
                FoV: {{layout.fov_au|R(4)|unit('AU')}}
              | Piracy: {{piracyChancePct() * 100|R(2)}}%
              | Patrol: {{inspectionChancePct() * 100|R(2)}}%
            </text>

            <image ref="sun" xlink:href="img/sun.png" />

            <g v-for="body of bodies" :key="body">
              <image :ref="body" :xlink:href="'img/' + body + '.png'" />
              <text :ref="body + '_label'" v-show="show_label(body)" style="font:12px monospace; fill:#EEEEEE;">
                {{body|caps}}
              </text>
            </g>

            <text ref="ship" text-anchor="middle" alignment-baseline="middle" style="fill:yellow; font:12px monospace;">
              &tridot;
            </text>
          </SvgPlot>
        </div>

        <transit-inspection
            v-if="encounter && encounter.type == 'inspection'"
            @done="complete_encounter"
            @dead="dead"
            :body="encounter.body"
            :faction="encounter.faction"
            :distance="encounter.distance"
            class="my-3" />

        <PirateEncounter
            v-if="encounter && encounter.type == 'pirate'"
            @done="complete_encounter"
            @dead="dead"
            class="my-3" />

      </card>
    `,
  });

  Vue.component('transit-inspection', {
    props: ['faction', 'body', 'distance'],

    data() {
      return {
        choice: 'ready',
        init_flee: false,
        fine: 0,

        npc: new NPC({
          name:    'Police Patrol',
          faction: this.faction,
          options: {
            ship:          ['schooner', 'corvette', 'cruiser', 'battleship', 'barsoom', 'neptune'],
            addons:        ['armor', 'railgun_turret', 'light_torpedo', 'medium_torpedo', 'ecm'],
            always_addons: ['pds'],
            min_addons:    3,
          },
        }),
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
        return this.game.player.hasStandingOrLower(this.faction, 'Untrusted');
      },
    },

    methods: {
      setChoice(choice) {
        if (choice == 'flee') {
          this.init_flee = true;
          choice = 'attack';
        }

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

      done(result) {
        if (result == 'destroyed') {
          this.$emit('dead');
        }
        else if (result == 'surrendered') {
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

    <btn block=1 @click="submit">Submit</btn>
    <btn block=1 @click="setChoice('bribe')">Bribe</btn>
    <btn block=1 @click="setChoice('flee-confirm')">Flee</btn>
    <btn block=1 @click="setChoice('attack-confirm')">Attack</btn>
  </div>

  <ask v-if="choice=='flee-confirm'" @pick="setChoice" :choices="{'flee': 'Yes', 'ready': 'Nevermind'}">
    Are you sure you wish to flee from the police?
    <span v-if="!hasContraband">You are not carrying any contraband.</span>
  </ask>

  <div v-if="choice=='submit-fined'">
    Your contraband cargo was found and confiscated.
    You have been fined {{fine|csn}} credits.
    Your reputation with {{faction}} has taken a serious hit.
    <btn block=1 @click="done">Ok</btn>
  </div>
  <div v-if="choice=='submit-done'">
    No contraband was found.
    <template v-if="isHostile">
      The police do not seem convinced and assure you that they <i>will</i> catch you the next time around.
    </template>
    <template v-else>
      The police apologize for the inconvenience and send you on your way.
    </template>
    <btn block=1 @click="done" class="my-2">Ok</btn>
  </div>

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

  <ask v-if="choice=='attack-confirm'" @pick="setChoice" :choices="{'attack': 'Yes', 'ready': 'Nevermind'}">
    Are you sure you wish to attack the police?
    <span v-if="!hasContraband">You are not carrying any contraband.</span>
  </ask>

  <melee v-if="choice=='attack'" :opponent="npc" :init_flee="init_flee" @complete="done" />
</card>
    `,
  });


  Vue.component('PirateEncounter', {
    data() {
      const faction = util.oneOf(['UN', 'MC', 'CERES', 'JFT', 'TRANSA']);

      return {
        choice: 'ready',
        took: null,
        init_flee: false,

        npc: new NPC({
          name:    'Pirate',
          faction: faction,
          options: {
            ship:       ['schooner', 'corvette', 'neptune'],
            addons:     ['railgun_turret', 'pds', 'light_torpedo', 'ecm', 'armor'],
            min_addons: 2,
          },
        }),
      };
    },

    methods: {
      setChoice(choice) {
        if (choice == 'flee') {
          this.init_flee = true;
          choice = 'attack';
        }

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
        if (result == 'destroyed') {
          this.$emit('dead');
        }
        else if (result == 'player-surrendered') {
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
            Its transponder is off, but its make and markings suggest that it is aligned
            with {{npc.faction.abbrev}}... of course, the ship may have been stolen.

            Before long, the radio begins to chirp, notifying you of the pirate's ultimatum.
          </card-text>

          <button type="button" class="btn btn-dark btn-block" @click="setChoice('flee')">Flee</button>
          <button type="button" class="btn btn-dark btn-block" @click="setChoice('submit')">Surrender ship</button>
          <button type="button" class="btn btn-dark btn-block" @click="setChoice('attack')">Defend yourself</button>
        </div>

        <melee v-if="choice=='attack'" :opponent="npc" :init_flee="init_flee" @complete="done" />

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
