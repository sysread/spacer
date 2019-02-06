import { Body } from '../body';

const uranus: Body = {
  name:   'Uranus',
  type:   'planet',
  radius: 25362,
  mass:   86.8103e24,
  tilt:   97.86,

  elements: {
    format: 'jpl-3000-3000',
    base: {
      a:    19.18797948,
      e:    0.04685740,
      i:    0.77298127,
      L:    314.20276625,
      lp:   172.43404441,
      node: 73.96250215,
    },
    cy: {
      a:    -0.00020455,
      e:    -0.00001550,
      i:    -0.00180155,
      L:    428.49512595,
      lp:   0.09266985,
      node: 0.05739699,
    },
    aug: {
      b: 0.00058331,
      c: -0.97731848,
      s: 0.17689245,
      f: 7.67025000,
    },
  },

  satellites: {
    titania: {
      name:   'Titania',
      type:   'moon',
      radius: 788.9,
      mass:   35.27e20,
      elements: {
        format: 'jpl-satellites-table',
        base:   {a: 436300, e: 0.0011, i: 0.079, L: 408.785, lp: 384.171, node: 99.771},
        day:    {M: 41.3514246},
      }
    },
  },
};

export = uranus;
