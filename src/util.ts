import { resources } from './common';
import * as FastMath from './fastmath';


// Shims for global browser objects
declare var window: { game: any; memo_stats: any; }
declare var console: any;


interface Counter {
  [key: string]: number;
}


export function ucfirst(value: string): string {
  return value.toString().replace(/\b([a-z])/g, (str) => str.toUpperCase())
}

export function shuffle(arr: Array<any>): Array<any> {
  return arr.sort((a, b) => {
    return Math.random() > Math.random() ? 1 : -1;
  });
}

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

export function pct(fraction: number, places: number): string {
  const pct = R(fraction * 100, places);
  return pct + '%';
}

export function uniq(items: string | string[], sep=' '): string {
  if (!(items instanceof Array)) {
    items = `${items}`.split(sep).filter((s) => {return s != ''});
  }

  let set = new Set(items);
  let arr: string[] = [];
  set.forEach((val) => {arr.push(val)});
  return arr.join(sep);
}

/*
 * Rounds `n` to `places` decimal places.
 */
export function R(n: number, places?: number): number {
  const f = places === undefined ? 1 : Math.pow(10, places);
  n *= f;
  return FastMath.round(n) / f;
  //return ((n + (n > 0 ? 0.5 : -0.5)) << 0) / f;
}

/*
 * Force n to be no less than min and no more than max.
 */
export function clamp(n: number, min?: number, max?: number): number {
  if (min !== undefined && n < min) n = min;
  if (max !== undefined && n > max) n = max;
  return n;
}

/*
 * Returns a random float between min and max.
 */
export function getRandomNum(min: number, max: number): number {
  return (Math.random() * (max - min)) + min;
}

/*
 * Returns a random integer no lower than min and lower than max.
 */
export function getRandomInt(min: number, max: number): number {
  min = FastMath.ceil(min);
  max = FastMath.floor(max);
  return (FastMath.floor(Math.random() * (max - min))) + min;
}

/*
 * Returns true or false for a given decimal chance between 0 and 1.
 */
export function chance(pct: number): boolean {
  if (pct === 0) return false;
  const rand = Math.random();
  return rand <= pct;
}

/*
 * "Fuzzes" a number, randomizing it by +/- pct%.
 */
export function fuzz(n: number, pct: number): number {
  const low  = n - (n * pct);
  const high = n + (n * pct);
  return getRandomNum(low, high);
}

/*
 * Returns a random element from an array.
 */
export function oneOf<T>(options: T[]): T {
  return options[getRandomInt(0, options.length - 1)];
}

export function resourceMap(dflt: number=0, entries?: Counter) {
  entries = entries || {};

  for (const item of resources) {
    if (!(item in entries)) {
      entries[item] = dflt;
    }
  }

  return entries;
}


interface MemoOpts {
  turns?: number;
  key?:   string;
}

window.memo_stats = {hit: 0, miss: 0, clear: 0};
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
