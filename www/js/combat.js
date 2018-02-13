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

      let damage = undefined;

      for (let i = 0; i < this.rate; ++i) {
        if (this.isReloadable) {
          --this._magazine;

          if (this._magazine === 0) {
            this._reload = this.reload;
            break;
          }
        }

        if (util.chance(0.75)) { // TODO: based on *something*
          if (damage === undefined) {
            damage = 0;
          }

          damage += util.getRandomNum(0, this.damage);
        }
      }

      return {
        damage: util.R(damage, 2),
        interceptable: this.interceptable,
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
      return 1 + Math.floor(this.round / 2);
    }

    get isPlayerTurn() {
      if (this.initiative === 'player') {
        return (this.round + 2) % 2 !== 0;
      } else {
        return (this.round + 2) % 2 === 0;
      }
    }

    addLogEntry(msg) {
      this.log.unshift(`[${this.currentRound}] ${msg}`);
    }

    start() {
      if (!this.isPlayerTurn) {
        this.opponentAction();
      }
    }

    playerAction(action) {
      this.player.nextRound();
      this.doAction(action, this.player, this.opponent);
      if (!this.opponent.isDestroyed) {
        this.opponentAction();
      }
    }

    opponentAction() {
      this.opponent.nextRound();
      const action = util.oneOf(this.opponent.ready);
      this.doAction(action, this.opponent, this.player);
    }

    doAction(action, from, to) {
      const effect = action.use();

      if (effect.damage === undefined) {
        this.addLogEntry(`${from.name} attacked with ${action.name} and missed.`);
      }
      else {
        if (effect.damage === 0) {
          this.addLogEntry(`${from.name} attacked with ${action.name} but there was negligible damage.`);
        }
        if (effect.interceptable && from.tryIntercept()) {
          this.addLogEntry(`${from.name} attacked with ${action.name} but ${to.name}'s point defenses were able to intercept.`);
        }
        else if (from.tryDodge()) {
          this.addLogEntry(`${from.name} attacked with ${action.name} but ${to.name} was able to maneuver to avoid the attack.`);
        }
        else {
          this.addLogEntry(`${from.name} attacked with ${action.name}, causing ${effect.damage} damage.`);
          if (to.ship.applyDamage(effect.damage)) {
            this.addLogEntry(`${to.name}'s ship has been destroyed!`);
          }
        }
      }

      ++this.round;
    }
  };

  exports.Action    = Action;
  exports.Combatant = Combatant;
  exports.Combat    = Combat;
});
