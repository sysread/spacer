import data    from './data';
import system  from './system';
import Ship    from './ship';
import Physics from './physics';

import * as t from './common';
import * as util from './util';
import * as FastMath from './fastmath';
import { factions, Faction } from './faction';
import { resources, isCraft, isRaw } from './resource';
import { SavedMission, Mission, Status, restoreMission } from './mission';
import { watch, GameLoaded } from "./events";


// Shims for global browser objects
declare var console: any;
declare var window: {
  game: any;
}


type factionesque = Faction | t.faction;


interface SavedShip {
  type:    t.shiptype;
  addons?: string[];
  damage?: t.ShipDamage;
  fuel?:   number;
  cargo?:  t.ResourceCounter;
}

export interface SavedPerson {
  name:         string;
  ship:         SavedShip;
  faction_name: t.faction;
  home:         t.body;
  money:        number;
  standing:     t.StandingCounter;
  contracts?:   SavedMission[];
};


export class Person {
  name:         string;
  ship:         Ship;
  home:         t.body;
  faction_name: t.faction;
  money:        number;
  standing:     t.StandingCounter;
  homeGravity:  number;
  contracts:    Mission[] = [];

  constructor(init?: SavedPerson) {
    if (init == undefined) {
      this.name  = 'Marco Solo';
      this.ship  = new Ship({type: data.initial_ship});
      this.home  = 'mars';
      this.money = data.initial_money;
      this.faction_name = 'MC';
    }
    else {
      this.name  = init.name;
      this.ship  = new Ship(init.ship);
      this.home  = init.home;
      this.money = FastMath.floor(init.money);
      this.faction_name = init.faction_name;

      if (init.contracts) {
        for (const c of init.contracts) {
          watch("gameLoaded", (ev: GameLoaded) => {
            const contract = restoreMission(c, window.game.locus);
            contract.accept();
            return {complete: true};
          });
        }
      }
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

  get faction() {
    return factions[this.faction_name];
  }

  get localStanding() {
    return this.getStanding(window.game.here.faction);
  }

  get localStandingLabel() {
    return this.getStandingLabel(window.game.here.faction);
  }

  // Returns the number of item that the player has the resources to craft
  canCraft(item: t.resource): number {
    const res = resources[item];

    if (isCraft(res)) {
      let max;

      for (const mat of Object.keys(res.recipe.materials) as t.resource[]) {
        const have = this.ship.cargo.count(mat);
        const need = res.recipe.materials[mat] || 0;

        if (have < need) {
          return 0;
        }

        const count = FastMath.floor(have / need);

        if (max == undefined || max > count) {
          max = count;
        }
      }

      return max || 0;
    }

    return 0;
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
    this.money = Math.max(0, this.money - n);
  }

  getStanding(faction: factionesque): number {
    faction = faction || this.faction;

    if (faction instanceof Faction) {
      faction = faction.abbrev;
    }

    if (this.standing[faction] == undefined) {
      if (faction === this.faction.abbrev) {
        this.standing[faction] = data.factions[this.faction.abbrev].standing[faction];
      }
    }

    return FastMath.floor(this.standing[faction] || 0);
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

  acceptMission(mission: Mission) {
    this.contracts.push(mission);
  }

  completeMission(mission: Mission) {
    this.contracts = this.contracts.filter(c => c.title != mission.title);
  }
}
