class TransitCard extends Card {
  constructor(opt) {
    super(opt);

    this.set_header('Transit to ' + system.name(this.plan.dest));

    this.progress = new ProgressBar;
    this.add(this.progress.root);

    this.events = new UI;
    this.add(this.events.root);

    this.timer = null;
  }

  get plan() {
    return this.opt.plan;
  }

  begin() {
    this.timer = window.setTimeout(() => {this.interval()}, 50);
  }

  resume() {
    this.begin();
  }

  interval() {
    if (this.plan.left > 0) {
      this.burn();
      this.timer = window.setTimeout(() => {this.interval()}, 200);
    }
    else {
      this.end();
    }
  }

  burn() {
    let count = Math.min(this.plan.left, Math.ceil(this.plan.turns / 10));
    game.turn(count);

    for (let i = 0; i < count; ++i) {
      // temporarily disable for development
      //game.player.ship.burn(this.plan.accel);
      this.plan.turn();
    }

    let d = this.plan.dist_left.toFixed(2);
    let p = Math.round(this.plan.pct_complete);

    this.set_title(p > 50 ? 'Deceleration burn' : 'Acceleration burn');
    this.progress.setProgress(p, `${d} AU`);
  }

  inspection() {
    const inspection = new Inspection;
    this.add(inspection.root.addClass('mt-3'));

    return inspection.begin().then(() => {
      inspection.detach();
      this.resume();
    });
  }

  end() {
    $('#nav-transit').modal('hide');
    $('#spacer').data({state: null, data: null});
    game.transit(this.plan.dest);
    open('summary');
  }
}

class Inspection extends Interactive {
  begin() {
    this.set_title('Police Inspection');

    const msg =
        'Your ship has been hailed by police for a routine inspection. '
      + 'You are required by law to cease acceleration and peacefully submit to boarding and inspection.';

    return this.ask(msg, 'Submit', 'Bribe', 'Flee', 'Attack')
      .then(choice => { return this[choice]() });
  }

  Submit() {
    let fine = 0;

    for (const [item, amt] of game.player.ship.cargo.entries()) {
      if (amt > 0 && data.resources[item].contraband) {
        fine += amt * 100 * data.resources[item].contraband;
        game.player.ship.cargo.delete(item);
      }
    }

    if (fine > 0) {
      game.player.money = Math.max(0, game.player.money - fine);
      return this.ok('Your contraband cargo was found and confiscated. You have been fined ' + fine + ' credits')
        .then(ok => { this.detach() });
    }
    else {
      return this.ok('No contraband was found. The police apologize for the inconvenience and send you on your way.')
        .then(ok => { this.detach() });
    }
  }

  Bribe() {
    const amount = Math.ceil(game.player.ship.price() * 0.03);

    if (amount <= game.player.money) {
      return this.ask(`After a bit of subtle back and forth, the patrol's captain intimates that they could use ${csn(amount)} for "repairs to their tracking systems". While making said repairs, they might miss a ship like yours passing by. Do you wish to contribute to the captain's maintenance efforts?`, 'Yes, it is my duty as a fellow captain', 'No, that would be dishonest')
        .then(choice => {
          if (choice.startsWith('Yes')) {
            game.player.debit(amount);

            return this.ok('The, uh, "contribution" has been debited from your account. You are free to go.')
              .then(ok => { this.detach() });
          }
          else {
            return this.begin();
          }
        });
    }
    else {
      return this.ok('You do not have enough money to corrupt this noble officer.')
        .then(ok => { return this.begin() });
    }
  }
}
