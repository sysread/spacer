import data from './data';
import * as t from './common';

export class Faction implements t.Faction {
  abbrev:     t.faction;
  full_name:  string;
  capital:    t.body;
  sales_tax:  number;
  patrol:     number;
  inspection: number;
  desc?:      string;
  produces:   t.ResourceCounter;
  consumes:   t.ResourceCounter;
  standing:   t.StandingCounter;

  constructor(abbrev: t.faction | Faction) {
    if (typeof abbrev == 'object') {
      abbrev = abbrev.abbrev;
    }

    this.abbrev     = abbrev;
    this.desc       = data.factions[this.abbrev].desc;
    this.full_name  = data.factions[this.abbrev].full_name;
    this.capital    = data.factions[this.abbrev].capital;
    this.sales_tax  = data.factions[this.abbrev].sales_tax;
    this.patrol     = data.factions[this.abbrev].patrol;
    this.inspection = data.factions[this.abbrev].inspection;
    this.standing   = data.factions[this.abbrev].standing;
    this.consumes   = data.factions[this.abbrev].consumes;
    this.produces   = data.factions[this.abbrev].produces;
  }

  toString() { return this.abbrev }
}
