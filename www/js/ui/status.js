define(function(require, exports, module) {
  const data = require('data');
  const util = require('util');
  const Game = require('game');
  const UI   = require('ui');

  const Status = {};

  Status.Player = class extends UI.Component {
    constructor(opt) {
      super(opt);
      this.person   = new Status.Person;
      this.standing = new Status.Faction;
      this.ship     = new Status.Ship;
      this.root
        .append(this.person.root)
        .append(this.standing.root)
        .append(this.ship.root);
    }
  };

  Status.Person = class extends UI.Card {
    constructor(opt) {
      super(opt);
      this.person = Game.game.player;
      this.set_header('Captain');
      this.add_header_button('New game').on('click', ()=>{Game.open('newgame')});
      this.add_def('Money',     util.csn(this.person.money) + 'c');
      this.add_def('Home',      data.bodies[this.person.home].name);
      this.add_def('Faction',   data.factions[this.person.faction].full_name);
      this.add_def('Endurance', this.person.maxAcceleration().toFixed(2) + ' G');
    }
  };

  Status.Faction = class extends UI.Card {
    constructor(opt) {
      super(opt);
      this.set_header('Faction standing');

      for (let faction of Object.keys(data.factions)) {
        const label    = Game.game.player.getStandingLabel(faction);
        const standing = Game.game.player.getStanding(faction);
        this.add_def(faction, `${label} [${standing}]`);
      }
    }
  };

  Status.Ship = class extends UI.Card {
    constructor(opt) {
      super(opt);
      this.ship = Game.game.player.ship;
      this.set_header('Ship');
      this.add_def('Class',      `<span class="text-capitalize">${this.ship.opt.shipclass}</span>`);
      this.add_def('Cargo',      `${this.ship.cargoUsed}/${this.ship.cargoSpace}`);
      this.add_def('Hull',       this.ship.hull);
      this.add_def('Armor',      this.ship.armor);
      this.add_def('Hardpoints', this.ship.hardPoints);
      this.add_def('Mass',       util.csn(Math.floor(this.ship.currentMass())) + ' tonnes');
      this.add_def('Thrust',     util.csn(this.ship.thrust) + ' kN');
      this.add_def('Fuel',       `${Math.round(this.ship.fuel * 100) / 100}/${this.ship.tank}`);
      this.add_def('Max burn',   `${util.csn(this.ship.maxBurnTime() * data.hours_per_turn)} hours at maximum thrust`);
      this.add_def('Drives',     this.ship.shipclass.drives);
      this.add_def('Drive type', `<span class="text-capitalize">${this.ship.shipclass.drive}</span>`);

      if (this.ship.addons.length > 0) {
        let addons = $('<ul>');

        for (let addon of this.ship.addons) {
          addons.append( $('<li>').append( data.shipAddOns[addon].name ) );
        }

        this.add_def('Upgrades', addons);
      }
      else {
        this.add_def('Upgrades', 'None');
      }

      if (this.ship.cargo.sum() > 0) {
        let cargo = $('<ul>');

        for (let [item, amt] of this.ship.cargo.entries()) {
          if (amt > 0) {
            let mass = util.csn(data.resources[item].mass * amt);
            let li =  $('<li>').append(`${mass} tonnes of ${item} (${amt} cu)`);
            cargo.append(li);
          }
        }

        this.add_def('Cargo', cargo);
      }
      else {
        this.add_def('Cargo', 'Empty');
      }
    }
  };

  return Status;
});
