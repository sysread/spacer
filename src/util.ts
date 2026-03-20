/**
 * util - general-purpose game utilities.
 *
 * Split into two concerns:
 *   - Pure functions: formatting, math, collection helpers (no side effects)
 *   - Random functions: non-deterministic helpers used for game variance
 *
 * Also contains `memoized`, a TypeScript method decorator written for a 2019
 * performance optimization that was never applied. It is dead code. Flagged
 * here for removal when util is migrated to ESM.
 */

import { resources } from './common';
import * as FastMath from './fastmath';


// Required for memoized (dead code - see below) and resourceMap.
declare var window: { game: any; memo_stats: any; }


interface Counter {
  [key: string]: number;
}


/** Capitalizes the first letter of each word in value. */
export function ucfirst(value: string): string {
  return value.toString().replace(/\b([a-z])/g, (str) => str.toUpperCase())
}

/**
 * Shuffles arr in place using a randomized comparator.
 * Note: this produces a biased shuffle (not uniformly random) due to
 * the non-transitive comparator. Acceptable for display purposes.
 */
export function shuffle(arr: Array<any>): Array<any> {
  return arr.sort((a, b) => {
    return Math.random() > Math.random() ? 1 : -1;
  });
}

/**
 * Formats a number with thousands-separator commas, preserving decimals.
 * Handles negative numbers by stripping the sign and re-adding it.
 * Example: csn(1234567.89) -> "1,234,567.89"
 */
export function csn(num: number): string {
  const sign = num < 0 ? '-' : '';

  num = FastMath.abs(num);

  const parts = [];
  const three = new RegExp(/(\d{3})$/);
  let [integer, decimal] = `${num}`.split('.', 2);

  while (three.test(integer)) {
    integer = integer.replace(three, (match) => {parts.unshift(match); return ''});
  }

  if (integer) {
    parts.unshift(integer);
  }

  integer = parts.join(',');

  return decimal ? `${sign}${integer}.${decimal}` : `${sign}${integer}`;
}

/**
 * Formats a decimal fraction as a percentage string.
 * @param fraction - value between 0 and 1
 * @param places   - decimal places in the output (passed to R)
 */
export function pct(fraction: number, places: number): string {
  const pct = R(fraction * 100, places);
  return pct + '%';
}

/**
 * Deduplicates a string or array of strings, returning a joined string.
 * When given a string, splits on sep first. Always joins with sep.
 * Used to normalize space-separated class/trait lists.
 */
export function uniq(items: string | string[], sep=' '): string {
  if (!(items instanceof Array)) {
    items = `${items}`.split(sep).filter((s) => {return s != ''});
  }

  let set = new Set(items);
  let arr: string[] = [];
  set.forEach((val) => {arr.push(val)});
  return arr.join(sep);
}

/**
 * Rounds n to the given number of decimal places.
 * When places is undefined, rounds to the nearest integer.
 * Uses fastmath.round, which applies "round half away from zero" semantics.
 */
export function R(n: number, places?: number): number {
  const f = places === undefined ? 1 : Math.pow(10, places);
  n *= f;
  return FastMath.round(n) / f;
}

/** Clamps n to the range [min, max]. Either bound may be omitted. */
export function clamp(n: number, min?: number, max?: number): number {
  if (min !== undefined && n < min) n = min;
  if (max !== undefined && n > max) n = max;
  return n;
}

/** Returns a random float in [min, max]. */
export function getRandomNum(min: number, max: number): number {
  return (Math.random() * (max - min)) + min;
}

/** Returns a random integer in [min, max). */
export function getRandomInt(min: number, max: number): number {
  min = FastMath.ceil(min);
  max = FastMath.floor(max);
  return (FastMath.floor(Math.random() * (max - min))) + min;
}

/**
 * Returns true with probability pct (a value between 0 and 1).
 * Always false for pct=0 regardless of the RNG.
 */
export function chance(pct: number): boolean {
  if (pct === 0) return false;
  const rand = Math.random();
  return rand <= pct;
}

/**
 * Returns n randomized by +/- pct of its value.
 * Used to add variance to prices, quantities, and NPC behavior.
 * Example: fuzz(100, 0.1) returns a value between 90 and 110.
 */
export function fuzz(n: number, pct: number): number {
  const low  = n - (n * pct);
  const high = n + (n * pct);
  return getRandomNum(low, high);
}

/** Returns a random element from options. */
export function oneOf<T>(options: T[]): T {
  return options[getRandomInt(0, options.length - 1)];
}

/**
 * Returns a Counter initialized to dflt for every resource type.
 * Any keys already present in entries are preserved.
 * Used to initialize per-planet stock, supply, and demand maps.
 */
export function resourceMap(dflt: number=0, entries?: Counter) {
  entries = entries || {};

  for (const item of resources) {
    if (!(item in entries)) {
      entries[item] = dflt;
    }
  }

  return entries;
}


// ---------------------------------------------------------------------------
// Dead code below - memoized was written for a 2019 performance optimization
// but was never applied with @memoized anywhere in the codebase. Remove when
// util is migrated to ESM.
// ---------------------------------------------------------------------------

interface MemoOpts {
  turns?: number; // cache lifetime in turns; randomized between 3-12 if omitted
  key?:   string; // property name to use as the per-instance cache key
}

window.memo_stats = {hit: 0, miss: 0, clear: 0};

/**
 * TypeScript method decorator that caches return values and clears the cache
 * every N turns (where N is either fixed or randomized to spread cache
 * invalidation across the turn clock). Never used - see dead code note above.
 */
export function memoized(opt: MemoOpts) {
  return function(target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const orig    = descriptor.value;
    const keyName = opt.key;
    const getKey  = keyName == undefined
      ? (obj: any) => obj.constructor.name
      : (obj: any) => obj[keyName] || obj.constructor.name;

    let memo: { [key: string]: any } = {};
    let turns = opt.turns || getRandomInt(3, 12);

    descriptor.value = function() {
      if (window.game.turns % turns == 0) {
        turns = opt.turns || getRandomInt(3, 12);
        memo  = {};
        ++window.memo_stats.clear;
      }

      const key = JSON.stringify([getKey(this), arguments]);
      if (memo[key] == undefined) {
        memo[key] = orig.apply(this, arguments);
        ++window.memo_stats.miss;
      } else {
        ++window.memo_stats.hit;
      }

      return memo[key];
    };

    return descriptor;
  }
};
