/**
 * filters - template helper functions replacing Vue 2 filters.
 *
 * Vue 3 removes the filter pipe syntax ({{ value | filter }}). These
 * functions are registered as methods on the global mixin so templates
 * can call them directly: {{ csn(value) }} instead of {{ value | csn }}.
 */

import * as util from './util';
import Physics from './physics';
import { sprintf } from 'sprintf-js';

export function csn(value: any): string {
  return util.csn((value || 0).toString());
}

export function R(value: any, places?: number): number {
  return util.R((value || 0).toString(), places);
}

export function pct(value: any, places?: number): string {
  return util.pct((value || 0).toString(), places);
}

export function unit(value: any, u: string): string {
  return (value || 0).toString() + ' ' + u;
}

export function name(value: any): string {
  return value.toString().replace(/_/g, ' ');
}

export function caps(value: any): string {
  return util.ucfirst(value);
}

export function lower(value: any): string {
  return value.toString().replace(/\b([A-Z])/g, (str: string) => str.toLowerCase());
}

export function AU(value: number): number {
  return value / Physics.AU;
}

export function yn(value: any): string {
  return value ? 'yes' : 'no';
}

export function abs(value: any): number {
  return Math.abs(value || 0);
}

export function fmt(value: any, format: string, ...args: any[]): string {
  return sprintf(format, value, ...args);
}

/** All filters as a methods object for Vue mixin registration. */
export const filterMethods = {
  csn, R, pct, unit, name, caps, lower, AU, yn, abs, sprintf: fmt,
};
