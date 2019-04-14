import data from './data';

import { Person } from './person';

import * as t from './common';


export class Faction implements t.Faction {
  abbrev:     t.faction;
  full_name:  string;
  capital:    t.body;
  sales_tax:  number;
  patrol:     number;
  piracy:     number;
  inspection: number;
  produces:   t.ResourceCounter;
  consumes:   t.ResourceCounter;
  standing:   t.StandingCounter;

  constructor(abbrev: t.faction | Faction) {
    if (typeof abbrev == 'object') {
      abbrev = abbrev.abbrev;
    }

    this.abbrev     = abbrev;
    this.full_name  = data.factions[this.abbrev].full_name;
    this.capital    = data.factions[this.abbrev].capital;
    this.sales_tax  = data.factions[this.abbrev].sales_tax;
    this.patrol     = data.factions[this.abbrev].patrol;
    this.piracy     = data.factions[this.abbrev].piracy;
    this.inspection = data.factions[this.abbrev].inspection;
    this.standing   = data.factions[this.abbrev].standing;
    this.consumes   = data.factions[this.abbrev].consumes;
    this.produces   = data.factions[this.abbrev].produces;
  }

  get desc() { return data.factions[this.abbrev].desc }

  toString() { return this.abbrev }

  isContraband(item: t.resource, player: Person) {
    // item is not contraband
    if (!data.resources[item].contraband)
      return false;

    // special case: weapons are not contraband if local standing is Admired
    if (item == 'weapons' && player.hasStanding(this, 'Admired')) 
      return false;

    return true;
  }
}
