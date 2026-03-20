/**
 * tween - thin wrapper around GSAP's gsap.to() for the navigation display.
 *
 * Fixes ease to Linear.easeNone and sets lazy=true on every call so that
 * orbital path animations in the navcomp and transit views are consistent.
 * Callers pass the target element, duration in seconds, and any additional
 * GSAP vars (e.g. x, y, opacity).
 */

declare var Linear: {
  easeNone: any;
}

type Easing = typeof Linear;

interface TweenArgs {
  [key: string]: any;
  ease: Easing;
  lazy: boolean;
  duration: number;
}

declare var gsap: {
  to: (elt: any, vars: TweenArgs) => any;
  play: () => void;
  kill: () => void;
}

export default function tween(elt: any, intvl: number, vars: TweenArgs) : any {
  vars.ease     = Linear.easeNone;
  vars.lazy     = true;
  vars.duration = intvl || 0;
  return gsap.to(elt, vars);
}
