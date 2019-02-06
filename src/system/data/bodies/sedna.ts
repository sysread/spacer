import { Body } from '../body';

const sedna: Body = {
  name:   'Sedna',
  type:   'dwarfPlanet',
  radius: 497.5,

  elements: {
    format: 'jpl-sbdb',
    base: {
      a:    479.9048662568563,
      e:    0.8413195848948128,
      i:    11.92992424953418,
      node: 144.3274552335066,
      //lp:   456.0846992128,
      lp:   144.3274552335066 + 311.537354629566, // node + peri
      //L:    814.12651433,
      L:    144.3274552335066 + 311.537354629566 + 358.0410177555543, // node + peri + mean anomaly
    },
    day: {
      M: 8.999658288375152e-5,
    },
  },
};

export = sedna;
