/**
 * planet/state - shared data container for planet subsystems.
 *
 * PlanetState holds all mutable and immutable fields that planet subsystems
 * need to read or write. It is constructed once by Planet and passed to
 * each delegate. Keeps data ownership explicit: subsystems operate on
 * state they receive, not state they create.
 *
 * Contains only data, accessors, and trivial lookups. No economic logic,
 * no pricing, no turn processing.
 */

import data from '../data';
import system from '../system';
import Store from '../store';
import History from '../history';
import { Trait } from '../trait';
import { Condition, SavedCondition } from '../condition';
import { factions } from '../faction';
import * as t from '../common';
import * as FastMath from '../fastmath';


/** Task representing an in-progress import from another planet. */
export interface ImportTask {
  type:  'import';
  turns: number;
  item:  t.resource;
  count: number;
  from:  t.body;
  to:    t.body;
}

/** Task representing background manufacturing from local raw materials. */
export interface CraftTask {
  type:  'craft';
  turns: number;
  item:  t.resource;
  count: number;
}

export type EconTask = ImportTask | CraftTask;

export function isImportTask(task: EconTask): task is ImportTask {
  return (<ImportTask>task).type == 'import';
}

export function isCraftTask(task: EconTask): task is ImportTask {
  return (<CraftTask>task).type == 'craft';
}


/** Saved contract shape for serialization. */
export interface SavedContract {
  valid_until: number;
  mission:     any;  // SavedMission - kept as any to avoid circular import with mission.ts
}

/** Serializable planet state for save/restore. */
export interface SavedPlanet {
  conditions?: SavedCondition[];
  stock?:      any;
  supply?:     any;
  demand?:     any;
  need?:       any;
  pending?:    any;
  queue?:      any;
  contracts?:  SavedContract[];
}


export class PlanetState {
  // Physical and geographic properties (read-only after construction)
  readonly body:      t.body;
  readonly name:      string;
  readonly size:      string;
  readonly kind:      string;
  readonly central:   string;
  readonly gravity:   number;
  readonly traits:    Trait[];

  // Base production/consumption rates (scaled, combined from all sources)
  readonly produces:  Store;
  readonly consumes:  Store;
  readonly min_stock: number;
  readonly avg_stock: number;

  // Runtime state
  conditions:         Condition[];
  work_tasks:         string[];
  contracts:          any[];  // Contract[] - typed as any to avoid circular import

  // Fabrication state
  max_fab_units:      number;
  max_fab_health:     number;
  fab_health:         number;

  // Economic state
  stock:              Store;
  supply:             History;
  demand:             History;
  need:               History;
  pending:            Store;
  queue:              EconTask[];

  // Cached computed values
  _price:             t.Counter;
  _cycle:             t.Counter;
  _need:              t.Counter;
  _exporter:          {[key:string]: boolean};

  constructor(body: t.body, init?: SavedPlanet) {
    init = init || {};

    this.body    = body;
    this.name    = data.bodies[this.body].name;
    this.size    = data.bodies[this.body].size;
    this.kind    = system.kind(this.body);
    this.central = system.central(this.body);
    this.gravity = system.gravity(this.body);
    this.traits  = data.bodies[body].traits.map((t: string) => new Trait(t));

    if (init.conditions) {
      this.conditions = init.conditions.map(c => new Condition(c.name, c));
    } else {
      this.conditions = [];
    }

    this.max_fab_units  = FastMath.ceil(this.scale(data.fabricators));
    this.max_fab_health = this.max_fab_units * data.fab_health;
    this.fab_health     = this.max_fab_units * data.fab_health;

    // Build the list of work tasks available based on trait requirements.
    this.work_tasks = [];
    TASK:for (const task of data.work) {
      for (const req of task.avail) {
        for (const trait of this.traits) {
          if (req === trait.name) {
            this.work_tasks.push(task.name);
            continue TASK;
          }
        }
      }
    }

    this.contracts = [];

    // Economic state
    this.stock     = new Store(init.stock);
    this.supply    = new History(data.market_history, init.supply);
    this.demand    = new History(data.market_history, init.demand);
    this.need      = new History(data.market_history, init.need);
    this.pending   = new Store(init.pending);
    this.queue     = init.queue || [];
    this.min_stock = this.scale(data.min_stock_count);
    this.avg_stock = this.scale(data.avg_stock_count);

    // Build combined production/consumption stores from all sources.
    this.produces = new Store;
    this.consumes = new Store;
    for (const item of t.resources) {
      this.produces.inc(item, this.scale(data.market.produces[item]));
      this.consumes.inc(item, this.scale(data.market.consumes[item]));

      this.produces.inc(item, this.scale(this.faction.produces[item] || 0));
      this.consumes.inc(item, this.scale(this.faction.consumes[item] || 0));

      for (const trait of this.traits) {
        this.produces.inc(item, this.scale(trait.produces[item]));
        this.consumes.inc(item, this.scale(trait.consumes[item]));
      }
    }

    this._price    = {};
    this._cycle    = {};
    this._need     = {};
    this._exporter = {};
  }

  /** Multiplies n by the planet's size scale factor. */
  scale(n=0) {
    return data.scales[this.size] * n;
  }

  get faction() {
    return factions[data.bodies[this.body].faction];
  }

  get desc() {
    return data.bodies[this.body].desc;
  }

  get position() {
    return system.position(this.body);
  }

  get hasTradeBan(): boolean {
    return this.faction.hasTradeBan;
  }

  distance(toBody: t.body): number {
    return system.distance(this.body, toBody);
  }

  hasTrait(trait: string) {
    for (const t of this.traits) {
      if (t.name == trait) {
        return true;
      }
    }
    return false;
  }

  hasCondition(condition: string) {
    for (const c of this.conditions) {
      if (c.name == condition) {
        return true;
      }
    }
    return false;
  }

  isCapitol(): boolean {
    return this.hasTrait('capital');
  }

  clearNetExporterCache(items: t.ResourceCounter) {
    for (const item of Object.keys(items)) {
      delete this._exporter[item];
    }
  }
}
