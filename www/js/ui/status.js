class PlayerStatus extends UI {
  constructor(opt) {
    super(opt);
    this.person = new PersonStatus({person: game.player});
    this.ship = new ShipStatus({ship: game.player.ship});
    this.base.append(this.person.root).append(this.ship.root);
  }
}

class PersonStatus extends Card {
  constructor(opt) {
    super(opt);
    this.person = opt.person || game.player;
    this.set_header('Captain');
    this.add_header_button('New game').on('click', ()=>{open('newgame')});
    this.add_def('Money',     csn(this.person.money) + 'c');
    this.add_def('Home',      data.bodies[this.person.home].name);
    this.add_def('Faction',   data.factions[this.person.faction].full_name);
    this.add_def('Endurance', this.person.maxAcceleration().toFixed(2) + ' G');
  }
}

class ShipStatus extends Card {
  constructor(opt) {
    super(opt);
    this.ship = opt.ship || game.player.ship;
    this.set_header('Ship');
    this.add_def('Class',      `<span class="text-capitalize">${this.ship.opt.shipclass}</span>`);
    this.add_def('Cargo',      `${this.ship.cargoUsed}/${this.ship.cargoSpace}`);
    this.add_def('Hull',       this.ship.shipclass.hull);
    this.add_def('Armor',      this.ship.shipclass.armor);
    this.add_def('Hardpoints', this.ship.shipclass.hardpoints);
    this.add_def('Mass',       csn(Math.floor(this.ship.currentMass())) + ' tonnes');
    this.add_def('Thrust',     csn(this.ship.thrust) + ' kN');
    this.add_def('Fuel',       `${Math.round(this.ship.fuel * 100) / 100}/${this.ship.tank}`);
    this.add_def('Max burn',   `${csn(this.ship.maxBurnTime() * data.hours_per_turn)} hours at maximum thrust`);
    this.add_def('Drives',     this.ship.shipclass.drives);
    this.add_def('Drive type', `<span class="text-capitalize">${this.ship.shipclass.drive}</span>`);

    if (this.ship.cargo.sum() > 0) {
      let cargo = $('<ul>');

      for (let [item, amt] of this.ship.cargo.entries()) {
        if (amt > 0) {
          let li =  $('<li>').append(`${amt} ${item}`);
          cargo.append(li);
        }
      }

      this.add_def('Cargo', cargo);
    }
    else {
      this.add_def('Cargo', 'Empty');
    }
  }
}