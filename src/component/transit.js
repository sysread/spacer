import NPC from '../npc';
import Ship from '../ship';
import Physics from '../physics';
import system from '../system';
import Vue from 'vue';
import data from '../data';
import game from '../game';
import * as util from '../util';
import { factions } from '../faction';
import { NavComp } from '../navcomp';
import * as Event from '../events';
import Tween from '../tween';
import Layout from './layout';
import * as tc from './transit-controller';

import './global';
import './common';
import './combat';
import './navcomp';
import './svg';
import './summary';


Vue.component('Transit', {
  mixins: [ Layout ],

  data() {
    const orbits = {};
    for (const body of system.all_bodies())
      orbits[body] = system.orbit_by_turns(body);

    const turns = game.transit_plan.turns;

    return {
      layout_scaling:    false,
      layout_target_id:  'transit-plot-root',
      transit:           null,
      paused:            true,
      encounter:         null,
      encounters:        0,
      orbits:            orbits,
      started:           false,
      arriving:          false,

      encounterTimeCost: null,
      encounterDistCost: null,
      encounterFuelCost: null,

      // animated values
      patrolpct:         0,
      piracypct:         0,
      shipx:             0,
      shipy:             0,
    };
  },

  watch: {
    'started': function() {
      const [x, y] = this.layout.scale_point(this.plan.coords);
      this.shipx = x;
      this.shipy = y;
      console.log('transit starting');
      setTimeout(() => this.resume(), 300);
    },

    'plan.current_turn': function() {
      if (!this.isSubSystemTransit && !this.is_zoomed_in)
        this.layout.set_fov_au(this.fov());

      this.update();
    },
  },

  computed: {
    plan()         { return this.game.transit_plan },
    percent()      { return this.plan.pct_complete },
    distance()     { return util.R(this.plan.auRemaining()) },
    is_next_day()  { return this.plan.current_turn % data.turns_per_day == 0 },
    is_zoomed_in() { return this.plan.left < data.turns_per_day },

    isSubSystemTransit() {
      const dest_central = system.central(this.plan.dest);
      const orig_central = system.central(this.plan.origin);

      if ((dest_central == orig_central && dest_central != 'sun') // moon to moon in same system
          || window.game.locus == dest_central                    // central to its own moon
          || this.plan.dest == orig_central)                      // moon to its host planet
        return true;
      else
        return false;
    },

    intvl() {
      if (!this.started || this.plan.current_turn == 0) {
        return 0;
      }

      const min   = 0.05;
      const max   = 1.00;
      const intvl = max / (this.layout.fov_au * 2);
      return util.clamp(intvl, min, max);
    },

    displayFoV() {
      const fov = this.layout.fov_au * 2;

      if (fov < 1) {
        return util.R(fov, 4) + ' AU';
      } else {
        return util.R(fov, 1) + ' AU';
      }
    },

    center() {
      const body = this.isSubSystemTransit
        ? system.central(this.plan.dest)
        : this.plan.dest;

      // use system.position_on_turn so vuejs picks up that this property
      // changes on each turn
      return system.position_on_turn(body, this.game.turns);
    },

    patrolRates() {
      return tc.computePatrolRates(this.nearby(), this.game.planets);
    },

    patrolRate() {
      return tc.totalPatrolRate(this.patrolRates);
    },

    privateerRates() {
      return tc.computePrivateerRates(
        this.nearby(),
        this.game.planets,
        this.game.get_conflicts({name: 'blockade'}),
        this.game.player.faction.abbrev,
        this.plan.origin,
        this.plan.dest,
      );
    },

    piracyRate() {
      return tc.computePiracyRate(this.nearby(), this.patrolRates, this.game.planets);
    },

    piracyEvasionMalusCargo() {
      return tc.piracyEvasionMalusCargo(this.game.player.ship.cargoValue(this.game.here.pricing));
    },

    piracyEvasionBonusSpeed() {
      return tc.piracyEvasionBonusSpeed(this.plan.velocity);
    },

    adjustedPiracyRate() {
      return tc.adjustedPiracyRate(
        this.piracyRate,
        this.game.player.ship.stealth,
        this.game.player.ship.cargoValue(this.game.here.pricing),
        this.plan.velocity,
        this.game.player.ship.holdIsEmpty,
        this.encounters,
      );
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
    dead() { this.$emit('open', 'newgame') },
    show_plot() { return this.layout && !this.encounter },

    update() {
      const [x, y] = this.layout.scale_point(this.plan.coords);

      Tween(this.$data, this.intvl, {
        patrolpct:  this.patrolRate,
        piracypct:  this.piracyRate,
        shipx:      x,
        shipy:      y,
        onComplete: () => {
          this.$nextTick(() => {
            this.layout.set_center(this.center);
            this.layout.set_fov_au(this.fov());
            this.interval();
          });
        },
      }).play();
    },

    fov() {
      const central = system.central(this.plan.dest);
      const points = [this.plan.end, this.plan.coords];

      // For sub-system transits, center on the common central body.
      if (this.isSubSystemTransit) {
        for (const body of this.system.all_bodies()) {
          if (system.central(body) == central || body == central) {
            points.push(this.orbits[body][0]);
          }
        }
      }
      else {
        const frame = system.central(this.plan.dest) == 'sun' ? this.plan.dest : system.central(this.plan.dest);
        const closest = this.system.all_bodies()
          .filter(b => b != this.plan.dest && system.central(b) != frame)
          .reduce((a, b) => {
            if (a == undefined) return b;
            const da = Physics.distance(this.orbits[a][0], this.plan.coords);
            const db = Physics.distance(this.orbits[b][0], this.plan.coords);
            return da < db ? a : b;
          }, undefined);

        points.push(this.orbits[closest][0]);
      }

      // Lop off z to prevent it from affecting the distance calculation
      const center    = this.center;
      const center_2d = [center[0], center[1], 0];
      const points_2d = points.map(p => [p[0], p[1], 0]);
      const distances = points_2d.map(p => Physics.distance(p, center_2d));
      const max       = Math.max(...distances);
      return 1.1 * (max / Physics.AU);
    },

    layout_resize() {
      this.layout.update_width();
    },

    layout_set() {
      this.layout.set_center(this.center);
      this.layout.set_fov_au(this.fov());
      this.started = true;
    },

    bg_css() {
      return {
        width:  this.layout ? this.layout.width_px  + 'px' : '100%',
        height: this.layout ? this.layout.height_px + 'px' : '100%',
      };
    },

    bg_class() {
      return {
        'plot-root-with-galaxy': !this.game.options.hideMapBackground,
      };
    },

    show_label(body) {
      const central = this.system.central(body);

      if (this.plan.dest == body && (central == 'sun' || this.is_zoomed_in))
        return true;

      if (this.plan.origin == body && (central == 'sun' || this.is_zoomed_in))
        return true;

      if (this.is_zoomed_in && central == 'sun' && central != this.plan.dest && central != this.plan.origin)
        return false;

      const position = this.orbits[body][this.plan.current_turn];
      const center   = central == 'sun' ? [0, 0] : this.orbits[central][this.plan.current_turn];
      const distance = Physics.distance(position, center) / Physics.AU;
      return distance > this.layout.fov_au / 5;
    },

    /*
     * Runs a single turn and checks for the chance of in-transit events,
     * such as a patrol or piracy encounter.
     */
    interval() {
      if (this.plan.is_complete) {
        this.complete();
      }

      if (this.game.player.ship.isDestroyed) {
        this.$emit('open', 'newgame');
        return;
      }

      if (this.paused || this.encounter) {
        return;
      }

      if (this.plan.is_started && this.is_next_day) {
        if (this.inspectionChance() || this.piracyChance() || this.privateerChance()) {
          this.pause();
          return;
        }
      }

      this.plan.turn();
      this.game.player.ship.burn(this.plan.accel);
      this.$nextTick(() => this.game.turn(1, true));
    },

    complete() {
      this.arriving = true;
      this.$nextTick(() => {
        this.game.arrive();
        this.game.unfreeze();
        this.game.save_game();
        this.$emit('open', 'summary');
      });
    },

    pause() {
      this.paused = true;
      console.log('transit paused');
    },

    resume() {
      this.paused = false;
      console.log('transit resumed');
      this.$nextTick(() => this.interval());
    },

    complete_encounter(rounds) {
      this.encounter = null;

      if (rounds > 0) {
        const time = util.fuzz(rounds * 300, 1); // some fuzzing of 5m/round
        const drift = this.plan.velocity * time;

        const pos = this.plan.coords;
        pos[0] += time * this.plan.current_velocity[0];
        pos[1] += time * this.plan.current_velocity[1];
        pos[2] += time * this.plan.current_velocity[2];

        const vel = this.plan.current_velocity;
        const nc  = new NavComp(game.player, this.plan.origin);
        const transits = nc.full_astrogator(
          {position: pos, velocity: vel},
          this.plan.dest,
        );

        for (let transit = transits(); transits != null; transit = transits()) {
          // remaining fuel cost from original plan
          const fuel = this.plan.left * (this.plan.fuel / this.plan.turns);
          this.encounterFuelCost = transit.fuel - fuel;
          this.encounterTimeCost = time;
          this.encounterDistCost = drift;
          this.game.transit_plan = transit;
          break;
        }

        if (this.encounterTimeCost != null && this.encounterTimeCost > 0)
          return;
      }

      this.resume();
    },

    ackTimeCost() {
      this.resume();
    },

    nearby() {
      const ranges = this.system.ranges(this.plan.coords);
      const bodies = {};

      for (const body of Object.keys(ranges)) {
        bodies[body] = ranges[body];
      }

      return bodies;
    },

    privateerChance() {
      const rates = this.privateerRates;

      for (const faction of Object.keys(rates)) {
        let {target, rate} = rates[faction];
        rate = tc.applyEncounterReduction(rate, this.game.player.ship.stealth, this.encounters);

        if (rate > 0 && util.chance(rate)) {
          ++this.encounters;

          this.encounter = {
            type:    'privateer',
            faction: faction,
            target:  target,
            body:    this.data.factions[faction].capital,
          };

          return true;
        }
      }

      return false;
    },

    inspectionChance() {
      if (this.plan.current_turn == 0)
        return false;

      const patrols = this.patrolRates;

      for (const body of Object.keys(patrols)) {
        const pos = this.system.position(body);
        const range = Physics.distance(this.plan.coords, pos) / Physics.AU;

        // No inspections outside of jurisdiction, even if there are patrols
        // out that far to keep down pirates.
        if (range > this.data.jurisdiction)
          continue;

        const faction = this.data.bodies[body].faction;

        let rate = tc.applyEncounterReduction(patrols[body], this.game.player.ship.stealth, this.encounters);

        if (rate > 0) {
          if (util.chance(rate)) {
            let inspection = tc.applyEncounterReduction(
              this.game.planets[body].encounters.inspectionRate(this.game.player),
              0, this.encounters,
            );

            if (util.chance(inspection)) {
              ++this.encounters;
              const dist = util.R(Physics.distance(this.plan.coords, this.system.position(body)) / Physics.AU, 3);
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
      if (this.plan.current_turn == 0)
        return false;

      if (util.chance(this.adjustedPiracyRate)) {
        ++this.encounters;
        this.encounter = {type: 'pirate'};
        return true;
      }

      return false;
    },
  },

  template: `
    <Section notitle=1>
      <div v-if="inDev" class="btn-toolbar" id="navcomp-toolbar">
        <div class="btn-group">
          <btn v-if="paused" :disabled="encounter" @click="resume()">Resume</btn>
          <btn v-else :disabled="encounter" @click="pause()">Pause</btn>
        </div>
      </div>

      <card v-if="arriving" title="Arriving">
        <h4>Docking at your reserved berth</h4>
      </card>

      <template v-else>
        <table id="navcomp-transit-info" class="table table-sm m-0" :style="{width: show_plot() && layout ? layout.width_px + 'px' : '100%'}">
          <tr>
            <td class="text-start border-0">{{$unit(plan.days_left, 'days')}}</td>
            <td class="text-center border-0">{{$unit($csn($R(plan.velocity/1000)), 'km/s')}}</td>
            <td class="text-end border-0">{{$unit($sprintf($R(plan.auRemaining(), 2), '%0.2f'), 'AU')}}</td>
          </tr>
          <tr v-if="!show_plot()">
            <td colspan="3">
              <progress-bar width=100 :percent="percent" />
            </td>
          </tr>
        </table>

        <div v-layout ref="plot" v-show="show_plot()" id="transit-plot-root" :style="layout_css_dimensions" class="plot-root border border-dark">
          <div class="plot-root-bg" :class="bg_class()" :style="bg_css()"></div>

          <SvgPlot v-if="layout" :width="layout.width_px" :height="layout.height_px">
            <line x1=130 y1=13 :x2="patrolpct * layout.width_px + 130" y2=13 stroke="green" stroke-width="14" />
            <text style="fill:red; font:12px monospace" x=5 y=17>Patrol:&nbsp;{{$pct(patrolRate, 2)}}</text>

            <line x1=130 y1=30 :x2="piracypct * layout.width_px + 130" y2=30 stroke="red" stroke-width="14" />
            <text style="fill:red; font:12px monospace" x=5 y=34>Piracy:&nbsp;{{$pct(piracyRate, 2)}}</text>

            <text style="fill:red; font:12px monospace" x=5 y=51>FoV:&nbsp;&nbsp;&nbsp;&nbsp;{{displayFoV}}</text>
            <text style="fill:red; font:12px monospace" x=5 y=51>FoV:&nbsp;&nbsp;&nbsp;&nbsp;{{displayFoV}}</text>
            <text style="fill:red; font:12px monospace" x=5 y=68>&Delta;V:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{$unit($R(plan.accel_g, 3), 'G')}}</text>

            <g v-for="body in system.all_bodies()" :key="body">
              <SvgPatrolRadius :body="body" :coords="orbits[body][0]" :layout="layout" :intvl="intvl" />
              <SvgPlotPoint :body="body" :coords="orbits[body][0]" :layout="layout" :img="'img/'+body+'.png'" :label="show_label(body)" :intvl="intvl" />
            </g>

            <text text-anchor="middle" alignment-baseline="middle"
                style="fill: yellow; font: bold 8px monospace;"
                :x="shipx" :y="shipy">
              &tridot;
            </text>
          </SvgPlot>
        </div>

        <PatrolEncounter
            v-if="encounter && (encounter.type == 'inspection' || encounter.type == 'privateer')"
            @done="complete_encounter"
            @dead="dead"
            :body="encounter.body"
            :faction="encounter.faction"
            :distance="encounter.distance"
            :target="encounter.target"
            :dest="plan.dest"
            class="my-3" />

        <PirateEncounter
            v-if="encounter && encounter.type == 'pirate'"
            @done="complete_encounter"
            @dead="dead"
            :nearest="nearest"
            :faction="encounter.faction"
            class="my-3" />

        <ok v-if="encounterTimeCost > 0" title="Consequences" @ok="ackTimeCost">
          This encounter took {{$csn($R(encounterTimeCost/60, 0))}} minutes.
          As a result, you drifted {{$csn($R(encounterDistCost/1000, 0))}} km off course.
          Your course has been adjusted accordingly.
        </ok>

      </template>
    </Section>
  `,
});

Vue.component('PatrolEncounter', {
  props: ['faction', 'body', 'distance', 'dest', 'target'],

  data() {
    return {
      choice: 'ready',
      init_flee: false,
      fine: 0,

      npc: new NPC({
        name:          'Police Patrol',
        faction:       this.faction,
        ship:          ['shuttle', 'schooner', 'cutter', 'corvette', 'guardian', 'cruiser', 'battleship'],
        addons:        ['armor', 'railgun_turret', 'light_torpedo', 'medium_torpedo', 'ecm'],
        always_addons: ['pds'],
        min_addons:    3,
      }),
    };
  },

  computed: {
    planet() { return this.game.planets[this.body] },
    canAffordBribe() { return this.bribeAmount <= this.game.player.money },

    bribeAmount() {
      const base = Math.ceil(this.game.player.ship.price(false, this.planet.pricing) * 0.03);
      return this.isBlockade ? base * 2 : base;
    },

    // true if the inspection's faction holds a trade ban against the
    // destination's faction
    isBlockade() {
      return this.target != undefined;
    },

    hasContraband() {
      if (this.isBlockade && !this.game.player.ship.holdIsEmpty)
        return true;

      const faction = factions[this.faction];
      for (const item of Object.keys(this.data.resources))
        if (faction.isContraband(item, this.game.player))
          return true;

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
      const isBlockade = this.isBlockade;
      const faction = factions[this.faction];
      const isContraband = (item) => isBlockade || faction.isContraband(item, this.game.player);

      const found = {};
      let busted = false;

      for (const item of this.game.player.ship.cargo.keys()) {
        if (this.game.player.ship.cargo.get(item) > 0 && isContraband(item)) {
          const amt = this.game.player.ship.cargo.count(item);
          found[item] = found[item] || 0;
          found[item] += amt;
          busted = true;
        }
      }

      if (busted) {
        const dest_faction = this.data.bodies[this.dest].faction;
        Event.trigger(new Event.CaughtSmuggling({faction: dest_faction, found: found}));
        this.setChoice('submit-fined');
      } else {
        this.setChoice('submit-done');
      }
    },

    bribe() {
      this.game.player.debit(this.bribeAmount);
      this.game.player.decStanding(this.faction, 3);
      this.done(1);
    },

    done(result, rounds) {
      if (result == 'destroyed') {
        this.$emit('dead');
      }
      else if (result == 'player-surrendered') {
        this.submit();
      }
      else {
        this.choice = 'ready';
        this.$emit('done', Math.max(rounds || 0, 0));
      }
    },
  },

  template: `
<div class="p-3">
<h5>
  <Flag :faction="faction" width="75" />
  <template v-if="isBlockade">Blockade: {{faction}}</template>
  <template v-else>Police inspection: {{$caps(body)}}</template>
</h5>

<template v-if="choice=='ready'">
  <p v-if="isBlockade">
    You are hailed by a {{faction}} military patrol ship enforcing a blockade
    against {{target}}. You are ordered to heave to and prepare to be boarded.
    If there are any trade goods on board, they will be seized and result in
    a large fine and loss of standing with {{faction}}.
  </p>
  <p v-else>
    You are being hailed by a {{faction}} patrol ship operating {{distance}} AU
    out of {{$caps(body)}}. The captain orders you to cease acceleration and
    peacefully submit to an inspection. Any contraband on board will be seized
    and result in a fine and loss of standing with {{faction}}.
  </p>

  <div>
    <btn block=1 @click="submit">Submit</btn>
    <btn block=1 @click="setChoice('bribe')">Bribe</btn>
    <btn block=1 @click="setChoice('flee-confirm')">Flee</btn>
    <btn block=1 @click="setChoice('attack-confirm')">Attack</btn>
  </div>
</template>

<ask v-if="choice=='flee-confirm'" @pick="setChoice" :choices="{'flee': 'Yes', 'ready': 'Nevermind'}">
  Are you sure you wish to flee from the police?
  <span v-if="!hasContraband">You are not carrying any contraband.</span>
</ask>

<div v-if="choice=='submit-fined'">
  <!--Your contraband cargo was found and confiscated.
  You have been fined {{$csn(fine)}} credits.
  Your reputation with {{faction}} has taken a serious hit.-->
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
  After a bit of subtle back and forth, the patrol's captain intimates that they could use {{$csn(bribeAmount)}} for "repairs to their tracking systems".
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
  props: ['nearest', 'faction'],

  data() {
    const faction = this.faction || util.oneOf(['UN', 'MC', 'CERES', 'JFT', 'TRANSA']);

    const npc = new NPC({
      name:          'Pirate',
      faction:       faction,
      ship:          ['shuttle', 'schooner', 'cutter', 'guardian', 'corvette'],
      always_addons: ['pds'],
      addons:        ['railgun_turret', 'light_torpedo', 'ecm', 'armor'],
      min_addons:    2,
    });

    const ship_value = npc.ship.shipValue(window.game.here.pricing) + npc.ship.addOnValue();
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
      return tc.executePlunder(this.game.player.ship, this.npc.ship);
    },

    done(result, rounds) {
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
        this.$emit('done', Math.max(rounds || 0, 0));
      }
    },
  },

  template: `
    <div class="p-3">
      <div v-if="choice=='ready'">
        <p>
          The lights go dim as an emergency klaxxon warns you that your ship has been
          targeted by an incoming pirate <b class="text-warning">{{$caps(npc.ship.type)}}</b>.
          Its transponder is off, but its make and markings suggest that may be aligned
          with {{npc.faction.abbrev}}, indicating that it might be a privateer. Of course,
          the ship could just as easily have been stolen.

          Before long, the radio begins to chirp, notifying you of the pirate's ultimatum.
        </p>

        <button type="button" class="btn btn-dark w-100" @click="setChoice('flee')">Flee</button>
        <button type="button" class="btn btn-dark w-100" @click="setChoice('submit')">Surrender ship</button>
        <button type="button" class="btn btn-dark w-100" @click="setChoice('attack')">Defend yourself</button>
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
        credited {{$csn(bounty)}} credits, effective as soon as light from
        the event reaches the nearest patrol. As a result, your standing
        with {{nearest_faction}} has increased.
      </ok>
    </div>
  `,
});
