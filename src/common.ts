const _resource = {
  water:        true,
  ore:          true,
  minerals:     true,
  hydrocarbons: true,
  food:         true,
  fuel:         true,
  luxuries:     true,
  metal:        true,
  ceramics:     true,
  medicine:     true,
  machines:     true,
  electronics:  true,
  cybernetics:  true,
  narcotics:    true,
  weapons:      true,
};

const _faction = {
  UN:     true,
  MC:     true,
  CERES:  true,
  JFT:    true,
  TRANSA: true,
};

const _body = {
  mercury:   true,
  earth:     true,
  moon:      true,
  mars:      true,
  phobos:    true,
  ceres:     true,
  europa:    true,
  callisto:  true,
  ganymede:  true,
  trojans:   true,
  enceladus: true,
  rhea:      true,
  titan:     true,
  triton:    true,
  titania:   true,
  pluto:     true,
};

const _drive = {
  ion:    true,
  fusion: true,
};

const _shipdmg = {
  armor: true,
  hull:  true,
};

const _shiptype = {
  shuttle:       true,
  schooner:      true,
  hauler:        true,
  merchantman:   true,
  freighter:     true,
  corvette:      true,
  cruiser:       true,
  battleship:    true,
  fortuna:       true,
  neptune:       true,
  barsoom:       true,
  'rock-hopper': true,
};

const _addon = {
  cargo_pod:       true,
  fuel_tank:       true,
  liquid_schwartz: true,
  ion:             true,
  fusion:          true,
  armor:           true,
  advanced_armor:  true,
  railgun_turret:  true,
  railgun_cannon:  true,
  light_torpedo:   true,
  medium_torpedo:  true,
  heavy_torpedo:   true,
  pds:             true,
  ecm:             true,
  stealthPlating:  true,
};

export const Standing = {
  Criminal:   [-100, -50],
  Untrusted:  [-49,  -30],
  Suspicious: [-29,  -20],
  Dubious:    [-19,  -10],
  Neutral:    [-9,     9],
  Friendly:   [10,    19],
  Respected:  [20,    29],
  Trusted:    [30,    49],
  Admired:    [50,   100],
};


export type resource = keyof typeof _resource;
export const resources = Object.keys(_resource) as resource[];

export type faction = keyof typeof _faction;
export const factions = Object.keys(_faction) as faction[];

export type body = keyof typeof _body;
export const bodies = Object.keys(_body) as body[];

export type drive = keyof typeof _drive;
export const drives = Object.keys(_drive) as drive[];

export type shipdmg = keyof typeof _shipdmg;
export const shipdmgs = Object.keys(_shipdmg) as shipdmg[];

export type shiptype = keyof typeof _shiptype;
export const shiptypes = Object.keys(_shiptype) as shiptype[];

export type addon = keyof typeof _addon;
export const addons = Object.keys(_addon) as addon[];

export type standing = keyof typeof Standing;
export const standings = Object.keys(Standing) as standing[];


export interface Counter {
  [key: string]: number;
}

export type ResourceCounter = {
  [key in resource]?: number;
};

export type PriceAdjustmentCounter = {
  [key in resource | 'addons']?: number;
};

export type StandingCounter = {
  [key in faction]?: number;
};

export interface Mining {
  tics:  number;
  value: number;
}

export interface Recipe {
  tics:      number;
  materials: ResourceCounter;
}

export interface Raw {
  mass:        number;
  contraband?: number;
  mine:        Mining;
}

export interface Craft {
  mass:        number;
  contraband?: number;
  recipe:      Recipe;
}

export type Resource = Raw | Craft;

export function isRaw(res: Resource): res is Raw {
  return (<Raw>res).mine !== undefined;
}

export function isCraft(res: Resource): res is Craft {
  return (<Craft>res).recipe !== undefined;
}


export interface Faction {
  [key: string]: any;

  full_name:  string;
  capital:    body;
  sales_tax:  number;
  patrol:     number;
  inspection: number;
  desc?:      string;
  produces:   ResourceCounter;
  consumes:   ResourceCounter;
  standing:   StandingCounter;
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
  produces?: ResourceCounter;
  consumes?: ResourceCounter;
  price?:    PriceAdjustmentCounter;
}

export interface ConditionTriggers {
  shortage:  Counter;
  surplus:   Counter;
  condition: Counter;
}

export interface Condition {
  days:     [number, number];
  consumes: ResourceCounter;
  produces: ResourceCounter;
  triggers: ConditionTriggers;
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
