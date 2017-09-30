class TransitCard extends Card {
  constructor(opt) {
    super(opt);
    this.progress = new ProgressBar;
    this.add(this.progress.root);
    this.timer = null;
    this.set_header('Transit to ' + system.name(this.plan.dest));
  }

  get plan() {return this.opt.plan}

  begin() {
    this.timer = window.setTimeout(() => {this.callback()}, 50);
  }

  callback() {
    if (this.plan.left > 0) {
      this.burn();
      this.timer = window.setTimeout(() => {this.callback()}, 200);
    }
    else {
      this.end();
    }
  }

  burn() {
    let count = Math.min(this.plan.left, Math.ceil(this.plan.turns / 10));

    for (let i = 0; i < count; ++i) {
      game.player.ship.burn(this.plan.accel);
      this.plan.turn();
    }

    let d = this.plan.dist_left.toFixed(2);
    let p = Math.round(this.plan.pct_complete);

    this.set_title(p > 50 ? 'Deceleration burn' : 'Acceleration burn');
    this.progress.setProgress(p, `${d} AU`);

    game.turn(count);
  }

  end() {
    $('#nav-transit').modal('hide');
    $('#spacer').data({state: null, data: null});
    game.transit(this.plan.dest);
    open('summary');
  }
}

class Encounter extends Modal {
  constructor(opt) {
    super(opt);
    this.set_header(this.title);
    this.opts = {};
  }

  get distance()    {return this.opt.distance}
  get cancellable() {return false}

  addOption(label, callback) {
    this.opts[label] = callback;
  }

  delOption(label) {
    delete this.options[label];
  }

  *options() {
    for (let label of Object.keys(this.opts))
      yield [label, this.opts[label]];
  }

  clearOptions() {
    this.options.clear();
  }

  show() {
    if (this.footer) this.footer.empty();

    for (let [label, callback] of this.options()) {
      let btn = this.add_footer_button(label);
      btn.on('click', (e) => {this[callback](e)});
    }

    super.show();
  }
}

class Inspection extends Encounter {
  constructor(opt) {
    super(opt);
    this.add_text(`Your ship has been hailed by a routine ${this.faction} patrol.`);
    this.add_text('You are required by law to cease acceleration and peacefully submit to inspection.');
    this.addOption('Submit', 'optSubmit');
    this.addOption('Bribe',  'optBribe');
    this.addOption('Flee',   'optFlee');
  }

  get faction() {return data.factions[this.opt.faction].full_name}
  get title()   {return 'Inspection'}

  optSubmit() {
    let found = [];
    let fine  = 0;
    let msg;

    for (let [item, amt] of game.player.ship.cargo.entries()) {
      if (amt > 0 && data.resources[item].contraband) {
        found.push(item);
        fine += 100 * amt * contraband;
        game.player.ship.cargo.delete(item);
      }
    }

    if (fine > 0) {
      let div = $('<div>');
      let p   = $('<p>The patrol found the following contraband items during inspection.</p>');
      let ul  = $('<ul>');

      fine = Math.min(game.player.money, fine);

      for (let item of found)
        ul.append( $('<li>').append(item) );

      div.append(p).append(ul);
      div.append(`<p>You have been fined ${csn(fine)} credits.</p>`);

      msg = new Modal();
      msg.add(div);

      game.player.money -= fine;
    }
    else {
      msg = new Modal;
      msg.add_text('The patrol found nothing of interest in your hold. They apologize for the inconvenience and let you go.');
    }

    msg.add_footer_button('Ok').on('click', (e) => {
      console.log('inspection done');
      msg.hide();
      this.hide();
    });

    msg.show();
  }

  optBribe() {
  }

  optFlee() {
  }
}



