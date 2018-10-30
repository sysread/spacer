define(function(require, exports, module) {
  const data  = require('data');
  const util  = require('util');
  const model = require('model');
  const Npc   = require('npc');

  const Action = class {
    constructor(opt) {
      this.opt     = opt;
      this.count   = 1;
      this._round  = 0;
      this._reload = 0;

      if (this.isReloadable) {
        this._magazine = this.magazine;
      }
    }

    get name()          { return this.opt.name }
    get rate()          { return this.count * this.opt.rate }
    get magazine()      { return this.count * this.opt.magazine }
    get accuracy()      { return this.opt.accuracy }
    get reload()        { return this.opt.reload }
    get damage()        { return this.opt.damage }
    get interceptable() { return this.opt.interceptable ? true : false }

    get isReloadable() {
      return this.reload !== undefined;
    }

    get isReloading() {
      return this.isReloadable && this._magazine === 0;
    }

    get isReady() {
      if (!this.isReloadable)
        return true;

      return this._magazine > 0;
    }

    get roundsUntilReload() {
      if (!this.isReloadable)
        return 0;

      return this._reload;
    }

    get magazineRemaining() {
      return this._magazine;
    }

    addUnit() {
      this._magazine += this.magazine;
      ++this.count;
    }

    nextRound() {
      ++this._round;

      if (this.isReloadable) {
        if (this._magazine === 0 && --this._reload === 0) {
          this._magazine = this.magazine;
        }
      }
    }

    use(from, to) {
      if (!this.isReady) {
        throw new Error('action.use: action is not ready');
      }

      let damage = 0;
      let hits   = 0;

      for (let i = 0; i < this.rate; ++i) {
        if (util.chance(this.accuracy)) { // TODO: modified by skill?
          damage += Math.max(0.1, util.getRandomNum(0, this.damage));
          ++hits;
        }

        if (this.isReloadable) {
          --this._magazine;

          if (this._magazine === 0) {
            this._reload = this.reload;
            break;
          }
        }
      }

      const effect = !hits                        ? 'miss'
        : this.interceptable && to.tryIntercept() ? 'intercepted'
        : to.tryDodge()                           ? 'dodged'
        : to.ship.applyDamage(damage)             ? 'destroyed'
                                                  : 'hit';

      const pct = effect === 'hit'
        ? damage / (to.fullHull + to.fullArmor) * 100
        : 0;

      return {
        type:   this.name,
        source: from.name,
        hits:   hits,
        damage: util.R(damage, 2),
        effect: effect,
        pct:    pct,
      };
    }
  };

  const Flight = class extends Action {
    constructor() {
      super({name: 'Flee'});
    }

    use(from, to) {
      const effect = from.tryFlight(to);

      return {
        type:   this.name,
        source: from.name,
        effect: effect ? 'flee' : 'chase',
      };
    }
  };

  const Surrender = class extends Action {
    constructor() {
      super({name: 'Surrender'});
    }

    use(from, to) {
      return {
        type:   this.name,
        source: from.name,
        effect: 'surrender',
      };
    }
  };

  const Combatant = class {
    constructor(combatant) {
      this.combatant = combatant;
      this.flight    = new Flight;
      this.surrender = new Surrender;
      this._actions  = {};

      for (const addon of this.ship.addons) {
        const info = data.addons[addon];

        if (info.damage) {
          if (this._actions.hasOwnProperty(addon)) {
            this._actions[addon].addUnit();
          }
          else {
            this._actions[addon] = new Action(info);
          }
        }
      }

      this._actions.flight    = this.flight;
      this._actions.surrender = this.surrender;
    }

    get name()        { return this.combatant.name }
    get faction()     { return this.combatant.faction }
    get ship()        { return this.combatant.ship }
    get hull()        { return this.ship.hull }
    get armor()       { return this.ship.armor }
    get fullHull()    { return this.ship.fullHull }
    get fullArmor()   { return this.ship.fullArmor }
    get pctHull()     { return this.ship.hull  / this.ship.fullHull }
    get pctArmor()    { return this.ship.armor / this.ship.fullArmor }
    get rawDodge()    { return this.ship.rawDodge }
    get dodge()       { return this.ship.dodge }
    get intercept()   { return this.ship.intercept }
    get isDestroyed() { return this.ship.isDestroyed }
    get actions()     { return Object.values(this._actions) }
    get ready()       { return this.actions.filter(a => {return a.isReady}) }
    get attacks()     { return this.ready.filter(a => {return a.damage > 0}) }

    /*
     * The chance of flight is inversely proportional to the percentage of
     * armor and hull remaining.
     */
    get flightRisk() {
      return (1 - this.pctHull) / 2;
    }

    nextRound() {
      for (const action of this.actions) {
        action.nextRound();
      }
    }

    tryIntercept() { return util.chance(this.intercept) }
    tryDodge()     { return util.chance(this.dodge) }

    /*
     * Compares this combatant's dodge, which takes into account power/mass
     * ratio and defensive gear which enhances dodge, like ecm, against the raw
     * dodge abilit of an opponent (which does not include gear, since ecm
     * would not help the chaser).
     *
     * TODO adjust based on pilots' skill levels
     */
    tryFlight(opponent) {
      const chance = this.dodge / opponent.rawDodge / 5;
      return util.chance(chance);
    }
  };

  const Combat = class {
    constructor(opt) {
      this.player      = new Combatant(game.player);
      this.opponent    = new Combatant(opt.opponent);
      this.initiative  = util.oneOf(['player', 'opponent']);
      this.round       = 1;
      this.log         = [];
      this.escaped     = false;
      this.surrendered = false;
    }

    get isOver() {
      return this.escaped
          || this.surrendered
          || this.player.isDestroyed
          || this.opponent.isDestroyed;
    }

    get playerSurrendered() {
      return this.surrendered === this.player.name;
    }

    get opponentSurrendered() {
      return this.surrendered === this.opponent.name;
    }

    get salvage() {
      if (this.opponent.isDestroyed || this.opponentSurrendered) {
        if (!this._salvage) {
          this._salvage = new model.Store;

          for (const item of this.opponent.ship.cargo.keys) {
            let amount = this.opponent.ship.cargo.count(item);

            // Randomize the remaining cargo amounts that survived the encounter
            if (!this.surrendered) {
              amount = util.getRandomInt(0, this.opponent.ship.cargo.count(item));
            }

            this._salvage.inc(item, amount);
          }
        }

        return this._salvage;
      }

      return;
    }

    get currentRound() {
      return Math.ceil(this.round / 2);
    }

    get isPlayerTurn() {
      if (this.initiative === 'player') {
        return (this.round + 2) % 2 !== 0;
      } else {
        return (this.round + 2) % 2 === 0;
      }
    }

    addLogEntry(entry) {
      const round = this.currentRound;
      if (this.log.length === 0 || this.log[0].round !== round) {
        this.log.unshift({
          round:    round,
          player:   undefined,
          opponent: undefined,
        });
      }

      this.log[0][this.isPlayerTurn ? 'player' : 'opponent'] = entry;
    }

    start() {
      if (!this.isPlayerTurn) {
        this.opponentAction();
      }
    }

    playerAction(action) {
      if (!this.isPlayerTurn) throw new Error("It is not the player's turn");
      this.player.nextRound();
      this.doAction(action, this.player, this.opponent);
    }

    opponentAction() {
      if (this.isPlayerTurn) throw new Error("It is not the opponents's turn");
      this.opponent.nextRound();

      const risk = this.opponent.flightRisk;
      const chance = util.chance(risk);

      let action;

      if (chance) {
        if (this.opponent.pctHull < 25) {
          action = this.opponent.surrender;
        } else {
          action = this.opponent.flight;
        }
      }
      else {
        action = util.oneOf(this.opponent.attacks);
      }

      this.doAction(action, this.opponent, this.player);
    }

    doAction(action, from, to) {
      const result = action.use(from, to);

      if (result.effect === 'flee') {
        this.escaped = from.name;
      }
      else if (result.effect === 'surrender') {
        this.surrendered = from.name;
      }

      this.addLogEntry(result);
      ++this.round;
    }
  };

  exports.Action    = Action;
  exports.Flight    = Flight;
  exports.Combatant = Combatant;
  exports.Combat    = Combat;
});
