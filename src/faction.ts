/**
 * faction - runtime faction objects with standing and enforcement logic.
 *
 * Each faction wraps its static data.ts definition and handles:
 *   - Contraband rules (what's illegal, and standing-based exceptions)
 *   - Smuggling penalties (fine + standing loss on CaughtSmuggling events)
 *   - Restitution (paying credits to reset negative standing to zero)
 *   - Trade ban status (checked against active blockade conflicts)
 *
 * The module-level `factions` map is populated once at load time and used
 * as the singleton registry throughout the codebase.
 *
 * Faction instances listen for CaughtSmuggling events and apply their own
 * penalties when the event names them as the arresting faction.
 */

import data from './data';

import { Person } from './person';
import { watch, CaughtSmuggling } from "./events";

import * as t from './common';
import * as FastMath from './fastmath';


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

  /**
   * Accepts either a faction abbreviation string or an existing Faction
   * instance (extracts the abbrev). This lets callers pass either form
   * without needing to unwrap first.
   */
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

  /** True when another faction has an active blockade against this one. */
  get hasTradeBan() {
    const trade_bans = window.game.get_conflicts({
      target: this.abbrev,
      name:   'blockade',
    });

    return trade_bans.length > 0;
  }

  /**
   * Returns the faction name with a leading "The" when appropriate.
   * "The Martian Commonwealth" vs "The Most Serene Republic of Ceres"
   * (which already starts with "The").
   */
  get properName(): string {
    if (this.full_name.startsWith('The')) {
      return this.full_name;
    } else {
      return 'The ' + this.full_name;
    }
  }

  toString() {
    return this.abbrev;
  }

  /** Returns true if this faction's standing with `faction` meets or exceeds `label`. */
  hasStanding(faction: Faction, label: t.standing) {
    const [min] = t.Standing[label];
    const standing = this.standing[faction.abbrev] || 0;
    return standing >= min;
  }

  /**
   * Returns true if carrying `item` is a contraband offense for this faction.
   * Weapons are legal for players with Admired standing (faction-licensed traders).
   */
  isContraband(item: t.resource, player: Person) {
    if (!data.resources[item].contraband)
      return false;

    // Weapons are not contraband for Admired-standing players.
    if (item == 'weapons' && player.hasStanding(this, 'Admired'))
      return false;

    return true;
  }

  /**
   * Returns the per-item fine for contraband found during inspection.
   * Scales with how far the player's standing has fallen: deeper negative
   * standing means harsher fines. Minimum fine is 10 credits.
   */
  inspectionFine(player: Person) {
    return Math.max(10, data.max_abs_standing - player.getStanding(this));
  }

  /**
   * Handles a CaughtSmuggling event for this faction.
   * Applies a credit fine and standing loss proportional to the contraband
   * found. Re-registers itself (returns complete: false) to stay active for
   * future events.
   *
   * No penalty is applied during an active blockade (hasTradeBan), since
   * blockades involve different enforcement mechanics handled elsewhere.
   */
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

  /**
   * Computes the credit cost to restore a player's negative standing to zero.
   *
   * The fee is based on sales_tax and the game's initial_money constant so
   * that it scales with the faction's economic weight. Standing further into
   * negative territory incurs a quadratic penalty (rate = standing / 10),
   * making it progressively more expensive to recover from serious offenses.
   * Returns 0 if standing is already non-negative.
   */
  restitutionFee(player: Person): number {
    const standing = player.getStanding(this);

    if (standing >= 0) {
      return 0;
    }

    const tax  = this.sales_tax;
    const base = data.initial_money;
    const rate = standing / 10;

    return FastMath.ceil(FastMath.abs(standing * rate * tax * base));
  }

  /** Charges the player the restitution fee and resets their standing to 0. */
  makeRestitution(player: Person): void {
    const fee = this.restitutionFee(player);
    if (fee > 0) {
      player.debit(fee);
      player.setStanding(this.abbrev, 0);
    }
  }
}


/**
 * Module-level registry of all faction instances, keyed by abbreviation.
 * Populated once at load time. Use this map rather than constructing new
 * Faction instances - each faction should exist as a single object so that
 * its event listener is registered exactly once.
 */
export const factions: { [key: string]: Faction } = {};

for (const abbrev of t.factions) {
  factions[abbrev] = new Faction(abbrev);
}
