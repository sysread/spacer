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
  const Transit  = require('transit');
  const events   = require('events');
  const Layout   = require('component/layout');

  const turns_per_day = 24 / data.hours_per_turn;

  require('component/global');
  require('component/common');
  require('component/card');
  require('component/combat');
  require('component/navcomp');
  require('component/svg');


  Vue.component('transit', {
    mixins: [ Layout ],

    data() {
      return {
        layout_target_id: 'transit-plot-root',
        transit:          null,
        paused:           false,
        stoppedBy:        {'pirate': 0, 'police': 0},
        encounter:        null,
        intvl:            null,
        orbits:           {},
        objects:          {},
        sun:              null,
        ship:             [0, 0],
        path_index:       0,
      };
    },

    computed: {
      plan()         { return this.game.transit_plan },
      destination()  { return this.system.name(this.plan.dest) },
      current_turn() { return this.plan.currentTurn },
      daysLeft()     { return Math.floor(this.plan.left * this.data.hours_per_turn / 24) },
      percent()      { return this.plan.pct_complete },
      distance()     { return util.R(this.plan.auRemaining()) },

      is_zoomed_in() {
        return this.plan.turns < (10 * data.turns_per_day);
      },

      intvl_ms() {
        return this.is_zoomed_in ? 800 : 400;
      },

      center() {
        if (this.transit)
          return this.transit.center;
      },

      fov() {
        if (this.transit)
          return this.transit.fov;
      },

      displayFoV() {
        const fov = this.layout.fov_au * 2;

        if (fov < 1) {
          return util.R(fov, 4) + ' AU';
        } else {
          return util.R(fov, 1) + ' AU';
        }
      },

      bodies() {
        return this.system.all_bodies();
      },

      patrolRates() {
        const ranges = this.nearby();
        const rates  = {};

        for (const body of Object.keys(ranges)) {
          const au = ranges[body] / Physics.AU;
          rates[body] = this.game.planets[body].patrolRate(au);
        }

        const bans = this.game.get_conflicts({name: 'trade ban'});

        if (bans.length > 0) {
          // for nearby bodies
          for (const body of Object.keys(ranges)) {
            // for bans targeting this nearby body
            for (const ban of bans.filter(c => c.target == this.data.bodies[body].faction)) {
              // distance to nearby body
              const au = ranges[body] / Physics.AU;

              // bodies implementing the ban
              for (const banner of t.bodies.filter(b => this.data.bodies[body].faction == ban.target)) {
                // add banning body's patrol rate using the distance to the
                // banned body, rather than the distance to the banner's
                // planet.
                rates[banner] = this.game.planets[body].patrolRate(au);
              }
            }
          }
        }

        return rates;
      },

      patrolRate() {
        const rate = Object.values(this.patrolRates).reduce((a, b) => a + b, 0);
        return util.clamp(rate, 0, 1);
      },

      piracyRate() {
        const ranges = this.nearby();
        let total = 0;

        for (const body of Object.keys(ranges)) {
          const au = ranges[body] / Physics.AU;
          total += this.game.planets[body].piracyRate(au);
        }

        const patrols = this.patrolRates;
        for (const body of Object.keys(patrols)) {
          total *= 1 - patrols[body];
        }

        return util.clamp(total, 0, 1);
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
        const baseRate   = this.piracyRate;
        const stealth    = this.game.player.ship.stealth;
        const cargoMalus = this.piracyEvasionMalusCargo;
        const speedBonus = this.piracyEvasionBonusSpeed;

        let chance = baseRate;
        chance *= 1 - stealth;
        chance += cargoMalus // Increase chance of piracy if the ship has valuable cargo
        chance -= speedBonus // Reduce chance of an encounter at higher velocities
        chance -= stealth    // Reduce based on ship's own stealth rating;

        // Reduce chances for each previous encounter this trip
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
      layout_set() {
        // Create transit object
        this.transit = new Transit(this.plan, this.layout);

        // Set initial positions
        for (const body of this.bodies)
          this.set_position(body);

        this.set_position('sun');
        this.set_position('ship');

        this.resume();
      },

      dead() { this.$emit('open', 'newgame') },

      bg_css() {
        return {
          width:  this.layout ? this.layout.width_px  + 'px' : '100%',
          height: this.layout ? this.layout.height_px + 'px' : '100%',
        };
      },

      show_plot() {
        return this.layout && !this.encounter;
      },

      show_label(body) {
        const central = this.system.central(body);

        if (this.plan.dest == body && (central == 'sun' || this.is_zoomed_in))
          return true;

        if (this.plan.origin == body && (central == 'sun' || this.is_zoomed_in))
          return true;

        if (this.is_zoomed_in && central == 'sun' && central != this.plan.dest && central != this.plan.origin)
          return false;

        const position = this.system.position(body);
        const center   = central == 'sun' ? [0, 0] : this.system.position(central);
        const distance = Physics.distance(position, center) / Physics.AU;
        return distance > this.layout.fov_au / 5;
      },

      patrol_radius(body) {
        if (this.game.planets[body]) {
          return this.layout.scale_length(this.game.planets[body].patrolRadius() * Physics.AU);
        } else {
          return;
        }
      },

      interval() {
        if (this.game.player.ship.isDestroyed)
          this.$emit('open', 'newgame');

        if (this.paused || this.encounter) {
          return;
        }

        if (this.plan.is_started && this.current_turn % data.turns_per_day == 0) {
          if (this.inspectionChance() || this.piracyChance()) {
            this.pause();
            return;
          }
        }

        // TODO this is not capturing the final burn to the planet
        if (this.plan.is_complete) {
          clearInterval(this.intvl);

          const [x, y] = this.layout.scale_point(this.plan.end)
          $(this.$refs['ship']).animate({x: x, y: y}, this.intvl_ms, 'linear', () => {
            this.$nextTick(() => {
              this.complete();
            });
          });

          return;
        }

        this.transit.turn();

        // Update bodies' positions
        for (const body of this.bodies)
          this.animate(body);

        // Update the sun and ship
        this.animate('sun');
        this.animate('ship');
      },

      set_position(body) {
        const info = this.transit.body(body);

        if (body == 'ship') {
          // HACK: jquery.animate cannot animate svg text elements' x and y
          // properties since they are not css. so we set them as css
          // properties and manually step through them during animation
          // below.
          $(this.$refs['ship']).css({
            x: info.coords[0] + info.diameter + 10,
            y: info.coords[1] + info.diameter / 3,
          });

        }
        else {
          const props = {
            x:      info.coords[0],
            y:      info.coords[1],
            width:  info.diameter,
            height: info.diameter,
          };

          $(this.$refs[body]).attr(props);

          if (this.$refs[body + '_patrol']) {
            $(this.$refs[body + '_patrol']).attr({
              cx: info.coords[0],
              cy: info.coords[1],
              r:  this.patrol_radius(body),
            });
          }

          if (this.$refs[body + '_label']) {
            $(this.$refs[body + '_label']).css({
              x: info.coords[0] + info.diameter + 10,
              y: info.coords[1] + info.diameter / 3,
            });
          }
        }
      },

      animate(body) {
        const intvl = this.intvl_ms;
        const info  = this.transit.body(body);

        if (body == 'ship') {
          // HACK PART DEUX: we use jquery.animate to step through the values,
          // then manually set them using Element.setAttribute (sinece they are
          // attributes, not css properties).
          $(this.$refs['ship']).animate(
            {x: info.coords[0], y: info.coords[1]},
            {
              duration: intvl,
              easing:   'linear',
              step:     (now, fx) => {
                if (!isNaN(now))
                  fx.elem.setAttribute(fx.prop, now);
              },
            }
          );
        }
        else {
          const props = {
            x:      info.coords[0],
            y:      info.coords[1],
            width:  info.diameter,
            height: info.diameter,
          };

          $(this.$refs[body]).animate(props, intvl, 'linear');

          if (this.$refs[body + '_patrol']) {
            $(this.$refs[body + '_patrol']).animate(
              {
                cx: info.coords[0],
                cy: info.coords[1],
                r:  this.patrol_radius(body)
              },
              intvl,
              'linear',
            );
          }

          if (this.$refs[body + '_label']) {
            $(this.$refs[body + '_label']).animate(
              {
                x: info.coords[0] + info.diameter + 10,
                y: info.coords[1] + info.diameter / 3,
              },
              {
                duration: intvl,
                easing:   'linear',
                step:     (now, fx) => {
                  if (!isNaN(now))
                    fx.elem.setAttribute(fx.prop, now);
                },
              }
            );
          }
        }
      },

      complete() {
        this.game.arrive();
        this.game.unfreeze();
        this.game.save_game();
        this.$emit('open', 'summary');
      },

      pause() {
        this.paused = true;
        clearInterval(this.intvl);
        console.log('transit paused');
      },

      resume() {
        this.paused = false;
        console.log('transit resumed');
        //this.interval(); // calling immediately prevents a delay before animation begins
        this.intvl = setInterval(() => this.interval(), this.intvl_ms);
      },

      complete_encounter() {
        this.encounter = null;
        this.resume();
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
        const patrols = this.patrolRates;

        if (this.current_turn == 0) {
          return false;
        }

        for (const body of Object.keys(patrols)) {
          const faction = this.data.bodies[body].faction;
          const pos     = this.system.position(body);
          const range   = Physics.distance(this.plan.coords, pos) / Physics.AU;

          // No inspections outside of jurisdiction, even if there are patrols
          // out that far to keep down pirates.
          if (range > this.data.jurisdiction) {
            continue;
          }

          let rate = patrols[body];
          rate *= 1 - this.game.player.ship.stealth;

          if (rate > 0) {
            // Encountered a patrol
            if (util.chance(rate)) {
              let inspection = this.game.planets[body].inspectionRate(this.game.player);

              for (let i = 0; i < this.stoppedBy.police; ++i) {
                inspection /= 2;
              }

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
        <span slot="header">
          <btn v-if="paused" :disabled="encounter" @click="resume()">Resume</btn>
          <btn v-else :disabled="encounter" @click="pause()">Pause</btn>
        </span>

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

          <SvgPlot v-if="layout" :width="layout.width_px" :height="layout.height_px">
            <image ref="sun" x="0" y="0" width="1" height="1" xlink:href="img/sun.png" />

            <template v-for="body in bodies">
              <SvgOrbitPath v-if="body != 'sun'" :body="body" :layout="layout" />
              <circle v-show="data.bodies[body] != undefined" :ref="body + '_patrol'" fill="green" fill-opacity="0.1" cx=0 cy=0 r=0 />
              <image :ref="body" x=0 y=0 width=1 height=1 :xlink:href="'img/' + body + '.png'" />
              <text v-show="show_label(body)" :ref="body + '_label'" style="font: 14px monospace; fill: #7FDF3F" x=0 y=0>
                {{body|caps}}
              </text>
            </template>


            <SvgPath v-if="transit" :points="transit.path('ship')" color="#605B0E" />
            <text ref="ship" text-anchor="middle" alignment-baseline="middle" style="fill: yellow; font: bold 14px monospace;">
              &tridot;
            </text>


            <line x1=130 y1=13 :x2="patrolRate * layout.width_px + 130" y2=13 stroke="green" stroke-width="14" />
            <text style="fill:red; font:12px monospace" x=5 y=17>Patrol:&nbsp;{{patrolRate|pct(2)}}</text>

            <line x1=130 y1=30 :x2="piracyRate * layout.width_px + 130" y2=30 stroke="red" stroke-width="14" />
            <text style="fill:red; font:12px monospace" x=5 y=34>Piracy:&nbsp;{{piracyRate|pct(2)}}</text>

            <text style="fill:red; font:12px monospace" x=5 y=51>FoV:&nbsp;&nbsp;&nbsp;&nbsp;{{displayFoV}}</text>
            <text style="fill:red; font:12px monospace" x=5 y=51>FoV:&nbsp;&nbsp;&nbsp;&nbsp;{{displayFoV}}</text>
            <text style="fill:red; font:12px monospace" x=5 y=68>&Delta;V:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{plan.accel_g|R(3)|unit('G')}}</text>
          </SvgPlot>
        </div>

        <transit-inspection
            v-if="encounter && encounter.type == 'inspection'"
            @done="complete_encounter"
            @dead="dead"
            :body="encounter.body"
            :faction="encounter.faction"
            :distance="encounter.distance"
            :dest="plan.dest"
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
    props: ['faction', 'body', 'distance', 'dest'],

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

      // true if the inspection's faction holds a trade ban against the
      // destination's faction
      isBlockade() {
        const bans = this.game.get_conflicts({
          name:      'trade ban',
          target:    this.data.bodies[this.dest].faction,
          proponent: this.faction,
        });

        return bans.length != 0;
      },

      hasContraband() {
        for (const item of Object.keys(this.data.resources)) {
          if (this.data.resources[item].contraband) {
            if (this.game.player.ship.cargo.get(item) > 0) {
              return true;
            }
          }
        }

        return this.isBlockade;
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

        const isBlockade = this.isBlockade;
        const isContraband = (item) => isBlockade || this.data.resources[item].contraband;

        for (const item of this.game.player.ship.cargo.keys()) {
          if (isContraband(item)) {
            const amt = this.game.player.ship.cargo.count(item);
            fine += amt * this.planet.inspectionFine(this.game.player);
          }
        }

        this.fine = Math.min(fine, this.game.player.money);

        if (this.fine > 0) {
          if (isBlockade) {
            events.Events.signal({
              type: events.Ev.CaughtSmuggling,
              by:   this.faction,
            });

            find *= 2;
          }

          this.game.player.debit(this.fine);

          for (const [item, amt] of this.game.player.ship.cargo.entries()) {
            if (amt > 0 && isContraband(item)) {
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
