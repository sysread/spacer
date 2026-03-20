/**
 * common.ts - canonical type definitions for all game data.
 *
 * This is the types.h of the game. Everything that touches game state imports
 * from here. It defines three categories of exports:
 *
 *   1. String literal union types (resource, faction, body, etc.) derived from
 *      const key-maps, plus their corresponding value arrays for iteration.
 *
 *   2. Interfaces for the static game data loaded from data.ts: Faction,
 *      ShipClass, Drive, Addon, Trait, Condition, Body, Work, GameData.
 *
 *   3. Interfaces for runtime structures shared across modules: Counter,
 *      ResourceCounter, StandingCounter, etc.
 *
 * The key-map pattern (e.g. `const _resource = { food: true, ... }`) exists
 * to give TypeScript a way to derive both the union type and the values array
 * from a single source of truth without duplicating the list.
 */


// ---------------------------------------------------------------------------
// Enumerated game entities
// ---------------------------------------------------------------------------

// Raw resources: extracted from planets by mining or atmosphere processing.
// Crafted resources: manufactured from raw materials at fabricator facilities.
// Contraband: illegal to carry in most faction space; subject to seizure.
const _resource = {
  // Raw
  atmospherics: true,
  water:        true,
  ore:          true,
  minerals:     true,
  hydrocarbons: true,
  food:         true,
  fuel:         true,
  luxuries:     true,
  // Crafted
  metal:        true,
  ceramics:     true,
  medicine:     true,
  machines:     true,
  electronics:  true,
  cybernetics:  true,
  // Contraband
  narcotics:    true,
  weapons:      true,
};

// The five political factions that control planets and stations.
// Each faction has its own economy, standing system, and enforcement posture.
const _faction = {
  UN:     true,  // United Nations               - Earth/Moon territory
  MC:     true,  // Martian Commonwealth         - Mars/Phobos territory
  CERES:  true,  // Most Serene Republic of Ceres - Belt territory
  JFT:    true,  // Jovian Free Traders           - Jupiter system
  TRANSA: true,  // Trans-Neptunian Authority     - Outer system
};

// All playable locations in the solar system. These are the keys used in
// game.planets and as the body type throughout the data model.
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

// Propulsion technologies. Ships have a drive type that determines available
// upgrades and base performance characteristics.
const _drive = {
  ion:    true,
  fusion: true,
};

// The two damage tracks on a ship. Hull damage reduces structural integrity;
// armor damage reduces the protection layer before hull is exposed.
const _shipdmg = {
  armor: true,
  hull:  true,
};

// All purchasable and assignable ship classes.
// Generic classes (shuttle through battleship) are available based on credits.
// Allegiance classes (fortuna, neptune, barsoom, rock-hopper) require
// sufficient standing with the controlling faction.
const _shiptype = {
  // Generic classes
  shuttle:       true,
  schooner:      true,
  hauler:        true,
  merchantman:   true,
  freighter:     true,
  corvette:      true,
  cruiser:       true,
  battleship:    true,
  // Allegiance classes (faction-restricted)
  fortuna:       true,   // CERES
  neptune:       true,   // TRANSA
  barsoom:       true,   // MC
  'rock-hopper': true,   // JFT
};

// All installable ship addons, categorized by role.
// Cargo/fuel: expand carrying capacity.
// Drives: propulsion upgrades (also appear as drive types above).
// Defensive: armor, stealth, point defense.
// Offensive: railguns and torpedoes.
const _addon = {
  // Cargo & fuel
  cargo_pod:       true,
  fuel_tank:       true,
  heat_reclaimer:  true,
  // Drives
  ion:             true,
  fusion:          true,
  // Defensive
  armor:           true,
  advanced_armor:  true,
  pds:             true,   // point defense system - intercepts incoming torpedoes
  ecm:             true,   // electronic countermeasures - improves dodge
  stealthPlating:  true,
  // Offensive
  railgun_turret:  true,
  railgun_cannon:  true,
  light_torpedo:   true,
  medium_torpedo:  true,
  heavy_torpedo:   true,
};

// Planet/station traits that shape the local economy.
// Resource traits (rich/poor) skew production and consumption of specific goods.
// Physical traits (rocky, icy, etc.) affect available mining operations.
// Infrastructure traits (tech hub, manufacturing hub, capital, etc.) affect
// available addons, fabrication, and pricing.
// black market: contraband is available for trade here.
const _trait = {
  'mineral rich':      true,
  'mineral poor':      true,
  'water rich':        true,
  'water poor':        true,
  'hydrocarbon rich':  true,
  'hydrocarbon poor':  true,
  'rocky':             true,
  'icy':               true,
  'asteroids':         true,
  'ringed system':     true,
  'agricultural':      true,
  'habitable':         true,
  'domed':             true,
  'subterranean':      true,
  'orbital':           true,
  'black market':      true,
  'tech hub':          true,
  'manufacturing hub': true,
  'capital':           true,
  'military':          true,
};

// What kind of event triggered a planet condition (see Condition interface).
const _condition_trigger = {
  shortage:  true,  // a resource fell below minimum stock
  surplus:   true,  // a resource exceeded maximum stock
  condition: true,  // another active condition triggered this one
};

/**
 * Numeric standing ranges by label, from Criminal to Admired.
 * Player standing with each faction is a value in [-100, 100].
 * Standing affects inspection rates, available missions, ship purchases,
 * and faction allegiance ship access.
 */
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


// ---------------------------------------------------------------------------
// Derived types and value arrays
// (Each pair: a string-literal union type + an array of its values)
// ---------------------------------------------------------------------------

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

export type trait = keyof typeof _trait;
export const traits = Object.keys(_trait) as trait[];

export type standing = keyof typeof Standing;
export const standings = Object.keys(Standing) as standing[];

export type condition_trigger = keyof typeof _condition_trigger;
export const condition_triggers = Object.keys(_condition_trigger) as condition_trigger[];


// ---------------------------------------------------------------------------
// Runtime counter types
// ---------------------------------------------------------------------------

/** General-purpose string-keyed numeric map. */
export interface Counter {
  [key: string]: number;
}

/** Per-resource numeric values (stock levels, production rates, prices, etc.). */
export type ResourceCounter = {
  [key in resource]?: number;
};

/**
 * Per-resource price adjustment factors, plus an optional 'addons' entry
 * used by traits to adjust addon prices alongside resource prices.
 */
export type PriceAdjustmentCounter = {
  [key in resource | 'addons']?: number;
};

/** Per-faction numeric values (player standing deltas, etc.). */
export type StandingCounter = {
  [key in faction]?: number;
};


// ---------------------------------------------------------------------------
// Resource definitions (from data.ts)
// ---------------------------------------------------------------------------

/** Time and yield values for mining a raw resource at a planet. */
export interface Mining {
  tics:  number;  // turns required to mine one unit
  value: number;  // base credit value per unit
}

/** Ingredients and time to fabricate one unit of a crafted resource. */
export interface Recipe {
  tics:      number;          // turns required to fabricate one unit
  materials: ResourceCounter; // input resources consumed per unit
}

/** Static definition of a raw (mineable) resource. */
export interface Raw {
  mass:        number;   // cargo mass per unit
  contraband?: number;   // fine multiplier if found during inspection (omitted if legal)
  mine:        Mining;
}

/** Static definition of a crafted (fabricatable) resource. */
export interface Craft {
  mass:        number;
  contraband?: number;
  recipe:      Recipe;
}

export type Resource = Raw | Craft;
export const isRaw   = (res: Resource): res is Raw   => (<Raw>res).mine   !== undefined;
export const isCraft = (res: Resource): res is Craft => (<Craft>res).recipe !== undefined;


// ---------------------------------------------------------------------------
// Faction definition (from data.ts)
// ---------------------------------------------------------------------------

/**
 * Static definition of a faction loaded from data.ts.
 *
 * patrol, piracy, and inspection are intensity values (not raw probabilities).
 * They are scaled by planet size and distance before being used as chances:
 *   - patrol:     base encounter rate for faction patrol ships during transit;
 *                 decays exponentially beyond the planet's jurisdiction radius
 *   - piracy:     base pirate encounter rate in faction space; peaks at an
 *                 optimal distance from the planet and decays from there;
 *                 suppressed by nearby patrol presence
 *   - inspection: base contraband search rate when a patrol is encountered;
 *                 scaled down by the player's standing with this faction
 */
export interface Faction {
  full_name:  string;
  capital:    body;
  sales_tax:  number;          // fraction of sale price taken as tax (0-1)
  patrol:     number;          // patrol intensity (see above)
  piracy:     number;          // piracy intensity (see above)
  inspection: number;          // inspection intensity (see above)
  desc?:      string;
  produces:   ResourceCounter; // faction-wide production bonus per resource
  consumes:   ResourceCounter; // faction-wide consumption bonus per resource
  standing:   StandingCounter; // initial standing deltas vs other factions
}


// ---------------------------------------------------------------------------
// Ship definitions (from data.ts)
// ---------------------------------------------------------------------------

export interface ShipDamage {
  hull:  number;
  armor: number;
}

/**
 * Static definition of a ship class loaded from data.ts.
 * restricted: false = available to anyone; string = required faction standing label
 * faction: the faction this allegiance-class ship belongs to (if any)
 */
export interface ShipClass {
  [key: string]: any;

  hull:       number;    // total hull hit points
  armor:      number;    // total armor hit points
  cargo:      number;    // base cargo capacity in units
  hardpoints: number;    // number of addon slots
  mass:       number;    // base dry mass (affects acceleration)
  tank:       number;    // fuel tank capacity
  drives:     number;    // number of drive slots
  drive:      drive;     // compatible drive type
  restricted: boolean | string; // false or required standing label
  faction?:   string;    // controlling faction for allegiance-class ships
  desc?:      string;
}


// ---------------------------------------------------------------------------
// Drive and addon definitions (from data.ts)
// ---------------------------------------------------------------------------

export interface Drive {
  name:      string;
  thrust:    number;    // acceleration in m/s²
  mass:      number;    // drive mass
  burn_rate: number;    // fuel consumed per turn at full thrust
  value:     number;    // base purchase price
  desc?:     string;
}

interface BaseAddon {
  [key: string]:  any;
  name:           string;
  mass:           number;
  price:          number;
  desc:           string;
  restricted?:    standing; // minimum standing label required to purchase
  markets?:       trait[];  // only available at planets with these traits
}

/** Weapons: railguns and torpedoes. */
export interface OffensiveAddon extends BaseAddon {
  is_offensive:   true;
  damage:         number;      // hit points of damage per hit
  reload:         number;      // turns between shots
  rate:           number;      // shots per firing action
  magazine:       number;      // total shots before reloading
  accuracy:       number;      // base hit probability (0-1)
  interceptable?: boolean;     // true if PDS can shoot this down (torpedoes)
}

/** Defensive systems: armor, stealth, point defense, ECM. */
export interface DefensiveAddon extends BaseAddon {
  is_defensive:   true;
  stealth?:       number;  // reduces patrol/piracy detection chance
  intercept?:     number;  // PDS intercept probability per incoming torpedo
  dodge?:         number;  // bonus dodge probability vs incoming fire
  armor?:         number;  // additional armor hit points
}

/** Utility addons: cargo expansions, fuel tanks, drive modifiers. */
export interface MiscAddon extends BaseAddon {
  is_misc:        true;
  cargo?:         number;      // additional cargo capacity
  burn_rate?:     number;      // absolute change to fuel burn rate
  burn_rate_pct?: number;      // percentage change to fuel burn rate
  thrust?:        number;      // additional thrust
}

export type Addon = OffensiveAddon | DefensiveAddon | MiscAddon;
export const isOffensive = (addon: Addon): addon is OffensiveAddon => (<OffensiveAddon>addon).is_offensive;
export const isDefensive = (addon: Addon): addon is DefensiveAddon => (<DefensiveAddon>addon).is_defensive;
export const isMisc      = (addon: Addon): addon is MiscAddon      => (<MiscAddon>addon).is_misc;


// ---------------------------------------------------------------------------
// Planet/station definitions (from data.ts)
// ---------------------------------------------------------------------------

/**
 * Economic modifiers applied by a planet trait.
 * Adjustments are additive on top of base faction production/consumption.
 */
export interface Trait {
  produces?: ResourceCounter;
  consumes?: ResourceCounter;
  price?:    PriceAdjustmentCounter;
}

/**
 * A timed economic event that affects a planet's production and consumption.
 * Conditions are active for a random duration in [days[0], days[1]] game days.
 * They can chain: a condition's triggers.condition map specifies other
 * condition names to start when this one activates, based on stock thresholds.
 */
export interface ConditionTriggers {
  shortage:  Counter; // conditions triggered when a resource falls below minimum
  surplus:   Counter; // conditions triggered when a resource exceeds maximum
  condition: Counter; // conditions triggered by another active condition
}

export interface Condition {
  days:     [number, number]; // duration range in game days [min, max]
  consumes: ResourceCounter;
  produces: ResourceCounter;
  triggers: ConditionTriggers;
}

/** Static definition of a playable location in the solar system. */
export interface Body {
  name:     string;
  size:     string;
  traits:   string[];
  faction:  faction;
  gravity?: number;
  desc:     string;
}

/** A job available at a planet - player can work for pay and resource rewards. */
export interface Work {
  name:    string;
  avail:   string[];    // trait requirements for this job to be available
  rewards: resource[];  // possible resource bonuses on completion
  pay:     number;      // base credit pay per completion
  desc:    string;
}


// ---------------------------------------------------------------------------
// Top-level game data shape (structure of data.ts default export)
// ---------------------------------------------------------------------------

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
