/**
 * planet/commerce - buy and sell transactions.
 *
 * Handles player and agent trades at a planet's market. Includes contraband
 * inspection logic, standing rewards for resolving shortages, and event
 * triggers for the UI.
 */

import data from '../data';
import { resources } from '../resource';
import { Person } from '../person';
import { trigger, ItemsBought, ItemsSold } from '../events';
import { PlanetState } from './state';
import { Economy } from './economy';
import { Pricing } from './pricing';
import { Encounters } from './encounters';
import * as t from '../common';
import * as util from '../util';
import * as FastMath from '../fastmath';


declare var window: {
  game: any;
}


export class Commerce {
  constructor(
    private state: PlanetState,
    private economy: Economy,
    private pricing: Pricing,
    private encounters: Encounters,
  ) {}

  /**
   * Checks whether a transaction involves contraband and applies inspection logic.
   * Returns true if the transaction may proceed. Returns false (and applies fine,
   * standing loss, and confiscation) if the player is caught.
   */
  transactionInspection(item: t.resource, amount: number, player: Person) {
    if (!player || !this.state.faction.isContraband(item, player))
      return true;

    const contraband = data.resources[item].contraband || 0;

    const fine = FastMath.abs(contraband * amount * this.encounters.inspectionFine(player));
    const rate = this.encounters.inspectionRate(player);

    for (let i = 0; i < contraband; ++i) {
      if (util.chance(rate)) {
        const totalFine = Math.min(player.money, fine);
        const csnFine = util.csn(totalFine);
        const csnAmt = util.csn(amount);

        player.debit(totalFine);
        player.decStanding(this.state.faction.abbrev, contraband);

        let verb: string;
        if (amount < 0) {
          player.ship.cargo.set(item, 0);
          verb = 'selling';
        }
        else {
          this.state.stock.dec(item, amount);
          verb = 'buying';
        }

        const msg = `Busted! ${this.state.faction.abbrev} agents were tracking your movements and observed you ${verb} ${csnAmt} units of ${item}. `
                  + `You have been fined ${csnFine} credits and your standing wtih this faction has decreased by ${contraband}.`;

        window.game.notify(msg, true);

        return false;
      }
    }

    return true;
  }

  /**
   * Player or agent buys `amount` units of `item` from this market.
   * Returns [units_bought, total_price]. Triggers inspection for contraband.
   */
  buy(item: t.resource, amount: number, player?: Person) {
    if (player && player === window.game.player && !this.transactionInspection(item, amount, player))
      return [0, 0];

    const bought = Math.min(amount, this.economy.getStock(item));
    const price  = bought * this.pricing.buyPrice(item, player);

    this.economy.incDemand(item, amount);
    this.state.stock.dec(item, bought);

    if (player && bought) {
      player.debit(price);
      player.ship.loadCargo(item, bought);

      if (player === window.game.player) {
        trigger(new ItemsBought({
          count: bought,
          body:  this.state.body,
          item:  item,
          price: price,
        }));
      }
    }

    return [bought, price];
  }

  /**
   * Player or agent sells `amount` units of `item` to this market.
   * Returns [units_sold, total_price, standing_gained].
   */
  sell(item: t.resource, amount: number, player?: Person) {
    if (player && player === window.game.player && !this.transactionInspection(item, amount, player))
      return [0, 0, 0];

    const hasShortage = this.economy.hasShortage(item);
    const price = amount * this.pricing.sellPrice(item);
    this.state.stock.inc(item, amount);

    let standing = 0;

    if (player) {
      player.ship.unloadCargo(item, amount);
      player.credit(price);

      if (hasShortage && !resources[item].contraband) {
        if (!this.economy.hasShortage(item)) {
          standing += util.getRandomNum(3, 8);
        }
        else {
          standing += util.getRandomNum(1, 3);
        }
      }

      for (const c of this.state.conditions) {
        if (c.consumes[item] != undefined) {
          standing += util.getRandomNum(2, 5);
        }
      }

      if (standing > 0)
        player.incStanding(this.state.faction.abbrev, standing);

      if (player === window.game.player) {
        trigger(new ItemsSold({
          count:    amount,
          body:     this.state.body,
          item:     item,
          price:    price,
          standing: standing,
        }));
      }
    }

    return [amount, price, standing];
  }
}
