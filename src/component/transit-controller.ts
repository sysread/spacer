/**
 * transit-controller - extracted encounter and transit logic.
 *
 * Pure TypeScript functions for encounter rate calculations, piracy evasion
 * modifiers, and pirate plunder algorithms. The Vue component delegates to
 * these for all non-trivial calculations.
 */

import data from '../data';
import Physics from '../physics';
import { resources } from '../resource';
import { Planet } from '../planet';
import Ship from '../ship';
import * as t from '../common';
import * as util from '../util';


/** Body → distance-in-meters map from nearby(). */
export type NearbyRanges = { [body: string]: number };

/** Body → encounter-rate map. */
export type PatrolRates = { [body: string]: number };

/** Faction → privateering rate + target info. */
export interface PrivateerRate {
  rate:   number;
  target: string;
}
export type PrivateerRates = { [faction: string]: PrivateerRate };

/** Result of a plunder operation. */
export interface PlunderResult {
  took: { count: number, items: { [item: string]: number } };
  gave: { count: number, items: { [item: string]: number } };
}


/**
 * Computes per-body patrol encounter rates from nearby body distances.
 */
export function computePatrolRates(
  nearby: NearbyRanges,
  planets: { [key: string]: Planet },
): PatrolRates {
  const rates: PatrolRates = {};

  for (const body of Object.keys(nearby)) {
    const au = nearby[body] / Physics.AU;
    rates[body] = planets[body].encounters.patrolRate(au);
  }

  return rates;
}

/**
 * Total patrol rate across all nearby bodies, clamped [0, 1].
 */
export function totalPatrolRate(rates: PatrolRates): number {
  const sum = Object.values(rates).reduce((a: number, b: number) => a + b, 0);
  return util.clamp(sum, 0, 1);
}

/**
 * Base piracy rate from nearby bodies, reduced by patrol presence.
 */
export function computePiracyRate(
  nearby: NearbyRanges,
  patrolRates: PatrolRates,
  planets: { [key: string]: Planet },
): number {
  let total = 0;

  for (const body of Object.keys(nearby)) {
    const au = nearby[body] / Physics.AU;
    total += planets[body].encounters.piracyRate(au);
  }

  for (const body of Object.keys(patrolRates)) {
    total *= 1 - patrolRates[body];
  }

  return util.clamp(total, 0, 1);
}

/**
 * Cargo value penalty to piracy evasion. Valuable cargo attracts pirates.
 */
export function piracyEvasionMalusCargo(cargoValue: number): number {
  if (cargoValue >= 1) {
    return Math.log10(cargoValue) / 200;
  }
  return 0;
}

/**
 * Speed bonus to piracy evasion. Fast ships are harder to catch.
 */
export function piracyEvasionBonusSpeed(velocity: number): number {
  if (velocity > data.piracy_max_velocity) {
    return Math.log(velocity / data.piracy_max_velocity) / 200;
  }
  return 0;
}

/**
 * Final piracy rate after applying evasion modifiers:
 * - stealth reduces base rate multiplicatively
 * - cargo value increases rate
 * - speed decreases rate
 * - stealth reduces rate again (additive)
 * - each prior encounter halves the rate
 */
export function adjustedPiracyRate(
  baseRate: number,
  stealth: number,
  cargoValue: number,
  velocity: number,
  holdIsEmpty: boolean,
  encounterCount: number,
): number {
  if (holdIsEmpty) return 0;

  let chance = baseRate;
  chance *= 1 - stealth;
  chance += piracyEvasionMalusCargo(cargoValue);
  chance -= piracyEvasionBonusSpeed(velocity);
  chance -= stealth;

  for (let i = 0; i < encounterCount; ++i)
    chance /= 2;

  return util.clamp(chance, 0, 1);
}

/**
 * Computes privateering rates by faction based on active blockades.
 * Privateers enforce trade bans at the edges of patrol coverage.
 */
export function computePrivateerRates(
  nearby: NearbyRanges,
  planets: { [key: string]: Planet },
  conflicts: any[],
  playerFaction: string,
  planOrigin: t.body,
  planDest: t.body,
): PrivateerRates {
  const bans = conflicts.filter((c: any) => c.name === 'blockade');
  const rates: PrivateerRates = {};

  if (bans.length === 0) return rates;

  for (const body of Object.keys(nearby)) {
    if (!planets[body].hasTradeBan) continue;

    const target = data.bodies[body].faction;
    const isPlayerFaction = target === playerFaction;
    const isDestFaction = target === data.bodies[planDest].faction;
    const isOriginFaction = target === data.bodies[planOrigin].faction;

    if (isPlayerFaction || isDestFaction || isOriginFaction) {
      const au = nearby[body] / Physics.AU;
      const rate = planets[body].encounters.piracyRate(au);

      for (const ban of bans.filter((c: any) => c.target === target)) {
        const faction = ban.proponent;
        const patrol = data.factions[faction].patrol;
        const total = rate + (patrol / 2);

        if (rates[faction] === undefined || rates[faction].rate < total) {
          rates[faction] = { rate: total, target: target };
        }
      }
    }
  }

  return rates;
}

/**
 * Apply encounter reduction factors: stealth and prior encounter count.
 * Used by all encounter chance rolls.
 */
export function applyEncounterReduction(rate: number, stealth: number, encounterCount: number): number {
  rate *= 1 - stealth;
  for (let i = 0; i < encounterCount; ++i)
    rate /= 2;
  return rate;
}

/**
 * Greedy cargo plunder algorithm. Pirates take the most valuable items
 * first, swapping out lower-value items from their hold if full.
 *
 * NOTE: this function mutates playerShip and npcShip cargo directly.
 */
export function executePlunder(playerShip: Ship, npcShip: Ship): PlunderResult {
  const value = (item: string) => resources[item].value;
  const took: { [item: string]: number } = {};
  const gave: { [item: string]: number } = {};

  for (const item of t.resources) {
    took[item] = 0;
    gave[item] = 0;
  }

  const avail = playerShip.cargo.keys()
    .filter((i: string) => playerShip.cargo.count(i) > 0)
    .sort((a: string, b: string) => value(a) > value(b) ? -1 : 1);

  for (const item of avail) {
    let count = playerShip.cargo.count(item);

    while (count > 0 && !npcShip.holdIsFull) {
      playerShip.unloadCargo(item, 1);
      npcShip.loadCargo(item, 1);
      --count;
      ++took[item];
    }

    if (count > 0 && npcShip.holdIsFull) {
      const has = npcShip.cargo.keys()
        .filter((i: string) => npcShip.cargo.count(i) > 0)
        .filter((i: string) => value(i) < value(item))
        .sort((a: string, b: string) => value(a) < value(b) ? -1 : 1);

      for (const npc_item of has) {
        let npc_count = npcShip.cargo.count(npc_item);

        while (npc_count > 0 && count > 0) {
          playerShip.unloadCargo(item, 1);
          playerShip.loadCargo(npc_item, 1);
          npcShip.unloadCargo(npc_item, 1);
          npcShip.loadCargo(item, 1);
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
      count: Object.values(took).reduce((a, b) => a + b, 0),
      items: took,
    },
    gave: {
      count: Object.values(gave).reduce((a, b) => a + b, 0),
      items: gave,
    },
  };
}
