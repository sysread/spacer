/**
 * conflict - inter-faction blockade system.
 *
 * Conflicts are timed geopolitical events between two factions: a proponent
 * (the aggressor) and a target (the faction being blockaded). While active,
 * a Blockade prevents normal trade between the affected factions and creates
 * smuggling opportunities via Smuggler missions.
 *
 * Architecture:
 *   Condition (abstract) - base timed event with start/end turns and effect
 *     Conflict (abstract) - adds proponent/target faction pair and a unique key
 *       Blockade (concrete) - the only conflict type currently implemented
 *
 *
 * Blockade lifecycle:
 *   1. game.start_conflicts() rolls Blockade.chance() every 3 days per pair
 *   2. On success, blockade.start(turns) sets the duration and installs watchers
 *   3. Active blockades intercept CaughtSmuggling events to apply special
 *      penalties (weapons carry 2x the standing loss during a blockade)
 *   4. Blockade.is_over() extends the parent check: a blockade persists as long
 *      as any player is actively running a Smuggler mission for the target
 *      faction, even past its nominal end turn
 *
 * Chance formula:
 *   - Negative inter-faction standing: abs(standing) / 2000
 *   - Positive inter-faction standing: (log(100) - log(standing)) / 2000
 *   - Zero standing: fixed 0.00025
 *   - A faction cannot blockade itself (proponent == target returns false)
 */

import data from './data';

import { factions } from './faction';
import { watch, CaughtSmuggling } from "./events";
import { Smuggler } from './mission';

import * as t from './common';
import * as util from './util';
import * as FastMath from './fastmath';


declare var window: {
  game: any;
}



interface Duration {
  starts: number;  // game turn when conflict started
  ends:   number;  // game turn when conflict nominally expires
}


abstract class Condition {
  name:      string;
  duration?: Duration;

  constructor(name: string, init: any) {
    this.name     = name;
    this.duration = init.duration;

    if (this.is_started && !this.is_over) {
      this.install_event_watchers();
    }
  }

  abstract get key(): string;
  abstract chance(): boolean;
  abstract install_event_watchers(): void;

  get is_started() {
    return this.duration && this.duration.starts <= window.game.turns;
  }

  get is_over() {
    return this.duration && this.duration.ends <= window.game.turns;
  }

  start(turns: number) {
    this.duration = {
      starts: window.game.turns,
      ends:   window.game.turns + turns,
    };

    this.install_event_watchers();
  }
}


export abstract class Conflict extends Condition {
  proponent: t.faction;  // faction initiating the conflict
  target:    t.faction;  // faction being targeted

  constructor(name: string, init: any) {
    super(name, init);
    this.proponent = init.proponent;
    this.target    = init.target;
  }

  /** Unique key for this conflict instance: "name_proponent_target". */
  get key(): string {
    return [this.name, this.proponent, this.target].join('_');
  }
}


export class Blockade extends Conflict {
  constructor(init: any) {
    super('blockade', init);
  }

  /**
   * A blockade remains active past its nominal end turn if the player has an
   * accepted Smuggler mission originating from a planet controlled by the
   * proponent faction - the blockade can't end while the player is actively
   * running its contraband.
   */
  get is_over() {
    for (const body of t.bodies) {
      const planet = window.game.planets[body];

      for (const contract of planet.contracts) {
        if (contract.mission.is_accepted
         && data.bodies[contract.mission.issuer].faction == planet.faction.abbrev
         && contract.mission instanceof Smuggler) {
          return false;
        }
      }
    }

    return super.is_over;
  }

  /**
   * Returns true if this blockade should start between proponent and target.
   * Probability scales with inter-faction hostility; a faction never blockades
   * itself. See module doc for the full formula.
   */
  chance(): boolean {
    if (this.proponent == this.target)
      return false;

    const standing = data.factions[this.proponent].standing[this.target] || 0;
    let chance = 0;

    if (standing < 0) {
      chance = FastMath.abs(standing) / 2000;
    } else if (standing > 0) {
      chance = (Math.log(100) - Math.log(standing)) / 2000;
    } else {
      chance = 0.00025;
    }

    return util.chance(chance);
  }

  /**
   * Installs a one-shot CaughtSmuggling watcher for the duration of this
   * blockade. The watcher fires penalties on the proponent's behalf when
   * the player is caught carrying goods destined for the target.
   */
  install_event_watchers() {
    watch("caughtSmuggling", (ev: CaughtSmuggling) => {
      const {faction, found} = ev.detail;
      this.violation(faction, found);
      return {complete: true};
    });
  }

  /**
   * Applies blockade violation penalties when the player is caught smuggling
   * to the target faction during an active blockade. Weapons carry double
   * the standing loss versus standard contraband.
   * Returns false to indicate the event should continue propagating.
   */
  violation(faction_name: t.faction, found: t.ResourceCounter) {
    if (!this.is_started || this.is_over)
      return true;

    if (this.target != faction_name)
      return false;

    const faction = factions[faction_name];
    let loss = 0;
    let fine = 0;

    for (let item of Object.keys(found) as t.resource[]) {
      let count = found[item] || 0;
      loss += (item == 'weapons') ? count * 4 : count * 2;
      fine += count * faction.inspectionFine(window.game.player);
      window.game.player.ship.unloadCargo(item, count);
    }

    window.game.player.debit(fine);
    window.game.player.decStanding(this.proponent, loss);
    window.game.notify(`You are in violation of ${this.proponent}'s blockade against ${this.target}. You have been fined ${fine} credits and your standing decreased by ${loss}.`);

    return false;
  }
}
