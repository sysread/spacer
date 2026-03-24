<template>
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
        <table id="navcomp-transit-info" class="table table-sm m-0" :style="{width: show_plot() && layout ? layout.width_px + 'px' : '100%'}"><tbody>
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
        </tbody></table>

        <div v-layout ref="plot" v-show="show_plot()" id="transit-plot-root" :style="layout_css_dimensions" class="plot-root border border-dark">
          <div class="plot-root-bg" :class="bg_class()" :style="bg_css()"></div>

          <SvgPlot v-if="layout && layout.width_px > 0 && started" :width="layout.width_px" :height="layout.height_px">
            <line x1=130 y1=13 :x2="patrolpct * layout.width_px + 130" y2=13 stroke="green" stroke-width="14" />
            <text style="fill:red; font:12px monospace" x=5 y=17>Patrol:&nbsp;{{$pct(patrolRate, 2)}}</text>

            <line x1=130 y1=30 :x2="piracypct * layout.width_px + 130" y2=30 stroke="red" stroke-width="14" />
            <text style="fill:red; font:12px monospace" x=5 y=34>Piracy:&nbsp;{{$pct(piracyRate, 2)}}</text>

            <text style="fill:red; font:12px monospace" x=5 y=51>FoV:&nbsp;&nbsp;&nbsp;&nbsp;{{displayFoV}}</text>
            <text style="fill:red; font:12px monospace" x=5 y=51>FoV:&nbsp;&nbsp;&nbsp;&nbsp;{{displayFoV}}</text>
            <text style="fill:red; font:12px monospace" x=5 y=68>&Delta;V:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{$unit($R(plan.accel_g, 3), 'G')}}</text>

            <g v-for="body in system.all_bodies()" :key="body">
              <SvgPatrolRadius :body="body" :coords="bodyPosition(body)" :layout="layout" :intvl="intvl" />
              <SvgPlotPoint :body="body" :coords="bodyPosition(body)" :layout="layout" :img="'img/'+body+'.png'" :label="show_label(body)" :intvl="intvl" />
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
</template>

<script>
import Physics from '../physics';
import system from '../system';
import data from '../data';
import game from '../game';
import * as util from '../util';
import { NavComp } from '../navcomp';
import Tween from '../tween';
import Layout from './layout';
import * as tc from './transit-controller';

export default {
  mixins: [ Layout ],

  data() {
    // Snapshot the orbit positions at transit start. The system's orbit cache
    // rolls forward each turn (shift+push), so we must copy the arrays to
    // prevent them from drifting out from under us during the transit.
    const orbits = {};
    for (const body of system.all_bodies())
      orbits[body] = [...system.orbit_by_turns(body)];

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
      enteredParentTerritory: false,

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
      setTimeout(() => this.resume(), 300);
    },

    'plan.current_turn': function() {
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

      // Log scale: compresses the range so zoomed-in views (small FOV)
      // don't slow to a crawl. The log of a small FOV produces a large
      // negative number; we negate and scale to get a positive interval
      // that grows slowly as FOV shrinks.
      const min   = 0.12;
      const max   = 0.45;
      const fov   = this.layout.fov_au * 2;
      // Spread the log curve over a wider range so close-in views
      // don't hit the max as quickly. /4 instead of /3 gives a
      // gentler ramp from cruise speed to approach speed.
      const intvl = min + (max - min) * Math.max(0, -Math.log10(fov)) / 4;
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

    /**
     * Transit phase determines the camera behavior:
     *   'depart'  - leaving origin system (centered on origin parent or origin)
     *   'cruise'  - mid-transit (centered on midpoint, shows both endpoints)
     *   'arrive'  - approaching destination (centered on dest parent or dest)
     *
     * Transitions:
     *   depart → cruise: when ship is farther from origin than destination
     *   cruise → arrive: when ship enters destination's patrol radius
     *                    (or dest parent's patrol radius for moons)
     */
    // The larger sphere of influence for phase transitions.
    // For moons, use the parent planet's piracy radius if it's a game planet.
    // If the parent isn't a game planet (e.g. Jupiter), use the maximum
    // piracy radius of any sibling moon in that system as a proxy.
    destInfluenceRadius() {
      return this._influenceRadius(this.plan.dest, this.destIsMoon);
    },

    origInfluenceRadius() {
      return this._influenceRadius(this.plan.origin, this.origIsMoon);
    },

    transitPhase() {
      // Once we latch into arrive phase, stay there
      if (this.enteredParentTerritory) return 'arrive';

      const origBody = this.origIsMoon ? system.central(this.plan.origin) : this.plan.origin;
      const destBody = this.destIsMoon ? system.central(this.plan.dest) : this.plan.dest;
      const origPos = this.bodyPosition(origBody);
      const destPos = this.bodyPosition(destBody);

      const shipToOrig = Physics.distance(this.plan.coords, origPos);
      const shipToDest = Physics.distance(this.plan.coords, destPos);

      // Arrive: entered destination's influence sphere (piracy radius)
      if (shipToDest <= this.destInfluenceRadius) {
        this.enteredParentTerritory = true;
        return 'arrive';
      }

      // Depart: still within origin's patrol radius (the visible sphere)
      const origPatrol = this._patrolRadius(this.plan.origin, this.origIsMoon);
      if (shipToOrig <= origPatrol) return 'depart';

      return 'cruise';
    },

    destIsMoon() {
      return system.central(this.plan.dest) != 'sun';
    },

    origIsMoon() {
      return system.central(this.plan.origin) != 'sun';
    },

    center() {
      if (!this.plan) return [0, 0, 0];

      const _turn = this.game.turns; // reactive trigger

      switch (this.transitPhase) {
        case 'depart': {
          // Mirror of arrive: center on origin body (or parent for moons)
          const body = this.origIsMoon ? system.central(this.plan.origin) : this.plan.origin;
          return this.bodyPosition(body);
        }

        case 'cruise': {
          const origBody = this.origIsMoon ? system.central(this.plan.origin) : this.plan.origin;
          const destBody = this.destIsMoon ? system.central(this.plan.dest) : this.plan.dest;
          const origPos = this.bodyPosition(origBody);
          const destPos = this.bodyPosition(destBody);
          return [
            (origPos[0] + destPos[0]) / 2,
            (origPos[1] + destPos[1]) / 2,
            (origPos[2] + destPos[2]) / 2,
          ];
        }

        case 'arrive': {
          const body = this.destIsMoon ? system.central(this.plan.dest) : this.plan.dest;
          return this.bodyPosition(body);
        }
      }
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

    // Compute influence radius for a body. For moons whose parent isn't
    // a game planet (e.g. Jupiter), use the largest piracy radius among
    // sibling moons orbiting that parent as a proxy.
    _influenceRadius(body, isMoon) {
      const target = isMoon ? system.central(body) : body;

      // Direct: parent or body is a game planet
      if (this.game.planets[target]) {
        return this.game.planets[target].encounters.piracyRadius() * Physics.AU;
      }

      // Fallback for non-game parents: find the farthest sibling moon's
      // orbital distance from the parent as the influence boundary
      if (isMoon) {
        let maxDist = 0;
        for (const b of this.system.all_bodies()) {
          if (system.central(b) === target && this.game.planets[b]) {
            const parentPos = this.bodyPosition(target);
            const moonPos = this.bodyPosition(b);
            const dist = Physics.distance(moonPos, parentPos);
            // Use the moon's piracy radius added to its orbital distance
            const radius = dist + this.game.planets[b].encounters.piracyRadius() * Physics.AU;
            if (radius > maxDist) maxDist = radius;
          }
        }
        return maxDist;
      }

      return 0;
    },

    // Patrol radius (the visible sphere) for phase transition detection.
    // Same fallback logic as _influenceRadius but uses patrolRadius.
    _patrolRadius(body, isMoon) {
      const target = isMoon ? system.central(body) : body;

      if (this.game.planets[target]) {
        return this.game.planets[target].encounters.patrolRadius() * Physics.AU;
      }

      if (isMoon) {
        let maxDist = 0;
        for (const b of this.system.all_bodies()) {
          if (system.central(b) === target && this.game.planets[b]) {
            const parentPos = this.bodyPosition(target);
            const moonPos = this.bodyPosition(b);
            const dist = Physics.distance(moonPos, parentPos);
            const radius = dist + this.game.planets[b].encounters.patrolRadius() * Physics.AU;
            if (radius > maxDist) maxDist = radius;
          }
        }
        return maxDist;
      }

      return 0;
    },

    // Body position from the orbit cache at the current transit turn.
    // Uses the same pre-computed orbital data as the ship trajectory,
    // keeping bodies and ship in the same reference frame.
    bodyPosition(body) {
      const orbit = this.orbits[body];
      if (!orbit) return system.position(body);
      const turn = Math.min(this.plan.current_turn, orbit.length - 1);
      return orbit[turn];
    },

    update() {
      // Update center and FOV BEFORE computing pixel coords so the ship
      // position is calculated in the correct coordinate frame.
      this.layout.set_center(this.center);
      this.layout.set_fov_au(this.fov());

      const [x, y] = this.layout.scale_point(this.plan.coords);

      Tween(this.$data, this.intvl, {
        patrolpct:  this.patrolRate,
        piracypct:  this.piracyRate,
        shipx:      x,
        shipy:      y,
        onComplete: () => {
          requestAnimationFrame(() => this.interval());
        },
      }).play();
    },

    // Cruise FOV: shows both origin and destination with margin.
    // Computed separately so depart/arrive can blend toward it.
    cruiseFov() {
      if (!this.plan) return 1;
      const origBody = this.origIsMoon ? system.central(this.plan.origin) : this.plan.origin;
      const destBody = this.destIsMoon ? system.central(this.plan.dest) : this.plan.dest;
      const origPos = this.bodyPosition(origBody);
      const destPos = this.bodyPosition(destBody);
      const centerPos = this.center;
      const shipDist = Physics.distance(this.plan.coords, centerPos) / Physics.AU;
      const halfDist = Physics.distance(origPos, destPos) / Physics.AU / 2;
      return Math.max(halfDist, shipDist) * 1.10;
    },

    /**
     * FOV (half-width in AU) for each transit phase.
     *
     * The APPROACH_MARGIN constant controls the buffer around the ship
     * and destination during depart and arrive phases.
     *
     * Depart and arrive FOVs are floored at the cruise FOV to prevent
     * abrupt zoom changes at phase transitions — the view smoothly
     * zooms out from close-in to cruise scale, then back in.
     */
    fov() {
      if (!this.plan) return 1; // default 1 AU before transit plan exists

      const APPROACH_MARGIN = 1.50;

      const centerPos = this.center;
      const shipDist = Physics.distance(this.plan.coords, centerPos) / Physics.AU;

      switch (this.transitPhase) {
        case 'depart': {
          let localFov;
          if (this.origIsMoon) {
            const moonPos = this.bodyPosition(this.plan.origin);
            const moonDist = Physics.distance(moonPos, centerPos) / Physics.AU;
            localFov = Math.max(shipDist, moonDist) * APPROACH_MARGIN;
          } else {
            localFov = Math.max(shipDist * APPROACH_MARGIN, 0.002);
          }
          // Smooth transition: never exceed cruise FOV (zoom out gradually)
          return Math.min(localFov, this.cruiseFov());
        }

        case 'cruise': {
          return this.cruiseFov();
        }

        case 'arrive': {
          let localFov;
          if (this.destIsMoon) {
            const moonPos = this.bodyPosition(this.plan.dest);
            const moonDist = Physics.distance(moonPos, centerPos) / Physics.AU;
            localFov = Math.max(shipDist, moonDist) * APPROACH_MARGIN;
          } else {
            localFov = Math.max(shipDist * APPROACH_MARGIN, 0.001);
          }
          // Smooth transition: never exceed cruise FOV (zoom in gradually)
          return Math.min(localFov, this.cruiseFov());
        }
      }
    },

    layout_resize() {
      this.layout.update_width();
    },

    layout_set() {
      // Set center and FOV first so the layout is at the correct scale
      // when the SVG components mount.
      this.layout.set_center(this.center);
      this.layout.set_fov_au(this.fov());

      // Delay setting started so the layout has time to render at the
      // correct scale before the transit begins animating.
      setTimeout(() => {
        // Re-apply in case the layout dimensions changed during the delay
        this.layout.set_center(this.center);
        this.layout.set_fov_au(this.fov());
        this.started = true;
      }, 500);
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
      if (!this.plan || this.plan.is_complete) {
        this.complete();
        return;
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
      this.encounterTimeCost = null;
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
};
</script>
