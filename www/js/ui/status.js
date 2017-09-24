class PlayerStatus extends UI {
  constructor(opt) {
    super(opt);
    this.player = opt.player || game.player;
    this.ship = this.player.ship;

    this.capCard = new Card;
    this.capCard.set_header('Captain');
    this.capCard.add_header_button('New game').on('click', ()=>{open('newgame')});
    this.capCard.add_def('Money',     csn(this.player.money) + 'c');
    this.capCard.add_def('Home',      data.bodies[this.player.home].name);
    this.capCard.add_def('Faction',   data.factions[this.player.faction].full_name);
    this.capCard.add_def('Endurance', this.player.maxAcceleration().toFixed(2) + 'G');

    this.shipCard = new Card;
    this.shipCard.set_header('Ship');
    this.shipCard.add_def('Class',      `<span class="text-capitalize">${this.ship.opt.shipclass}</span>`);
    this.shipCard.add_def('Cargo',      `${this.ship.cargoUsed}/${this.ship.cargoSpace}`);
    this.shipCard.add_def('Hull',       this.ship.shipclass.hull);
    this.shipCard.add_def('Armor',      this.ship.shipclass.armor);
    this.shipCard.add_def('Hardpoints', this.ship.shipclass.hardpoints);
    this.shipCard.add_def('Mass',       csn(Math.floor(this.ship.currentMass())) + ' tonnes');
    this.shipCard.add_def('Thrust',     csn(this.ship.thrust) + 'kN');
    this.shipCard.add_def('Fuel',       `${Math.round(this.ship.fuel * 100) / 100}/${this.ship.tank}`);
    this.shipCard.add_def('Max burn',   `${csn(this.ship.maxBurnTime() * data.hours_per_turn)} hours at maximum thrust`);
    this.shipCard.add_def('Drives',     this.ship.shipclass.drives);
    this.shipCard.add_def('Drive type', `<span class="text-capitalize">${this.ship.shipclass.drive}</span>`);;

    this.base.append(this.capCard.root).append(this.shipCard.root);
  }
}
