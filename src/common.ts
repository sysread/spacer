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

export interface Mining {
  tics:  number;
  value: number;
}

export interface Recipe {
  tics:      number;
  materials: { [key: string]: number };
}

export interface Resource {
  mass:        number;
  contraband?: number;
  mine?:       Mining;
  recipe?:     Recipe;
}

export interface Faction {
  full_name:  string;
  capital:    string;
  sales_tax:  number;
  patrol:     number;
  inspection: number;
  desc?:      string;
  produces:   { [key: string]: number },
  consumes:   { [key: string]: number },
  standing:   { [key: string]: number },
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

export interface GameData {
  [key: string]: any;

  resources: { [key: string]: Resource };
  factions:  { [key: string]: Faction };
  drives:    { [key: string]: Drive };
  shipclass: { [key: string]: ShipClass };
  addons:    { [key: string]: Addon };
}
