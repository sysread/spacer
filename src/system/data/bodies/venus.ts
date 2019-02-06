import { Body } from '../body';

const venus: Body = {
  name:   'Venus',
  type:   'planet',
  radius: 6051.8,
  mass:   48.685e23,
  tilt:   177.3,

  elements: {
    format: 'jpl-3000-3000',
    base: {
      a:    0.72332102,
      e:    0.00676399,
      i:    3.39777545,
      L:    181.97970850,
      lp:   131.76755713,
      node: 76.67261496,
    },
    cy: {
      a:    -0.00000026,
      e:    -0.00005107,
      i:    0.00043494,
      L:    58517.81560260,
      lp:   0.05679648,
      node: -0.27274174,
    },
  },
};

export = venus;
