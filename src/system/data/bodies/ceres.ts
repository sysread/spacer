import { Body } from '../body';

const ceres: Body = {
  name:     'Ceres',
  type:     'dwarf',
  radius:   476.2,
  mass:     9.393e20,
  tilt:     4,

  elements: {
    format: 'jpl-sbdb',
    base: {
      a:    2.769165146349478,
      e:    0.07600902762923671,
      i:    10.59406732590292,
      node: 80.30553084093981,
      lp:   80.30553084093981 + 73.59769486239257, // node + peri
      L:    80.30553084093981 + 73.59769486239257 + 77.37209773768207, // node + peri + mean anomaly
    },
    day: {
      M: 0.2140341110610894,
    },
  },
};

export = ceres;
