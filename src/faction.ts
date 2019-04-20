import data from './data';

import { Person } from './person';
import { watch, CaughtSmuggling } from "./events";

import * as t from './common';


declare var window: {
  game: any;
}


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

    watch("caughtSmuggling", (ev: CaughtSmuggling) => this.onCaughtSmuggling(ev));
  }

  get desc() {
    return data.factions[this.abbrev].desc;
  }

  get hasTradeBan() {
    const trade_bans = window.game.get_conflicts({
      target: this.abbrev,
      name:   'blockade',
    });

    return trade_bans.length > 0;
  }

  toString() {
    return this.abbrev;
  }

  isContraband(item: t.resource, player: Person) {
    // item is not contraband
    if (!data.resources[item].contraband)
      return false;

    // special case: weapons are not contraband if local standing is Admired
    if (item == 'weapons' && player.hasStanding(this, 'Admired')) 
      return false;

    return true;
  }

  inspectionFine(player: Person) {
    return Math.max(10, data.max_abs_standing - player.getStanding(this));
  }

  onCaughtSmuggling(ev: CaughtSmuggling) {
    const {faction, found} = ev.detail;

    if (faction == this.abbrev && !this.hasTradeBan) {
      let loss = 0;
      let fine = 0;

      for (let item of Object.keys(found) as t.resource[]) {
        let count = found[item] || 0;
        fine += count * factions[faction].inspectionFine(window.game.player);
        loss += count * 2;
      }

      window.game.player.debit(fine);
      window.game.player.decStanding(this.abbrev, loss);
      window.game.notify(`Busted! You have been fined ${fine} credits and your standing decreased by ${loss}.`);
    }

    return {complete: false};
  }
}


export const factions: { [key: string]: Faction } = {};

for (const abbrev of t.factions) {
  factions[abbrev] = new Faction(abbrev);
}
