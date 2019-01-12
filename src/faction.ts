import data from './data';
import * as t from './common';

export class Faction {
  abbrev: t.faction;

  constructor(abbrev: t.faction | Faction) {
    if (typeof abbrev == 'object') {
      abbrev = abbrev.abbrev;
    }

    this.abbrev = abbrev;
  }

  get desc()       { return data.factions[this.abbrev].desc }
  get full_name()  { return data.factions[this.abbrev].full_name }
  get capital()    { return data.factions[this.abbrev].capital }
  get sales_tax()  { return data.factions[this.abbrev].sales_tax }
  get patrol()     { return data.factions[this.abbrev].patrol }
  get inspection() { return data.factions[this.abbrev].inspection }
  get standing()   { return data.factions[this.abbrev].standing }
  get consumes()   { return data.factions[this.abbrev].consumes }
  get produces()   { return data.factions[this.abbrev].produces }

  toString() { return this.abbrev }
}
