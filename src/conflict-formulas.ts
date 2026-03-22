/**
 * conflict-formulas - pure stateless functions for conflict probability.
 *
 * Extracted from conflict.ts so the blockade chance formula can be tested
 * without constructing a Blockade instance or accessing window.game.
 */

import * as FastMath from './fastmath';

/**
 * Computes the probability that a blockade starts between two factions,
 * based on their inter-faction standing.
 *
 * - Negative standing (hostile): abs(standing) / 2000
 * - Positive standing (friendly): (ln(100) - ln(standing)) / 2000
 * - Zero standing (neutral): fixed 0.00025
 *
 * Returns the raw probability [0, 1], not the random outcome.
 * The caller rolls against this with util.chance().
 */
export function blockadeChance(standing: number): number {
  if (standing < 0) {
    return FastMath.abs(standing) / 2000;
  } else if (standing > 0) {
    return (Math.log(100) - Math.log(standing)) / 2000;
  } else {
    return 0.00025;
  }
}
