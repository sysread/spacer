<template>
    <Section notitle=1>
      <div v-if="inDev" class="btn-toolbar" id="navcomp-toolbar">
        <div class="btn-group">
          <btn v-if="paused" :disabled="encounter" @click="resume()">Resume</btn>
          <btn v-else :disabled="encounter" @click="pause()">Pause</btn>
        </div>
      </div>

      <template v-if="plan">
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

          <!-- _renderTick dependency forces Vue to re-render when the tween
               updates non-reactive state (layout center/FOV, _bodySubStep). -->
          <SvgPlot v-if="layout && layout.width_px > 0 && started" :width="layout.width_px + _renderTick * 0" :height="layout.height_px">
            <line x1=130 y1=13 :x2="patrolpct * layout.width_px + 130" y2=13 stroke="green" stroke-width="14" />
            <text style="fill:red; font:12px monospace" x=5 y=17>Patrol:&nbsp;{{$pct(patrolRate, 2)}}</text>

            <line x1=130 y1=30 :x2="piracypct * layout.width_px + 130" y2=30 stroke="red" stroke-width="14" />
            <text style="fill:red; font:12px monospace" x=5 y=34>Piracy:&nbsp;{{$pct(piracyRate, 2)}}</text>

            <text style="fill:red; font:12px monospace" x=5 y=51>FoV:&nbsp;&nbsp;&nbsp;&nbsp;{{displayFoV}}</text>
            <text style="fill:red; font:12px monospace" x=5 y=51>FoV:&nbsp;&nbsp;&nbsp;&nbsp;{{displayFoV}}</text>
            <text style="fill:red; font:12px monospace" x=5 y=68>&Delta;V:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{$unit($R(plan.accel_g, 3), 'G')}}</text>

            <!-- Destination orbital arc for the transit period -->
            <SvgPath
              :points="destOrbitArc.filter(p => p).map(p => layout.scale_point(p))"
              color="#844" line="0.75px" smooth />

            <g v-for="body in system.all_bodies()" :key="body">
              <SvgPatrolRadius :body="body" :coords="bodyPosition(body)" :layout="layout" :intvl="intvl" />
              <SvgPlotPoint :body="body" :coords="bodyPosition(body)" :layout="layout" :img="'img/'+body+'.png'" :label="show_label(body)" :intvl="intvl" />
            </g>

            <!-- Trajectory path: dots for each turn of the pre-computed path.
                 Past segments in light blue, future in light grey.
                 Scaled live via layout.scale_point to stay in sync with
                 the current center/FOV. -->
            <!-- Thin line connecting all transit path points, rendered behind the
                 dots to give visual continuity to the trajectory at all zoom levels. -->
            <SvgPath
              :points="plan.path.map(s => layout.scale_point(s.position))"
              color="#555" line="0.75px" smooth />

            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <template v-for="(seg, i) in plan.path" :key="'path-'+i">
              <!-- Flare ring: persists after the turn advances, fades via its own animation -->
              <circle v-if="i <= visualTurn && i > visualTurn - 8"
                :cx="layout.scale_point(seg.position)[0]"
                :cy="layout.scale_point(seg.position)[1]"
                r="1.5" :fill="flareColor(i)" filter="url(#glow)"
                class="transit-flash"
                :style="'animation-delay: -' + (visualTurn - i) * 0.3 + 's'" />

              <!-- Base dot -->
              <circle
                :cx="layout.scale_point(seg.position)[0]"
                :cy="layout.scale_point(seg.position)[1]"
                r="0.75"
                :fill="dotColor(i)"
                :opacity="dotOpacity(i)" />
            </template>

            <!-- Ship icon removed; the flare dot on the current turn serves
                 as the ship's visual position. -->
          </SvgPlot>

          <!-- Docking overlay: shown on the frozen map after the final turn -->
          <div v-if="docking" class="transit-docking">Docking</div>
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
    // Build high-resolution orbit data by interpolating between per-turn
    // positions. At close zoom, the linear tweens between per-turn orbit
    // points are visibly jerky (especially for fast-orbiting moons like Luna).
    // Interpolating 4x gives smooth curved motion at all zoom levels.
    const ORBIT_SUBSTEPS = 4;

    // Shared between the speed curve and the FOV calculation: number of
    // turns at the start/end of transit that get cinematic treatment
    // (slower animation, tighter zoom including nearby path points).
    // 5 days gives ~20 turns at 6h/turn — enough granularity for smooth
    // zoom transitions during approach/departure.
    const CLOSE_RANGE = data.turns_per_day * 5;
    const orbitsRaw = {};
    const orbitsHiRes = {};
    for (const body of system.all_bodies()) {
      const raw = [...system.orbit_by_turns(body)];
      orbitsRaw[body] = raw;

      const hiRes = [];
      for (let i = 0; i < raw.length - 1; i++) {
        const a = raw[i];
        const b = raw[i + 1];
        for (let s = 0; s < ORBIT_SUBSTEPS; s++) {
          const t = s / ORBIT_SUBSTEPS;
          hiRes.push([
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t,
          ]);
        }
      }
      hiRes.push(raw[raw.length - 1]);
      orbitsHiRes[body] = hiRes;
    }
    const orbits = orbitsRaw;

    const turns = game.transit_plan.turns;
    const plan = game.transit_plan;

    // Pre-compute per-turn animation intervals. Close-range turns (first/last
    // ~3 days) get a fixed cinematic pace outside the time budget. Cruise turns
    // share a distance-proportional time budget (1 AU ≈ 3.5s). This prevents
    // the serene approach/departure from stealing time from cruise, which would
    // compress the mid-transit pacing into a frantic rush.
    const turnIntervals = (() => {
      const SEC_PER_AU = 3.5;
      const CLOSE_INTERVAL = 0.60;  // fixed interval for close-range turns
      const distAU = Physics.distance(plan.path[0].position, plan.path[turns].position) / Physics.AU;
      const cruiseTarget = util.clamp(distAU * SEC_PER_AU, 5, 30);

      const maxVel = plan.maxVelocity || 1;
      const closeRange = CLOSE_RANGE;

      // Classify each turn as close-range or cruise, and compute raw
      // cruise intervals based on velocity (fast ship = short interval).
      const intervals = [];
      const cruiseRaw = [];

      for (let i = 0; i <= turns; i++) {
        const fromEdge = Math.min(i, turns - i);

        if (fromEdge < closeRange) {
          // Close-range: fixed pace with smoothstep easing toward cruise.
          // Turns right at the edge are slowest; turns near closeRange
          // boundary blend toward the cruise speed.
          const t = fromEdge / closeRange;
          const ease = t * t * (3 - 2 * t);
          intervals.push({ type: 'close', ease });
        } else {
          // Cruise: interval based on velocity, will be scaled to fit budget
          const seg = plan.path[i];
          const speed = seg ? seg.velocity / maxVel : 0.5;
          // Invert: high speed → small raw value (fast), low speed → large
          const raw = 1 - speed * 0.9; // 0.1 at peak, 1.0 at zero speed
          intervals.push({ type: 'cruise', raw });
          cruiseRaw.push({ idx: i, raw });
        }
      }

      // Scale cruise intervals to fit the distance-proportional time budget
      const cruiseRawTotal = cruiseRaw.reduce((a, b) => a + b.raw, 0) || 1;
      const cruiseScale = cruiseTarget / cruiseRawTotal;

      // Build final interval array
      return intervals.map(entry => {
        if (entry.type === 'close') {
          // Blend from CLOSE_INTERVAL at the edge toward the average cruise
          // interval at the boundary, so there's no sharp speed change.
          const avgCruise = cruiseTarget / (cruiseRaw.length || 1);
          return CLOSE_INTERVAL + (avgCruise - CLOSE_INTERVAL) * entry.ease;
        } else {
          return entry.raw * cruiseScale;
        }
      });
    })();

    return {
      layout_scaling:    false,
      layout_target_id:  'transit-plot-root',
      transit:           null,
      paused:            true,
      encounter:         null,
      encounters:        0,
      orbitsHiRes:       orbitsHiRes,
      orbitSubsteps:     ORBIT_SUBSTEPS,
      closeRange:        CLOSE_RANGE,
      orbits:            orbits,
      started:           false,
      arriving:          false,
      docking:           false,

      lastPhase:         null, // track phase transitions
      encounterTimeCost: null,
      encounterDistCost: null,
      encounterFuelCost: null,
      enteredParentTerritory: false,
      turnIntervals:         turnIntervals,

      // Visual turn: used for dot rendering instead of plan.current_turn.
      // Updated inside the tween's onComplete so dots change at the same
      // moment the ship arrives at the new position, not before.
      visualTurn:        0,

      // Reactive render trigger. Incremented in onUpdate to force Vue to
      // re-render the template after ALL non-reactive state (layout center/FOV,
      // _bodySubStep) has been set. Using a single counter instead of multiple
      // reactive values prevents partial-state re-renders.
      _renderTick:       0,

      // animated values
      patrolpct:         0,
      piracypct:         0,
    };
  },

  // Non-reactive body sub-step. Stored outside Vue's reactivity system
  // so that changes during the tween don't trigger premature re-renders.
  // Body positions are updated imperatively in the tween's onUpdate,
  // which prevents the one-frame backward jump that occurred when Vue
  // re-rendered between setting bodySubStep=0 and the first onUpdate.
  created() {
    this._bodySubStep = 0;
  },

  /* No watcher on plan.current_turn. The animation loop is driven by
   * interval() → update() → tween onComplete → interval(). A watcher
   * would fire synchronously when interval() advances the turn, starting
   * a new tween before the current one completes — causing overlapping
   * animations and jerkiness. */

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

      // Per-turn intervals are pre-computed in data() so the total
      // animation time is proportional to the trip distance (1 AU ≈ 3s).
      // The curve uses smoothstep for steep transitions at the edges
      // and a fast plateau in the middle.
      return this.turnIntervals[this.plan.current_turn] || 0.1;
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
      const origPos = this.bodyPositionTurn(origBody);
      const destPos = this.bodyPositionTurn(destBody);

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

    // Bodies whose orbital paths are drawn on the transit map
    orbitBodies() {
      const bodies = new Set();
      bodies.add(this.plan.origin);
      bodies.add(this.plan.dest);
      if (this.destIsMoon) bodies.add(system.central(this.plan.dest));
      if (this.origIsMoon) bodies.add(system.central(this.plan.origin));
      // Filter out sun (stationary at origin) and bodies without orbit data
      return [...bodies].filter(b => b !== 'sun' && this.orbits[b]);
    },

    // Destination orbit arc: from the current sub-step to the end of transit.
    // Uses the hi-res orbit data so the arc tracks smoothly with the body's
    // displayed position (which also uses hi-res sub-steps).
    destOrbitArc() {
      if (!this.plan || this.arriving) return [];
      const orbit = this.orbitsHiRes[this.plan.dest];
      if (!orbit) return [];
      const startIdx = Math.floor(this.plan.current_turn * this.orbitSubsteps + this._bodySubStep);
      const endIdx = this.plan.turns * this.orbitSubsteps;
      return orbit.slice(
        Math.min(startIdx, orbit.length - 1),
        Math.min(endIdx + 1, orbit.length)
      );
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
          const body = this.origIsMoon ? system.central(this.plan.origin) : this.plan.origin;
          return this.bodyPositionTurn(body);
        }

        case 'cruise': {
          const origBody = this.origIsMoon ? system.central(this.plan.origin) : this.plan.origin;
          const destBody = this.destIsMoon ? system.central(this.plan.dest) : this.plan.dest;
          const origPos = this.bodyPositionTurn(origBody);
          const destPos = this.bodyPositionTurn(destBody);
          return [
            (origPos[0] + destPos[0]) / 2,
            (origPos[1] + destPos[1]) / 2,
            (origPos[2] + destPos[2]) / 2,
          ];
        }

        case 'arrive': {
          const body = this.destIsMoon ? system.central(this.plan.dest) : this.plan.dest;
          return this.bodyPositionTurn(body);
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
            const parentPos = this.bodyPositionTurn(target);
            const moonPos = this.bodyPositionTurn(b);
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
            const parentPos = this.bodyPositionTurn(target);
            const moonPos = this.bodyPositionTurn(b);
            const dist = Physics.distance(moonPos, parentPos);
            const radius = dist + this.game.planets[b].encounters.patrolRadius() * Physics.AU;
            if (radius > maxDist) maxDist = radius;
          }
        }
        return maxDist;
      }

      return 0;
    },

    // Returns the orbital radius (in AU) of the outermost moon orbiting
    // the given parent body. Used to set the FOV floor during approach/departure
    // so that all moons in a system (e.g. all Jovian moons) are visible.
    _maxMoonOrbitRadius(parentBody) {
      const centerPos = this.bodyPositionTurn(parentBody);
      let maxDist = 0;

      for (const body of this.system.all_bodies()) {
        if (system.central(body) === parentBody) {
          const moonPos = this.bodyPositionTurn(body);
          const dist = Physics.distance(moonPos, centerPos) / Physics.AU;
          if (dist > maxDist) maxDist = dist;
        }
      }

      return maxDist;
    },

    // Returns the distance (in AU) from centerPos to the farthest remaining
    // transit path point. Used to prevent the FOV from clipping the trajectory
    // during stern chases where the ship trails the destination.
    _farthestRemainingPathDist(centerPos) {
      let maxDist = 0;
      for (let i = this.plan.current_turn; i <= this.plan.turns; i++) {
        const seg = this.plan.path[i];
        if (seg) {
          const dist = Physics.distance(seg.position, centerPos) / Physics.AU;
          if (dist > maxDist) maxDist = dist;
        }
      }
      return maxDist;
    },

    // Returns the distance (in AU) from centerPos to the farthest path point
    // within the close-range window at the START of the transit. Used during
    // depart phase so the FOV includes the initial trajectory segment,
    // preventing the origin from flying off-screen as the ship's vector
    // diverges from the origin's orbit.
    _farthestDepartPathDist(centerPos) {
      let maxDist = 0;
      const endTurn = Math.min(this.plan.current_turn + this.closeRange, this.plan.turns);
      for (let i = this.plan.current_turn; i <= endTurn; i++) {
        const seg = this.plan.path[i];
        if (seg) {
          const dist = Physics.distance(seg.position, centerPos) / Physics.AU;
          if (dist > maxDist) maxDist = dist;
        }
      }
      return maxDist;
    },

    // Finds the FOV at which the body's displayed image fills `fraction`
    // of the viewport's smaller dimension. Uses binary search because
    // scale_body_diameter is non-linear (boost factors + log scaling).
    // Temporarily mutates layout._fov_au during the search and restores it.
    _bodyProminenceFov(body, isMoon) {
      const target = isMoon ? system.central(body) : body;
      const targetPx = 0.175 * (this.layout.scale_px || 400);
      const origFov = this.layout._fov_au;

      // Binary search for the FOV where displayed diameter >= targetPx.
      // lo = most zoomed in (smallest FOV), hi = most zoomed out.
      let lo = 0.0001;
      let hi = 2.0;

      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        this.layout._fov_au = mid;
        const diam = this.layout.scale_body_diameter(target);
        if (diam >= targetPx) {
          lo = mid; // body still big enough, try zooming out more
        } else {
          hi = mid; // body too small, zoom in
        }
      }

      this.layout._fov_au = origFov;
      return lo;
    },

    // Trajectory dot color: past dots colored by speed, future is grey
    dotColor(i) {
      if (i < this.visualTurn) return '#6af';
      return '#555';
    },

    // Flare color based on ship's velocity at that turn.
    // Blue at low speed → white at mid → yellow/orange at peak.
    flareColor(i) {
      const seg = this.plan.path[i];
      if (!seg) return '#ffdd44';
      const maxVel = this.plan.maxVelocity || 1;
      const t = Math.min(seg.velocity / maxVel, 1); // 0..1

      // Interpolate: blue(0) → white(0.5) → orange(1)
      if (t < 0.5) {
        const u = t * 2; // 0..1 within first half
        const r = Math.round(100 + 155 * u);
        const g = Math.round(170 + 85 * u);
        const b = Math.round(255 - 55 * u);
        return `rgb(${r},${g},${b})`;
      } else {
        const u = (t - 0.5) * 2; // 0..1 within second half
        const r = Math.round(255);
        const g = Math.round(255 - 80 * u);
        const b = Math.round(200 - 156 * u);
        return `rgb(${r},${g},${b})`;
      }
    },

    // Trajectory dot opacity: comet tail fades behind the ship.
    // The most recent 20 turns are fully visible, then fade over the next 30.
    dotOpacity(i) {
      if (i >= this.visualTurn) return 1; // future dots: full opacity

      const age = this.visualTurn - i;
      const tailLength = 20; // fully visible portion
      const fadeLength = 30; // fading portion

      if (age <= tailLength) return 1;
      if (age >= tailLength + fadeLength) return 0;

      return 1 - (age - tailLength) / fadeLength;
    },

    // Body position from the orbit cache at the current transit turn.
    // Returns the body's position from the high-resolution orbit cache,
    // using the current turn + sub-step for smooth inter-turn motion.
    // Falls back to the per-turn cache for center/FOV calculations that
    // don't need sub-step resolution (via bodyPositionTurn).
    bodyPosition(body) {
      const orbit = this.orbitsHiRes[body];
      if (!orbit) return system.position(body);

      // bodySubStep is tweened as a float by GSAP. Instead of flooring to a
      // discrete index (which causes visible jumps), interpolate between the
      // two adjacent hi-res positions for perfectly smooth motion that stays
      // in sync with the ship's tween.
      const rawIdx = this.plan.current_turn * this.orbitSubsteps + this._bodySubStep;
      const maxIdx = orbit.length - 1;
      const lo = Math.min(Math.floor(rawIdx), maxIdx);
      const hi = Math.min(lo + 1, maxIdx);
      const frac = rawIdx - Math.floor(rawIdx);

      const a = orbit[lo];
      const b = orbit[hi];
      return [
        a[0] + (b[0] - a[0]) * frac,
        a[1] + (b[1] - a[1]) * frac,
        a[2] + (b[2] - a[2]) * frac,
      ];
    },

    // Per-turn resolution position, used by center/FOV calculations where
    // sub-step precision isn't needed and would cause jitter.
    bodyPositionTurn(body) {
      const orbit = this.orbits[body];
      if (!orbit) return system.position(body);
      const turn = Math.min(this.plan.current_turn, orbit.length - 1);
      return orbit[turn];
    },

    // Tween the view from current center/FOV to new targets, then resume transit.
    // Without this, phase transitions (depart→cruise, cruise→arrive) cause the
    // center and FOV to snap instantly while the turn animation is still running,
    // creating a race where the ship and destination get pushed off-screen because
    // the pan hasn't finished before the next turn's animation batch starts.
    transitionView(targetCenter, targetFov, callback) {
      const state = {
        cx: this._lastCenter ? this._lastCenter[0] : targetCenter[0],
        cy: this._lastCenter ? this._lastCenter[1] : targetCenter[1],
        cz: this._lastCenter ? this._lastCenter[2] : targetCenter[2],
        fov: this.layout.fov_au || targetFov,
      };

      Tween(state, 1.5, {
        cx: targetCenter[0],
        cy: targetCenter[1],
        cz: targetCenter[2],
        fov: targetFov,
        onUpdate: () => {
          this.layout.set_center([state.cx, state.cy, state.cz]);
          this.layout.set_fov_au(state.fov);
        },
        onComplete: () => {
          this.layout.set_center(targetCenter);
          this.layout.set_fov_au(targetFov);
          this.$forceUpdate();
          callback();
        },
      }).play();
    },

    update(preTurnCenter, preTurnFov) {
      const targetCenter = this.center;
      const targetFov = this.fov();
      const currentPhase = this.transitPhase;

      // When the transit phase changes (e.g. depart→cruise), the center point
      // and FOV target change drastically. If we let normal turn processing
      // handle this, the center/FOV snap while the ship tween is mid-flight,
      // causing elements to fly off-screen. Instead, pause the transit and
      // smoothly tween the view to the new phase's targets before resuming.
      if (this.lastPhase && this.lastPhase !== currentPhase) {
        this.lastPhase = currentPhase;
        this.transitionView(targetCenter, targetFov, () => {
          this._lastCenter = targetCenter;
          requestAnimationFrame(() => this.interval());
        });
        return;
      }

      this.lastPhase = currentPhase;
      this._lastCenter = targetCenter;

      // Use the pre-turn center/FOV as the starting point for interpolation.
      // These were captured BEFORE the game state advanced, so they match
      // what was on screen when the previous tween finished. This eliminates
      // the per-turn jerk caused by the layout jumping to the new turn's
      // values before the tween starts interpolating.
      const startFov = preTurnFov || this.layout.fov_au || targetFov;
      const startCenter = preTurnCenter || this._lastCenter || targetCenter;
      // Single unified tween driving a progress value (0→1). The onUpdate
      // callback synchronously updates ALL visual state — center, FOV, ship
      // position, and bodySubStep — in a single operation, then triggers one
      // Vue re-render. This prevents the jerk caused by GSAP and Vue's
      // reactive system updating different things at different times.
      const tweenState = { p: 0 };
      this._bodySubStep = 0;

      Tween(tweenState, this.intvl, {
        p: 1,
        onUpdate: () => {
          const p = tweenState.p;

          // Center and FOV
          const cx = startCenter[0] + (targetCenter[0] - startCenter[0]) * p;
          const cy = startCenter[1] + (targetCenter[1] - startCenter[1]) * p;
          const cz = startCenter[2] + (targetCenter[2] - startCenter[2]) * p;
          this.layout.set_center([cx, cy, cz]);
          this.layout.set_fov_au(startFov + (targetFov - startFov) * p);

          // Body sub-step (drives bodyPosition interpolation).
          // On the final turn, don't advance — the body should stay at
          // the exact transit endpoint position. Advancing would put it
          // (substeps-1)/substeps of a turn past where the path ends,
          // since the hi-res orbit has positions beyond the transit.
          if (this.plan.left > 0) {
            this._bodySubStep = p * (this.orbitSubsteps - 1);
          }

          // Single reactive trigger AFTER all non-reactive state is set.
          // Vue batches this with the next render cycle, which will see
          // consistent layout center/FOV and _bodySubStep values.
          this._renderTick++;
        },
        onComplete: () => {
          this.layout.set_center(targetCenter);
          this.layout.set_fov_au(targetFov);
          // Don't reset _bodySubStep here — leave it at substeps-1 until
          // the next update() sets it to 0 synchronously before the new
          // tween starts. Resetting here caused a one-frame backward jump
          // because Vue would re-render with _bodySubStep=0 before the
          // next tween's onUpdate could advance it.
          this.visualTurn = this.plan.current_turn;
          this._renderTick++;
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
      const origPos = this.bodyPositionTurn(origBody);
      const destPos = this.bodyPositionTurn(destBody);
      const centerPos = this.center;
      const shipDist = Physics.distance(this.plan.coords, centerPos) / Physics.AU;
      const halfDist = Physics.distance(origPos, destPos) / Physics.AU / 2;

      // For sub-system transits (moon to moon within the same system),
      // origBody == destBody so halfDist is 0. Include the outermost moon
      // orbit so the full system is visible during the transit.
      let systemFov = 0;
      if (this.isSubSystemTransit) {
        const parent = this.origIsMoon ? system.central(this.plan.origin) : this.plan.origin;
        systemFov = this._maxMoonOrbitRadius(parent) * 1.20;
      }

      return Math.max(halfDist, shipDist, systemFov) * 1.10;
    },

    /**
     * FOV (half-width in AU) for each transit phase.
     *
     * Depart/arrive: FOV tracks the ship's distance from center with a
     * small buffer (20%), dynamically zooming in as the ship approaches.
     * For moons, the FOV floors at the moon's orbital radius so the
     * parent planet and orbiting moons remain visible. For planets,
     * the FOV floors at the patrol radius (the inner visible sphere).
     *
     * The phase transition tween in transitionView() handles the
     * smooth pan-and-zoom between phases — fov() just returns the
     * target for the current phase, not a blended value.
     */
    fov() {
      if (!this.plan) return 1;

      // 20% buffer keeps the ship from sitting right at the viewport edge.
      // This is deliberately smaller than the old APPROACH_MARGIN (3.0) so
      // the view zooms close enough to see planet/moon images during approach.
      const EDGE_BUFFER = 1.20;

      const centerPos = this.center;
      const shipDist = Physics.distance(this.plan.coords, centerPos) / Physics.AU;

      switch (this.transitPhase) {
        case 'depart': {
          // Four constraints for the depart FOV floor:
          // 1) All moons in the system must be visible
          // 2) The central body should fill ~17.5% of the viewport
          // 3) The initial trajectory segment (closeRange turns) must be
          //    visible so the origin doesn't fly off-screen as the ship's
          //    departure vector diverges from the origin's orbital path
          // 4) Ship must be visible with buffer
          const origParent = this.origIsMoon ? system.central(this.plan.origin) : this.plan.origin;
          const moonFov = this._maxMoonOrbitRadius(origParent) * EDGE_BUFFER;
          const bodyFov = this._bodyProminenceFov(this.plan.origin, this.origIsMoon);
          const pathFov = this._farthestDepartPathDist(centerPos) * EDGE_BUFFER;
          const minFov = Math.max(moonFov, bodyFov, pathFov);
          return Math.min(Math.max(shipDist * EDGE_BUFFER, minFov), this.cruiseFov());
        }

        case 'cruise': {
          return this.cruiseFov();
        }

        case 'arrive': {
          // Four constraints for the arrive FOV floor:
          // 1) All moons in the destination system visible
          // 2) Central body fills ~17.5% of viewport
          // 3) Patrol radius visible
          // 4) All remaining transit path points visible (stern chase)
          const destParent = this.destIsMoon ? system.central(this.plan.dest) : this.plan.dest;
          const destMoonFov = this._maxMoonOrbitRadius(destParent) * EDGE_BUFFER;
          const destBodyFov = this._bodyProminenceFov(this.plan.dest, this.destIsMoon);
          const farthestPathDist = this._farthestRemainingPathDist(centerPos) * EDGE_BUFFER;
          const arriveMinFov = Math.max(destMoonFov, destBodyFov, farthestPathDist);

          return Math.min(
            Math.max(shipDist * EDGE_BUFFER, arriveMinFov),
            this.cruiseFov()
          );
        }
      }
    },

    layout_resize() {
      this.layout.update_width();
    },

    layout_set() {
      // Start with a full solar system view so all SVG elements mount
      // in a stable coordinate frame before any animation begins.
      this.layout.set_center([0, 0, 0]);
      this.layout.set_fov_au(6);
      this.started = true;

      const targetCenter = this.center;
      const targetFov = this.fov();

      // Wait for Vue to render the initial solar system view, then
      // animate from it to the departure view. Using $nextTick ensures
      // the DOM is stable before the tween starts — no arbitrary delays.
      this.$nextTick(() => {
        const state = {
          cx: 0, cy: 0, cz: 0,
          fov: 6,
        };

        Tween(state, 1.5, {
          cx: targetCenter[0],
          cy: targetCenter[1],
          cz: targetCenter[2],
          fov: targetFov,
          onUpdate: () => {
            this.layout.set_center([state.cx, state.cy, state.cz]);
            this.layout.set_fov_au(state.fov);
          },
          onComplete: () => {
            // Snap to exact target values after tween finishes
            this.layout.set_center(targetCenter);
            this.layout.set_fov_au(targetFov);

            // Initialize phase tracking so the first call to update() sees
            // the current phase as "already active" and doesn't trigger a
            // transition animation. Without this, the depart phase would
            // immediately detect a lastPhase mismatch and re-tween the view.
            this.lastPhase = this.transitPhase;
            this._lastCenter = targetCenter;

            // Start transit on the next animation frame after the tween's
            // final state has been rendered. No setTimeout — the tween's
            // onComplete is the deterministic "go signal".
            this.$forceUpdate();
            requestAnimationFrame(() => this.resume());
          },
        }).play();
      });
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

      // Capture pre-turn layout state so the tween can interpolate
      // smoothly from the current visual state to the new turn's target.
      // Must happen before plan.turn() advances the game state.
      const preTurnCenter = [...this.center];
      const preTurnFov = this.layout.fov_au;

      this.plan.turn();
      this.game.player.ship.burn(this.plan.accel);
      this.game.turn(1, true);

      // Drive the animation directly rather than via a watcher on
      // plan.current_turn, which would fire synchronously and start
      // a new tween before the current one completes.
      this.update(preTurnCenter, preTurnFov);
    },

    complete() {
      this.arriving = true;

      // Freeze the map at the exact final transit position. Set
      // _bodySubStep to 0 with current_turn at the final turn so
      // bodyPosition() returns the clamped final orbit position,
      // matching where the transit path ends. Then trigger one last
      // render so the map shows the correct frozen state.
      this._bodySubStep = 0;
      this.visualTurn = this.plan.current_turn;

      // Set center/FOV to the final arrival state
      const finalCenter = this.center;
      const finalFov = this.fov();
      this.layout.set_center(finalCenter);
      this.layout.set_fov_au(finalFov);
      this._renderTick++;

      // Show "Docking" overlay on the frozen map, then transition.
      this.docking = true;
      setTimeout(() => {
        this.game.arrive();
        this.game.unfreeze();
        this.game.save_game();
        this.$emit('open', 'summary');
      }, 2000);
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

<style>
@keyframes transit-pulse {
  0%   { r: 0.5; opacity: 0.3; }
  5%   { r: 2; opacity: 0.7; }
  15%  { r: 3; opacity: 1; }
  35%  { r: 2.5; opacity: 0.9; }
  65%  { r: 1.5; opacity: 0.4; }
  100% { r: 0; opacity: 0; }
}

.transit-flash {
  animation: transit-pulse 1.2s ease-out forwards;
}

@keyframes docking-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
}

.transit-docking {
  position: absolute;
  top: 15%;
  left: 0;
  right: 0;
  text-align: center;
  font: bold 1.5rem monospace;
  color: #ffdd44;
  text-shadow: 0 0 8px #ffdd44, 0 0 16px #aa8800;
  animation: docking-blink 1s ease-in-out infinite;
  z-index: 10;
  pointer-events: none;
}
</style>
