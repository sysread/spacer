/**
 * tween - thin wrapper around GSAP's gsap.to() for the navigation display.
 *
 * Fixes ease to Linear.easeNone and sets lazy=true on every call so that
 * orbital path animations in the navcomp and transit views are consistent.
 * Callers pass the target element, duration in seconds, and any additional
 * GSAP vars (e.g. x, y, opacity).
 */

import { gsap, Linear } from 'gsap';

interface TweenArgs {
  [key: string]: any;
  ease?: any;
  lazy?: boolean;
  duration?: number;
}

export default function tween(elt: any, intvl: number, vars: TweenArgs) : any {
  vars.ease     = Linear.easeNone;
  vars.lazy     = true;
  vars.duration = intvl || 0;
  return gsap.to(elt, vars);
}
