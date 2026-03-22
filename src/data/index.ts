import * as common from '../common';
import tuning from './tuning';
import { resources, scales, market } from './resources';
import traits from './traits';
import conditions from './conditions';
import work from './work';
import factions from './factions';
import bodies from './bodies';
import { drives, shipclass, ship } from './ships';
import addons from './addons';

const data = {
  ...tuning,
  scales,
  resources,
  market,
  traits,
  conditions,
  work,
  factions,
  bodies,
  drives,
  shipclass,
  ship,
  addons,
} as common.GameData;

export default data;
