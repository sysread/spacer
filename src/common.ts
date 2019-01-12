export const resources = [
  'water',
  'ore',
  'minerals',
  'hydrocarbons',
  'food',
  'fuel',
  'metal',
  'ceramics',
  'medicine',
  'machines',
  'electronics',
  'cybernetics',
  'narcotics',
  'weapons',
] as resource[];

export type resource =
  'water'
| 'ore'
| 'minerals'
| 'hydrocarbons'
| 'food'
| 'fuel'
| 'metal'
| 'ceramics'
| 'medicine'
| 'machines'
| 'electronics'
| 'cybernetics'
| 'narcotics'
| 'weapons';

export type faction =
  'UN'
| 'MC'
| 'CERES'
| 'JFT'
| 'TRANSA';

export type drive =
  'ion'
| 'fusion';

export type addon =
  'cargo_pod'
| 'fuel_tank'
| 'liquid_schwartz'
| 'ion'
| 'fusion'
| 'armor'
| 'advanced_armor'
| 'railgun_turret'
| 'railgun_cannon'
| 'light_torpedo'
| 'medium_torpedo'
| 'heavy_torpedo'
| 'pds'
| 'ecm'
| 'stealthPlating';

export type shiptype =
  'shuttle'
| 'schooner'
| 'hauler'
| 'merchantman'
| 'freighter'
| 'corvette'
| 'cruiser'
| 'battleship'
| 'fortuna'
| 'neptune'
| 'barsoom'
| 'rock-hopper';

export type shipdmg =
  'armor'
| 'hull';

export type body =
  'mercury'
| 'earth'
| 'moon'
| 'venus'
| 'mars'
| 'phobos'
| 'ceres'
| 'europa'
| 'callisto'
| 'ganymede'
| 'trojans'
| 'enceladus'
| 'rhea'
| 'titan'
| 'triton'
| 'titania'
| 'pluto';

export interface Counter {
  [key: string]: number;
}

export interface Mining {
  [key: string]: any;
  tics:  number;
  value: number;
}

export interface Recipe {
  [key: string]: any;
  tics:      number;
  materials: { [key: string]: number };
}

export interface Raw {
  [key: string]: any;
  mass:        number;
  contraband?: number;
  mine:        Mining;
}

export interface Craft {
  [key: string]: any;
  mass:        number;
  contraband?: number;
  recipe:      Recipe;
}

type Resource = Raw | Craft;

export interface Faction {
  [key: string]: any;

  full_name:  string;
  capital:    string;
  sales_tax:  number;
  patrol:     number;
  inspection: number;
  desc?:      string;
  produces:   Counter;
  consumes:   Counter;
  standing:   Counter;
}

export interface ShipDamage {
  [key: string]: any;

  hull:  number;
  armor: number;
}

export interface ShipClass {
  [key: string]: any;

  hull:       number;
  armor:      number;
  cargo:      number;
  hardpoints: number;
  mass:       number;
  tank:       number;
  drives:     number;
  drive:      drive;
  restricted: boolean | string;
  faction?:   string;
  desc?:      string;
}

export interface Drive {
  name:      string;
  thrust:    number;
  mass:      number;
  burn_rate: number;
  value:     number;
  desc?:     string;
}

export interface Addon {
  [key: string]: any;

  name:           string;
  desc?:          string;
  price:          number;
  restricted?:    string;
  markets?:       string[];
  mass:           number;

  cargo?:         number;
  armor?:         number;

  burn_rate?:     number;
  thrust?:        number;

  damage?:        number;
  reload?:        number;
  rate?:          number;
  magazine?:      number;
  accuracy?:      number;
  interceptable?: boolean;

  stealth?:       number;
  intercept?:     number;
  dodge?:         number;
}

export interface Trait {
  produces?: Counter;
  consumes?: Counter;
  price?:    Counter;
}

export interface Condition {
  days:     [number, number];
  consumes: Counter;
  produces: Counter;
  triggers: {
    shortage:  Counter;
    surplus:   Counter;
    condition: Counter;
  };
}

export interface Body {
  name:     string;
  size:     string;
  traits:   string[];
  faction:  faction;
  gravity?: number;
  desc:     string;
}

export interface Work {
  name:    string;
  avail:   string[];
  rewards: resource[];
  pay:     number;
  desc:    string;
}

export interface GameData {
  [key: string]: any;

  resources:  { [key: string]: Resource };
  factions:   { [key: string]: Faction };
  drives:     { [key: string]: Drive };
  shipclass:  { [key: string]: ShipClass };
  addons:     { [key: string]: Addon };
  traits:     { [key: string]: Trait };
  conditions: { [key: string]: Condition };
  bodies:     { [key: string]: Body };
  work:       Work[];
}
