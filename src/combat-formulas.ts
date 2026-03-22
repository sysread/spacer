/**
 * combat-formulas - pure stateless functions for combat probability and damage.
 *
 * Extracted from combat.ts so they can be unit tested without constructing
 * Combatant/Combat instances or mocking RNG. The parent module calls these
 * with live values; tests call them directly with known inputs.
 */

import * as FastMath from './fastmath';

/** Probability that a combatant attempts to flee, based on hull damage.
 * 0 at full hull, approaching 0.5 as hull nears 0. */
export function flightRisk(pctHull: number): number {
  return (1 - pctHull) / 2;
}

/** Raw probability of escaping combat. Compares this combatant's full dodge
 * (including ECM) against the opponent's raw dodge (gear doesn't help a chaser).
 * Divided by 5 to keep flight success rates low. */
export function flightChance(dodge: number, opponentRawDodge: number): number {
  return dodge / opponentRawDodge / 5;
}

/** Effective intercept chance after hull damage penalty. */
export function effectiveIntercept(baseIntercept: number, damageMalus: number): number {
  return Math.max(0, baseIntercept - damageMalus);
}

/** Effective dodge chance after hull damage penalty. */
export function effectiveDodge(baseDodge: number, damageMalus: number): number {
  return Math.max(0, baseDodge - damageMalus);
}

/** Damage as a percentage of the target's total hitpoints (hull + armor). */
export function damagePct(damage: number, fullHull: number, fullArmor: number): number {
  return damage / (fullHull + fullArmor) * 100;
}

/** Whether it is the player's turn given initiative and the internal round counter.
 * Rounds alternate: the combatant with initiative acts on odd rounds. */
export function isPlayerTurn(initiative: string, round: number): boolean {
  if (initiative === 'player') {
    return (round + 2) % 2 !== 0;
  } else {
    return (round + 2) % 2 === 0;
  }
}

/** Converts the internal half-round counter to the display round number. */
export function currentRound(round: number): number {
  return FastMath.ceil(round / 2);
}
