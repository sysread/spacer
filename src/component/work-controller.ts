/**
 * work-controller - extracted logic for the work and contracts UI.
 *
 * Pure TypeScript, fully testable. The Vue component delegates to these
 * controllers for state management and business logic.
 */

import data from '../data';
import { Blockade } from '../conflict';
import { Planet } from '../planet';
import { Person } from '../person';
import Store from '../store';
import * as t from '../common';


declare var window: { game: any; }


/** Available contracts grouped by mission type, sorted by distance. */
export function gatherContracts(
  planet: Planet,
  planets: { [key: string]: Planet },
  conflicts: any[],
): { [type: string]: any[] } {
  const contracts: { [type: string]: any[] } = {};

  // Local contracts
  for (const c of planet.state.contracts) {
    if (c.mission.is_accepted) continue;

    if (!contracts[c.mission.mission_type]) {
      contracts[c.mission.mission_type] = [];
    }

    contracts[c.mission.mission_type].push(c);
  }

  // Remote contracts (smuggling) from friendly/black market planets
  PLANET: for (const p of Object.values(planets) as Planet[]) {
    if (p.body == planet.body) continue;

    if (!planet.hasTrait('black market')
     && !planet.faction.hasStanding(p.faction, 'Friendly'))
      continue;

    for (const conflict of conflicts) {
      if (conflict.target == planet.faction.abbrev
       && conflict.proponent == p.faction.abbrev
       && conflict instanceof Blockade) {
        continue PLANET;
      }
    }

    for (const c of p.state.contracts) {
      if (c.mission.is_accepted) continue;
      if (!c.mission.can_accept_remotely) continue;

      if (!contracts[c.mission.mission_type]) {
        contracts[c.mission.mission_type] = [];
      }

      contracts[c.mission.mission_type].push(c);
    }
  }

  // Sort each type by distance from current planet
  for (const type of Object.keys(contracts)) {
    contracts[type].sort((a: any, b: any) => {
      const a_key = planet.distance(a.mission.issuer);
      const b_key = planet.distance(b.mission.issuer);
      return a_key < b_key ? -1 : a_key > b_key ? 1 : 0;
    });
  }

  return contracts;
}


/** Computes pay for a work task at a planet. */
export function computePayRate(planet: Planet, player: Person, task: t.Work): number {
  return planet.labor.payRate(player, task);
}

/** Computes total pay for a number of days. */
export function computeTotalPay(payRate: number, days: number): number {
  return payRate * days;
}

/** Converts days to game turns. */
export function daysToTurns(days: number): number {
  return days * (24 / data.hours_per_turn);
}

/** Work progress as a percentage [0, 100]. */
export function workProgress(turnsWorked: number, totalTurns: number): number {
  return Math.min(100, Math.ceil(turnsWorked / totalTurns * 100));
}

/** Days elapsed from turns worked. */
export function turnsToTimeSpent(turnsWorked: number): number {
  return Math.floor(turnsWorked / data.turns_per_day);
}

/** Executes the work task and returns the reward. Does not advance game time. */
export function executeWork(planet: Planet, player: Person, task: t.Work, days: number): { pay: number, items: Store } {
  return planet.labor.work(player, task, days);
}
