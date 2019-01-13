import data    from './data';
import system  from './system';
import Ship    from './ship';
import Physics from './physics';

import * as t from './common';
import * as model from './model';
import { resources, isCraft, isRaw } from './resource';


// Shims for global browser objects
declare var window: { game: any; }
declare var console: any;


type factionesque = model.Faction | t.faction;


interface SavedShip {
  type:    t.shiptype;
  addons?: string[];
  damage?: t.ShipDamage;
  fuel?:   number;
  cargo?:  t.ResourceCounter;
}

interface SavedPerson {
  name:     string;
  ship:     SavedShip;
  faction:  t.faction;
  home:     t.body;
  money:    number;
  standing: t.StandingCounter;
};


class Person {
  name:        string;
  ship:        Ship;
  faction:     model.Faction;
  home:        t.body;
  money:       number;
  standing:    t.StandingCounter;
  homeGravity: number;

  constructor(init?: SavedPerson) {
    if (init == undefined) {
      this.name     = 'Marco Solo';
      this.ship     = new Ship({type: data.initial_ship});
      this.faction  = new model.Faction('MC');
      this.home     = 'mars';
      this.money    = data.initial_money;
    }
    else {
      this.name     = init.name;
      this.ship     = new Ship(init.ship);
      this.faction  = new model.Faction(init.faction);
      this.home     = init.home;
      this.money    = Math.floor(init.money);
    }

    this.standing = {};

    for (const faction of Object.keys(data.factions) as t.faction[]) {
      if (init == undefined || init.standing == undefined || init.standing[faction] == undefined) {
        this.standing[faction] = data.factions[this.faction.abbrev].standing[faction];
      }
      else {
        this.standing[faction] = init.standing[faction];
      }
    }

    this.homeGravity = system.gravity(this.home);
  }

  get localStanding() {
    return this.getStanding(window.game.here.faction);
  }

  get localStandingLabel() {
    return this.getStandingLabel(window.game.here.faction);
  }

  canCraft(item: t.resource) {
    const res = resources[item];

    if (isCraft(res)) {
      const counts = [];
      const recipe = res.recipe;

      for (const mat of Object.keys(res.recipe.materials) as t.resource[]) {
        const amt = recipe.materials[mat] || 0;
        if (this.ship.cargo.get(mat) < amt) {
          return false;
        }
      }
    }

    return true;
  }

  maxAcceleration() {
    return Physics.G * this.homeGravity * data.grav_deltav_factor;
  }

  shipAcceleration() {
    return this.ship.currentAcceleration();
  }

  bestAcceleration() {
    return Math.min(this.maxAcceleration(), this.shipAcceleration());
  }

  credit(n: number) {
    this.money += n;
  }

  debit(n: number) {
    this.money -= n;
  }

  getStanding(faction: factionesque): number {
    faction = faction || this.faction;

    if (faction instanceof model.Faction) {
      faction = faction.abbrev;
    }

    if (this.standing[faction] == undefined) {
      if (faction === this.faction.abbrev) {
        this.standing[faction] = data.factions[this.faction.abbrev].standing[faction];
      }
    }

    return Math.floor(this.standing[faction] || 0);
  }

  hasStanding(faction: factionesque, label: t.standing) {
    const [min, max] = this.standingRange(label);
    return this.getStanding(faction) >= min;
  }

  hasStandingOrLower(faction: factionesque, label: t.standing) {
    const [min, max] = this.standingRange(label);
    return this.getStanding(faction) <= max;
  }

  standingRange(standing: t.standing) {
    return t.Standing[ standing ];
  }

  getStandingLabel(faction: factionesque) {
    const value = this.getStanding(faction);

    for (const standing of t.standings) {
      const [min, max] = t.Standing[ standing ];

      if (value >= min && value <= max) {
        return standing;
      }
    }
  }

  incStanding(faction: t.faction, amt: number) {
    this.standing[faction] = Math.min(data.max_abs_standing, this.getStanding(faction) + amt);
  }

  decStanding(faction: t.faction, amt: number) {
    this.standing[faction] = Math.max(-data.max_abs_standing, this.getStanding(faction) - amt);
  }

  setStanding(faction: t.faction, amt: number) {
    this.standing[faction] = Math.min(data.max_abs_standing, Math.max(-data.max_abs_standing, amt));
  }

  getStandingPriceAdjustment(faction: factionesque) {
    return this.getStanding(faction) / 1000;
  }
}

export = Person;
