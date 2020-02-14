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
  vars.ease = Linear.easeNone;
  vars.lazy = true;
  vars.duration = intvl || 0;
  return gsap.to(elt, vars);
}
