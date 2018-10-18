define(function(require, exports, module) {
  const Npc     = require('npc');
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
        stoppedBy: {'pirate': 0},
        encounter: null,
      };
    },

    computed: {
      intvl()              { return intvl },
      plan()               { return $('#spacer').data().info },
      encounter_possible() { return this.plan.velocity <= this.data.max_encounter_velocity },
      destination()        { return this.system.name(this.plan.dest) },
      current_turn()       { return this.plan.currentTurn },
      daysLeft()           { return Math.floor(this.plan.left * this.data.hours_per_turn / 24) },
      percent()            { return this.plan.pct_complete },
      distance()           { return util.R(this.plan.auRemaining()) },

      fov() {
        const fov = Math.max(
          Physics.distance([0, 0], this.plan.start),
          Physics.distance([0, 0], this.plan.end),
        ) / Physics.AU;

        return fov * 0.75;
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
        if (!this.building) {
          this.pause();

          if (this.timeline) {
            this.timeline.kill();
            this.timeline = null;
          }

          // Execute in next tick to allow timeline to terminate
          this.$nextTick(() => {
            this.build_timeline();
            this.resume();
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

        const center = Physics.centroid(
          this.plan.start,
          this.plan.end,
          [0, 0],
        );

        const fov = 0.5 + Math.max(
          Physics.distance(this.plan.start, center),
          Physics.distance(this.plan.end, center),
          Physics.distance([0, 0], center),
        ) / Physics.AU;

        this.layout.set_center(center);
        this.layout.set_fov_au(fov);

        const timeline = new TimelineLite;

        const timelines = {
          sun:  new TimelineLite,
          ship: new TimelineLite({
            onComplete: () => {
              this.$nextTick(() => {
                $('#spacer').data({data: null});
                this.game.transit(this.plan.dest);
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

          if (turn == 0 || turn % turns_per_day == 0 || turn == this.plan.turns - 1) {
            const mark = 'mark-' + turn;

            // Update sun
            const [sun_x, sun_y] = this.layout.scale_point([0, 0]);
            const sun_d = this.diameter('sun');
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
              const d = this.diameter(body);

              timelines[body].add(mark);

              timelines[body].to(this.$refs[body], time * turns_per_day, {
                x:      x,
                y:      y,
                height: d,
                width:  d,
                ease:   Power0.easeNone,
              }, mark);

              timelines[body].to(this.$refs[body + '_label'], time * turns_per_day, {
                x: x + (d / 2) + 10,
                y: y + (d / 2),
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

      show_plot() {
        if ($(this.$refs.plot).width() < 300) {
          return false;
        }

        if (this.encounter) {
          return false;
        }

        return true;
      },

      diameter(body) {
        if (this.layout) {
          const fov_m    = this.layout.fov_au * Physics.AU;
          const px_per_m = this.layout.scale_px / fov_m;
          const diameter = this.system.body(body).radius * 2;

          const adjust = body == 'sun' ? 1
                       : body.match(/jupiter|saturn|uranus|neptune/) ? 10
                       : 100;

          const factor = this.layout.fov_au + Math.log2(Math.max(1, this.layout.fov_au));
          const amount = util.clamp(adjust * factor, 1);
          return util.clamp(diameter * px_per_m * amount, 3, this.layout.scale_px);
        }
        else {
          return 3;
        }
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
        }
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
        <card-header class="px-0 py-1">
          <h4 class="p-1">
            Transit to {{plan.dest|caps}}
            <span v-if="paused" @click="resume" class="mx-1 float-right">&#9199;</span>
            <span v-else        @click="pause"  class="mx-1 float-right">&#9208;</span>
          </h4>
        </card-header>

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
          <SvgPlot :layout="layout" v-if="layout">
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
        return this.game.player.hasStandingOrLower(this.faction, 'Untrusted');
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
        this.$emit('dead');
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
