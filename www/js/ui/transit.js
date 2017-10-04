class Transit extends Card {
  constructor(opt) {
    super(opt);

    this.set_header('Transit to ' + system.name(this.plan.dest));

    this.progress = new ProgressBar;
    this.add(this.progress.root);

    this.events = new UI;
    this.add(this.events.root);

    this.timer = null;
    this.stoppedBy = {};
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

  updateProgress() {
    const p = R(this.plan.pct_complete);
    const d = R(this.plan.auRemaining(), 2);
    const v = csn(R(this.plan.velocity / 1000));

    let progress = (d < 1.0)
      ? csn(R(this.plan.distanceRemaining())) + ' km'
      : d + ' AU';

    this.set_title((p > 50 ? 'Decelerating' : 'Accelerating') + ': ' + v + ' km/s');
    this.progress.setProgress(p, progress);
  }

  interval() {
    if (this.plan.left > 0) {
      const body = this.encounter();

      if (body) {
        const dist = R(Physics.AU(Physics.distance(this.plan.coords, system.position(body))), 3);
        this.inspection({place: body, dist: dist});
      }
      else {
        this.burn();
        this.timer = window.setTimeout(() => {this.interval()}, 50);
      }
    }
    else {
      this.end();
    }
  }

  burn() {
    const count = Math.min(this.plan.left, 24 / data.hours_per_turn);
    game.turn(count);

    for (let i = 0; i < count; ++i) {
      game.player.ship.burn(this.plan.accel);
      this.plan.turn();
    }

    this.updateProgress();
  }

  encounter() {
    if (this.plan.velocity >= 750000) {
      return;
    }

    const ranges = system.ranges(this.plan.coords);

    for (const body of Object.keys(ranges)) {
      const au = Physics.AU(ranges[body]);

      if (au < 0.25) {
        const faction = data.bodies[body].faction;
        const patrol  = data.factions[faction].patrol;
        const scale   = data.scales[data.bodies[body].size];
        const adjust  = faction === game.player.faction ? 0.5 : 1.0;
        const freq    = (1 - (Math.max(0.01, au) / 0.25)) * patrol * scale * adjust;
        const roll    = Math.random();

        if (roll <= freq) {
          if (this.stoppedBy[body]) {
            continue;
          }
          else {
            this.stoppedBy[body] = true;
            return body;
          }
        }
      }
    }

    return;
  }

  inspection(opt) {
    const inspection = new Inspection(opt);
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
  get place()   {return this.opt.place}
  get dist()    {return this.opt.dist}
  get name()    {return system.name(this.place)}
  get faction() {return data.bodies[this.place].faction}

  begin() {
    this.set_title('Police Inspection');

    const msg =
        `You have been hailed by a ${this.faction} patrol ship operating ${this.dist} AU out of ${this.name}. `
      + 'The captain requests that you cease acceleration and peacefully submit to inspection.';

    return this.ask(msg, 'Submit', 'Bribe', 'Flee', 'Attack')
      .then(choice => { return this[choice]() });
  }

  Submit() {
    let fine = 0;

    for (const [item, amt] of game.player.ship.cargo.entries()) {
      if (amt > 0 && data.resources[item].contraband) {
        fine += amt * 100 * data.resources[item].contraband;
        game.player.ship.cargo.set(item, 0);
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
