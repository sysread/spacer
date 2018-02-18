define(function(require, exports, module) {
  const data  = require('data');
  const util  = require('util');
  const model = require('model');
  const Npc   = require('npc');

  const Action = class {
    constructor(opt) {
      this.name          = opt.name;
      this.rate          = opt.rate;
      this.reload        = opt.reload;
      this.magazine      = opt.magazine;
      this.damage        = opt.damage;
      this.interceptable = opt.interceptable ? true : false;

      this._round    = 0;
      this._reload   = 0;
      this._magazine = this.magazine;
    }

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

    nextRound() {
      ++this._round;

      if (this.isReloadable) {
        if (this._magazine === 0 && --this._reload === 0) {
          this._magazine = this.magazine;
        }
      }
    }

    use() {
      if (!this.isReady) {
        throw new Error('action.use: action is not ready');
      }

      let damage = 0;
      let hits   = 0;

      for (let i = 0; i < this.rate; ++i) {
        if (util.chance(0.85)) { // TODO: based on *something*
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

      return {
        hits:   hits,
        damage: util.R(damage, 2),
      };
    }
  };

  const Combatant = class {
    constructor(combatant) {
      this.combatant = combatant;
      this.dodge     = this.ship.dodge;
      this.intercept = this.ship.intercept;
      this._actions  = [];

      for (const addon of this.ship.addons) {
        const info = data.addons[addon];
        if (info.damage) {
          this._actions.push(new Action(info));
        }
      }
    }

    get name()        { return this.combatant.name }
    get faction()     { return this.combatant.faction }
    get ship()        { return this.combatant.ship }
    get hull()        { return this.ship.hull }
    get armor()       { return this.ship.armor }
    get fullHull()    { return this.ship.fullHull }
    get fullArmor()   { return this.ship.fullArmor }
    get isDestroyed() { return this.ship.isDestroyed }
    get actions()     { return this._actions }
    get ready()       { return this.actions.filter(a => {return a.isReady}) }

    nextRound() {
      for (const action of this._actions) {
        action.nextRound();
      }
    }

    tryIntercept() { return util.chance(this.intercept) }
    tryDodge()     { return util.chance(this.dodge) }
  };

  const Combat = class {
    constructor(opt) {
      this.player     = new Combatant(game.player);
      this.opponent   = new Combatant(opt.opponent);
      this.initiative = util.oneOf(['player', 'opponent']);
      this.round      = 1;
      this.log        = [];
      this.result     = undefined;
    }

    get isOver() {
      return this.player.isDestroyed || this.opponent.isDestroyed;
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
      const action = util.oneOf(this.opponent.ready);
      this.doAction(action, this.opponent, this.player);
    }

    doAction(action, from, to) {
      const result  = action.use();
      result.type   = action.name;
      result.source = from.name;

      result.effect =
          !result.hits                              ? 'miss'
        : action.interceptable && to.tryIntercept() ? 'intercepted'
        : to.tryDodge()                             ? 'dodged'
        : to.ship.applyDamage(result.damage)        ? 'destroyed'
                                                    : 'hit';

      result.pct = result.effect === 'hit'
        ? result.damage / (to.fullHull + to.fullArmor) * 100
        : 0;

      this.addLogEntry(result);
      ++this.round;
    }
  };

  exports.Action    = Action;
  exports.Combatant = Combatant;
  exports.Combat    = Combat;
});
