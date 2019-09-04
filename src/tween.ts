declare var Linear: {
  easeNone: any;
}

type Easing = typeof Linear;

interface TweenArgs {
  [key: string]: any;
  ease: Easing;
  lazy: boolean;
  useFrames: boolean;
}

declare var TweenMax: {
  to: (elt: any, intvl: number, vars: TweenArgs) => any;
  play: () => void;
  kill: () => void;
}

export default function tween(elt: any, intvl: number, vars: TweenArgs) : any {
  vars.ease = Linear.easeNone;
  vars.lazy = true;
  vars.useFrames = true;
  return TweenMax.to(elt, intvl || 0, vars);
}
