import { resources } from './common';

interface Counter {
  [key: string]: number;
}

export function shuffle(arr: Array<any>): Array<any> {
  return arr.sort((a, b) => {
    return Math.random() > Math.random() ? 1 : -1;
  });
}

export function csn(num: number): string {
  const sign = num < 0 ? '-' : '';

  num = Math.abs(num);

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
  if (places === undefined) {
    return Math.round(n);
  }

  const factor = Math.pow(10, places);
  return Math.round(n * factor) / factor;
}

/*
 * Force n to be no less than min and no more than max.
 */
export function clamp(n: number, min?: number, max?: number): number {
  if (min !== undefined) n = Math.max(min, n);
  if (max !== undefined) n = Math.min(max, n);
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
 *
 * Direct copy pasta from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

export function chance(pct: number): boolean {
  if (pct === 0) return false;
  const rand = getRandomNum(0, Math.ceil(pct));
  return rand <= pct;
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