define(function(require, exports, module) {
  const data = require('data');
  const Game = require('game');
  const UI   = require('ui');

  const WorkIntro = class extends UI.Card {
    constructor(opt) {
      super(opt);

      this.set_header('Work crews');
      this.add_text(`
        Sometimes you may find yourself stuck somewhere for a while or you just
        need to make a few extra bucks to put you ahead. In those situations,
        you can find work on one of the numerous work crews hiring short term
        laborers to help mine water ice, minerals, ore, or even to hep with the
        work. The pay isn't great, but if you work hard and end up over
        quota, you are often allowed to keep your take.
      `);

      this.add_button('Get a job').on('click', (e) => {
        e.preventDefault();
        const workSelect = new WorkSelect;
        workSelect.show();
      });
    }
  };

  const WorkSelect = class extends UI.Modal {
    constructor(opt) {
      super(opt);
      this.days = 1;
      this.pay  = Game.game.place().payRate;

      const days = $('<input type="number" class="form-control" readonly>');
      const pay  = $('<input type="number" class="form-control" readonly>');

      this.set_header('Recruiter');
      this.add_text(`
        The pay is ${this.pay}c/day.
        You get to keep anything you collect over the quota.
        How long are you available for?
      `);

      this.add_row('Days', days);
      this.add_row('Pay', pay);

      this.add(new UI.Slider({
        min        : 1,
        max        : 7,
        step       : 1,
        initial    : this.days,
        minmaxbtns : true,
        callback   : (n) => {
          this.days = n;
          days.val(n);
          pay.val(n * this.pay);
        }
      }).root);

      this.add_footer_button('Cancel').on('click', () => {this.hide()});

      this.add_footer_button('Get to work').on('click', () => {
        let turns   = Math.ceil(this.days * 24 / data.hours_per_turn);
        let harvest = Game.game.place().harvest(turns);
        let pay     = this.days * this.pay;

        Game.game.turn(turns);
        Game.game.player.credit(pay);
        Game.game.refresh();
        Game.game.save_game();

        const workCollect = new WorkCollect({paid: pay, collected: harvest});
        workCollect.show();

        this.hide();
      });
    }

    get cancellable() {return true}
  };

  const WorkCollect = class extends UI.Modal {
    constructor(opt) {
      super(opt);
      this.paid = opt.paid;
      this.collected = opt.collected;
      this.set_header('Earnings');

      if (this.collected.sum() === 0) {
        this.add_text(`We appreciate you helping out. No luck on beating the quota, but you did earn an honest paycheck to the tune of ${this.paid}c.`);
        this.add_footer_button('Grumble, grumble...').on('click', (e) => {this.hide()});
      }
      else {
        const chooser = new UI.ResourceExchange({
          store      : this.collected,
          cargo      : Game.game.player.ship.cargo,
          max_cargo  : Game.game.player.ship.shipclass.cargo,
          minmaxbtns : true
        });

        this.add_text(`In addition to ${this.paid}c in wages, your crew collected extra resources over the quota which you are entitled to keep:`);

        this.add(chooser.root);

        this.add_footer_button('Ok').on('click', (e) => {
          Game.game.player.ship.cargo = chooser.cargo;
          Game.game.refresh();
          Game.game.save_game();
          this.hide();
        });
      }
    }
  };

  return {
    Intro: WorkIntro,
    Select: WorkSelect,
    Collect: WorkCollect,
  };
});
