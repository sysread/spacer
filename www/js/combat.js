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

      for (let i = 0; i < this.rate; ++i) {
        damage += util.getRandomNum(0, this.damage);

        if (this.isReloadable) {
          --this._magazine;

          if (this._magazine === 0) {
            this._reload = this.reload;
            break;
          }
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
      this.dodge     = 0.10;
      this.intercept = 0;
      this._actions  = [];

      for (const addon of this.ship.addons) {
        const info = data.addons[addon];

        if (info.damage) {
          this._actions.push(new Action(info));
        }

        if (info.dodge) {
          this.dodge += info.dodge;
        }

        if (info.intercept) {
          this.intercept += info.intercept;
        }
      }

      this.dodge     = Math.min(this.dodge,     0.75);
      this.intercept = Math.min(this.intercept, 0.75);
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

    tryIntercept() {
      return util.getRandomNum(0, 1) <= this.intercept;
    }

    tryDodge() {
      return util.getRandomNum(0, 1) <= this.dodge;
    }
  };

  const Combat = class {
    constructor(opt) {
      this.player     = new Combatant(game.player);
      this.opponent   = new Combatant(opt.opponent);
      this.initiative = 'player'; //util.oneOf(['player', 'opponent']);
      this.round      = 1;
      this.log        = [];

      if (!this.isPlayerTurn) {
        this.opponentTurn();
      }
    }

    get currentRound() {
      return 1 + Math.floor(this.round / 2);
    }

    get isPlayerTurn() {
      if (this.initiative === 'player') {
        return this.round + 2 % 2 !== 0;
      } else {
        return this.round + 2 % 2 === 0;
      }
    }

    addLogEntry(msg) {
      this.log.unshift(`[${this.currentRound}] ${msg}`);
    }

    playerAction(action) {
      this.player.nextRound();

      const effect = action.use();

      if (effect.damage) {
        if (effect.interceptable && this.opponent.tryIntercept()) {
          this.addLogEntry(`Your ${action.name} attack was intercepted by your opponent's point defenses.`);
        }
        else if (this.opponent.tryDodge()) {
          this.addLogEntry(`Your opponent was able to maneuver around your ${action.name} attack.`);
        }
        else {
          this.addLogEntry(`Your ${action.name} hit your opponent, causing ${effect.damage} damage.`);
          if (this.opponent.ship.applyDamage(effect.damage)) {
            this.addLogEntry("Your opponent's ship has been destroyed.");
          }
        }
      }
      else {
        this.addLogEntry(`You attacked with ${action.name} and missed.`);
      }

      ++this.round;

      if (!this.opponent.isDestroyed) {
        this.opponentAction();
      }
    }

    opponentAction() {
      this.opponent.nextRound();
      ++this.round;
    }
  };

  exports.Action    = Action;
  exports.Combatant = Combatant;
  exports.Combat    = Combat;
});
