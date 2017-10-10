class Combat extends Interactive {
  constructor(opt) {
    super(opt);
    this.npc  = opt.npc;
    this.init = opt.init || oneOf(['player', 'enemy']);
    this.turn = 0;

    this.player = new CombatInfo({ship: game.player.ship, label: 'Your ship'});
    this.enemy  = new CombatInfo({ship: this.npc.ship, label: this.npc.label});

    this.info = new Row;
    this.info.col(this.player.root);
    this.info.col(this.enemy.root);

    this.set_header('Combat');
    this.add(this.info.root);

    for (const addon of Object.keys(data.shipAddOns)) {
      if (game.player.ship.hasAddOn(addon)) {
        const info = data.shipAddOns[addon];
        if (info.hasOwnProperty('rate')) {
          this.add_button(info.name).data('choice', addon);
        }
      }
    }

    this.add_button('Flee').addClass('text-warning');
    this.add_button('Surrender').addClass('text-warning');

    this.root.on('click', 'a', e => {
      e.preventDefault();
      e.stopPropagation();
      const choice = $(e.target).data('choice');
    });

    if (this.init === 'enemy') {
      this.disableButtons();
    }
  }

  add_button(label) {
    return super.add_button(label).addClass('col-6').removeClass('m-1');
  }

  disableButtons() {
    $('.btn', this.root).prop('disabled', true).addClass('disabled');
  }

  enableButtons() {
    $('.btn', this.root).prop('disabled', false).removeClass('disabled');
  }

  enemyTurn() {
  }

  playerTurn() {
  }
}

class CombatInfo extends Component {
  constructor(opt) {
    super(opt);
    this.ship = opt.ship;

    this.shipClass = new Row('sm');
    this.shipClass.term(opt.label);
    this.shipClass.def(this.ship.opt.shipclass).addClass('text-capitalize');

    this.currentArmor = $('<span>');
    this.armor = new Row('sm');
    this.armor.term('Armor');
    this.armor.def('/' + this.ship.armor).prepend(this.currentArmor);

    this.currentHull = $('<span>');
    this.hull = new Row('sm');
    this.hull.term('Hull');
    this.hull.def('/' + this.ship.hull).prepend(this.currentHull);

    this.currentDrives = $('<span>');
    this.drives = new Row('sm');
    this.drives.term('Drives');
    this.drives.def('/' + this.ship.drives).prepend(this.currentDrives);

    this.add(this.label);
    this.add(this.shipClass.root);
    this.add(this.armor.root);
    this.add(this.hull.root);
    this.add(this.drives.root);

    this.refresh();
  }

  refresh() {
    this.currentArmor.text(this.ship.armor - this.ship.damage.armor);
    this.currentHull.text(this.ship.hull - this.ship.damage.hull);
    this.currentDrives.text(this.ship.drives - this.ship.damage.drives);
  }
}
