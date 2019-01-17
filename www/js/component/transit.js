define(function(require, exports, module) {
  "use strict"

  const NPC      = require('npc');
  const Ship     = require('ship');
  const Physics  = require('physics');
  const Vue      = require('vendor/vue');
  const data     = require('data');
  const util     = require('util');
  const t        = require('common');
  const resource = require('resource');
  const Layout   = require('component/layout');

  const intvl = 0.3;
  const turns_per_day = 24 / data.hours_per_turn;

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/combat');
  require('component/navcomp');

  require('vendor/TweenMax.min');

  Vue.component('transit', {
    mixins: [ Layout ],

    data() {
      return {
        layout_target_id: 'transit-plot-root',
        timeline:         null,
        building:         false,
        paused:           false,
        stoppedBy:        {'pirate': 0, 'police': 0},
        encounter:        null,
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

      patrolRate() {
        const ranges = this.nearby();
        let total = 0;
        let count = 0;

        for (const body of Object.keys(ranges)) {
          const au = ranges[body] / Physics.AU;
          total += this.game.planets[body].patrolRate(au);
          ++count;
        }

        return util.clamp(total, 0, 1);
      },

      piracyRate() {
        const rate = this.data.default_piracy_rate * (1 - this.patrolRate);
        return util.clamp(rate, 0, 1);
      },

      piracyEvasionMalusCargo() {
        const cargo = this.game.player.ship.cargoValue(this.game.here);
        if (cargo >= 1) {
          return Math.log10(cargo) / 200;
        } else {
          return 0;
        }
      },

      piracyEvasionBonusSpeed() {
        if (this.plan.velocity > this.data.piracy_max_velocity) {
          return Math.log(this.plan.velocity / this.data.piracy_max_velocity) / 200;
        } else {
          return 0;
        }
      },

      adjustedPiracyRate() {
        let chance = this.piracyRate
                   - this.game.player.ship.stealth;

        // Increase chance of piracy if the ship has valuable cargo
        chance += this.piracyEvasionMalusCargo;

        // Reduce chance of an encounter at higher velocities
        chance -= this.piracyEvasionBonusSpeed;

        // Reduce chances for each encounter
        for (let i = 0; i < this.stoppedBy.pirate; ++i) {
          chance /= 2;
        }

        return util.clamp(chance, 0, 1);
      },

      nearest() {
        const nearby = this.nearby();

        return Object.keys(nearby).reduce((a, b) => {
          if (nearby[a] < nearby[b]) {
            return a;
          } else {
            return b;
          }
        });
      },

      nearest_faction() {
        return this.system.faction(this.nearest);
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
        timeline.smoothChildTimeing = true;

        const timelines = {
          sun:  new TimelineLite,
          ship: new TimelineLite({
            onComplete: () => {
              this.$nextTick(() => {
                this.game.arrive();
                this.game.unfreeze();
                this.game.save_game();
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
                // For whatever reason, TweenLite doesn't seem to be able to
                // maintain the same animation rate for svg circles, causing
                // them to jitter back and forth at each mark. This makes them
                // jerk without animation, but alongside the smoother planetary
                // animations, this serendipitously results in kind of a neat
                // effect.
                onComplete: () => {
                  const c = document.getElementById(body + '_patrol');
                  if (c) {
                    c.setAttribute("cx", x);
                    c.setAttribute("cy", y);
                  }
                },
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

      name(body) {
        return this.system.name(body);
      },

      patrol_radius(body) {
        if (this.game.planets[body]) {
          return this.layout.scale_length(this.game.planets[body].patrolRadius() * Physics.AU);
        } else {
          return;
        }
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

      inspectionChance() {
        const ranges = this.nearby();

        if (this.current_turn == 0) {
          return false;
        }

        for (const body of Object.keys(ranges)) {
          const faction = this.data.bodies[body].faction;
          const au = ranges[body] / Physics.AU;

          // No inspections outside of jurisdiction, even if there are patrols
          // out that far to keep down pirates.
          if (au > this.data.jurisdiction) {
            continue;
          }

          let patrol = this.game.planets[body].patrolRate(au)
                     - this.game.player.ship.stealth;

          if (patrol > 0) {
            // Encountered a patrol
            if (util.chance(patrol)) {
              let inspection = this.game.planets[body].inspectionRate(this.game.player);

              if (this.plan.velocity > 1000) {
                inspection -= Math.log(this.plan.velocity / 1000) / 300;
              }

              inspection /= 1 + this.stoppedBy.police;

              if (util.chance(inspection)) {
                ++this.stoppedBy.police;
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

      piracyChance() {
        if (util.chance(this.adjustedPiracyRate)) {
          ++this.stoppedBy.pirate;
          this.encounter = {type: 'pirate'};
          return true;
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
            <image ref="sun" xlink:href="img/sun.png" />

            <g v-for="body of bodies" :key="body">
              <circle v-show="game.planets[body] != undefined"
                :id="body + '_patrol'"
                :r="patrol_radius(body)"
                stroke="green"
                stroke-width="0.25"
                fill="green"
                fill-opacity="0.025"/>

              <image :ref="body" :xlink:href="'img/' + body + '.png'" />

              <text :ref="body + '_label'" v-show="show_label(body)" style="font:12px monospace; fill:#EEEEEE;">
                {{name(body)}}
              </text>
            </g>

            <text ref="ship" text-anchor="middle" alignment-baseline="middle" style="fill:yellow; font:12px monospace;">
              &tridot;
            </text>

            <text style="fill:red;font:12px monospace" x=5 y=17>FoV:&nbsp;&nbsp;&nbsp;&nbsp;{{layout.fov_au * 2|R(4)|unit('AU')}}</text>
            <text style="fill:red;font:12px monospace" x=5 y=34>Patrol:&nbsp;{{patrolRate|pct(2)}}</text>
            <text style="fill:red;font:12px monospace" x=5 y=51>Piracy:&nbsp;{{piracyRate|pct(2)}}</text>
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
            :nearest="nearest"
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
          name:          'Police Patrol',
          faction:       this.faction,
          ship:          ['schooner', 'corvette', 'cruiser', 'battleship', 'barsoom', 'neptune'],
          addons:        ['armor', 'railgun_turret', 'light_torpedo', 'medium_torpedo', 'ecm'],
          always_addons: ['pds'],
          min_addons:    3,
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
        for (const item of this.game.player.ship.cargo.keys()) {
          const amt = this.game.player.ship.cargo.count(item);
          if (this.data.resources[item].contraband) {
            fine += amt * this.planet.inspectionFine(this.game.player);
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
        else if (result == 'player-surrendered') {
          this.submit();
        }
        else {
          this.choice = 'ready';
          this.$emit('done');
        }
      },
    },

    template: `
<div class="p-3">
  <h5>Police inspection: {{faction}}</h5>

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
</div>
    `,
  });


  Vue.component('PirateEncounter', {
    props: ['nearest'],

    data() {
      const faction = util.oneOf(['UN', 'MC', 'CERES', 'JFT', 'TRANSA']);

      const npc = new NPC({
        name:          'Pirate',
        faction:       faction,
        ship:          ['schooner', 'corvette', 'neptune'],
        always_addons: ['pds'],
        addons:        ['railgun_turret', 'light_torpedo', 'ecm', 'armor'],
        min_addons:    2,
      });

      const ship_value = npc.ship.shipValue(window.game.here) + npc.ship.addOnValue();
      const bounty = Math.ceil(ship_value / 20);

      return {
        choice:    'ready',
        took:      null,
        gave:      null,
        init_flee: false,
        bounty:    bounty,
        npc:       npc,
      };
    },

    computed: {
      nearest_faction() { return this.data.bodies[this.nearest].faction }
    },

    methods: {
      setChoice(choice) {
        if (choice == 'flee') {
          this.init_flee = true;
          choice = 'attack';
        }

        this.choice = choice || 'ready';

        if (this.choice == 'submit-yes') {
          const plunder = this.plunder();
          this.took = plunder.took;
          this.gave = plunder.gave;
        }
      },

      plunder() {
        const player = this.game.player.ship;
        const npc    = this.npc.ship;
        const value  = item => resource.resources[item].value;
        const took   = {};
        const gave   = {};

        for (const item of t.resources) {
          took[item] = 0;
          gave[item] = 0;
        }

        // List of items in player's hold, sorted by value from highest to
        // lowest.
        const avail = player.cargo.keys()
          .filter(i => player.cargo.count(i) > 0)
          .sort((a, b) => value(a) > value(b) ? -1 : 1);

        for (const item of avail) {
          let count = player.cargo.count(item);

          // Load whatever there is room for on the npc's ship
          while (count > 0 && !npc.holdIsFull) {
            player.unloadCargo(item, 1);
            npc.loadCargo(item, 1);
            --count;
            ++took[item];
          }

          // If the npc's hold is full but holds items of lesser value, swap
          // them out for what is in the player's hold.
          if (count > 0 && npc.holdIsFull) {
            // List of items of lesser value in the npc's hold, sorted from
            // lowest value to highest.
            const has = npc.cargo.keys()
              .filter(i => npc.cargo.count(i) > 0)
              .filter(i => value(i) < value(item))
              .sort((a, b) => value(a) < value(b) ? -1 : 1);

            for (const npc_item of has) {
              let npc_count = npc.cargo.count(npc_item);

              while (npc_count > 0 && count > 0) {
                // Replace the item on the player's ship with the item of
                // lesser value from the npc's.
                player.unloadCargo(item, 1);
                player.loadCargo(npc_item, 1);

                // Do the reverse for the npc.
                npc.unloadCargo(npc_item, 1);
                npc.loadCargo(item, 1);

                --count;
                --npc_count;

                ++took[item];
                ++gave[npc_item];
              }
            }
          }
        }

        return {
          took: {
            count: Object.values(took).reduce((a, b) => a + b),
            items: took,
          },
          gave: {
            count: Object.values(gave).reduce((a, b) => a + b),
            items: gave,
          },
        };
      },

      done(result) {
        if (result == 'destroyed') {
          this.$emit('dead');
        }
        else if (result == 'player-surrendered') {
          this.setChoice('submit-yes');
        }
        else if (result == 'won' || result == 'opponent-surrendered') {
          this.setChoice('bounty');
          this.game.player.credit(this.bounty);
          this.game.player.incStanding(this.nearest_faction, util.getRandomInt(1, 10));
          this.game.player.decStanding(this.data.bodies[this.npc.faction.abbrev], util.getRandomInt(1, 5));
        }
        else {
          this.choice = 'ready';
          this.$emit('done');
        }
      },
    },

    template: `
      <div class="p-3">
        <div v-if="choice=='ready'">
          <card-text>
            The lights go dim as an emergency klaxxon warns you that your ship has been
            targeted by an incoming pirate <b class="text-warning">{{npc.ship.type|caps}}</b>.
            Its transponder is off, but its make and markings suggest that may be aligned
            with {{npc.faction.abbrev}}, indicating that it might be a privateer. Of course,
            the ship could just as easily have been stolen.

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
          <p>
            Armed pirates board your ship, roughing you and your crew up while
            they take anything of value they can fit aboard their ship. Forcing
            you to help with the loading, the pirates plunder your ship's hold.
          </p>

          <template v-if="took.count > 0">
            <p>
              The pirates plundered the following resources from your ship:
            </p>
            <ul>
              <li v-for="(count, item) of took.items" v-if="count > 0">
                {{count}} {{item}}
              </li>
            </ul>

            <template v-if="gave.count > 0">
              <p>
                To make room for what was taken, the following lower value items
                were put into your hold:
              </p>
              <ul>
                <li v-for="(count, item) of gave.items" v-if="count > 0">
                  {{count}} {{item}}
                </li>
              </ul>
            </template>
          </template>

          <p v-else>
            Disgusted at the lack of valuable goods in your hold, the pirates
            merely raid the galley, taking the little fresh produce you were
            able to acquire at your last stop as well as any booze they found
            in the crew cabins.
          </p>
        </ok>

        <ok v-if="choice=='bounty'" @ok="done">
          According to the last data dump before your departure, there is a
          bounty for the elimination of this pirate. Your account has been
          credited {{bounty|csn}} credits, effective as soon as light from
          the event reaches the nearest patrol. As a result, your standing
          with {{nearest_faction}} has increased.
        </ok>
      </div>
    `,
  });
});
