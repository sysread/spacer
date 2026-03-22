/**
 * planet/encounters - patrol, piracy, and inspection probability calculations.
 *
 * Computes encounter rates for the transit system. Patrol and piracy rates
 * are based on faction parameters scaled by planet size and trait modifiers,
 * decaying with distance from the planet. Inspection rate scales inversely
 * with player standing.
 */

import data from '../data';
import { Person } from '../person';
import { PlanetState } from './state';
import * as FastMath from '../fastmath';


export class Encounters {
  constructor(private state: PlanetState) {}

  /**
   * Patrol jurisdiction radius in AU. Expanded for military and capital planets,
   * contracted for black market planets (patrols avoid openly corrupt areas).
   */
  patrolRadius() {
    let radius = this.state.scale(data.jurisdiction);
    if (this.state.hasTrait('military'))     radius *= 1.75;
    if (this.state.hasTrait('capital'))      radius *= 1.5;
    if (this.state.hasTrait('black market')) radius *= 0.5;
    return radius;
  }

  /**
   * Patrol encounter rate at a given distance from this planet (in AU).
   * Within the patrol radius: full rate. Beyond: decays by half per 0.1 AU.
   */
  patrolRate(distance=0) {
    const radius = this.patrolRadius();
    let patrol = this.state.scale(this.state.faction.patrol);

    if (distance < radius) {
      return patrol;
    }

    distance -= radius;

    let rate = patrol;
    for (let i = 0; i < distance; i += 0.1) {
      rate /= 2;
    }

    return Math.max(0, rate);
  }

  /**
   * Piracy radius: the range at which pirate activity peaks around this planet.
   * Larger than patrol radius - pirates operate at the edge of patrol coverage.
   * Black market planets attract more piracy; military planets suppress it.
   */
  piracyRadius() {
    let radius = this.state.scale(data.jurisdiction * 2);
    if (this.state.hasTrait('black market')) radius *= 2;
    if (this.state.hasTrait('capital'))      radius *= 0.75;
    if (this.state.hasTrait('military'))     radius *= 0.5;
    return radius;
  }

  /**
   * Piracy encounter rate at distance from this planet (in AU).
   * Peaks at the piracyRadius and decays by 15% per interval away from it.
   */
  piracyRate(distance=0) {
    const radius = this.piracyRadius();

    distance = FastMath.abs(distance - radius);

    let rate = this.state.scale(this.state.faction.piracy);
    const intvl = radius / 10;
    for (let i = 0; i < distance; i += intvl) {
      rate *= 0.85;
    }

    return Math.max(0, rate);
  }

  /**
   * Probability of being searched during a patrol encounter.
   * Scales inversely with standing: better standing = less scrutiny.
   */
  inspectionRate(player: Person) {
    const standing = 1 - (player.getStanding(this.state.faction.abbrev) / data.max_abs_standing);
    return this.state.scale(this.state.faction.inspection) * standing;
  }

  inspectionFine(player: Person) {
    return this.state.faction.inspectionFine(player);
  }
}
