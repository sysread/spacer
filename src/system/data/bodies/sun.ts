import { Body } from '../body';
import mercury from './mercury';
import earth   from './earth';
import mars    from './mars';
import ceres   from './ceres';
import jupiter from './jupiter';
import saturn  from './saturn';
import uranus  from './uranus';
import neptune from './neptune';
import pluto   from './pluto';

const sun: Body = {
  name:     'The Sun',
  type:     'star',
  radius:   6.955e5, // IAU value according to JPL Horizons
  mass:     1.988544e30,
  position: [0, 0, 0],

  satellites: {
    mercury,
    earth,
    mars,
    ceres,
    jupiter,
    saturn,
    uranus,
    neptune,
    pluto,
  },
};

export = sun;
