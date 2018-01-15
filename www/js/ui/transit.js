define(function(require, exports, module) {
  const data        = require('data');
  const Game        = require('game');
  const UI          = require('ui');
  const Interactive = require('workflow');
  const Npc         = require('npc');
  const Physics     = require('physics');
  const system      = require('system');
  const util        = require('util');
  const R           = util.R;
  const csn         = util.csn;
  const Transit     = {};

  Transit.Transit = class extends UI.Card {
    constructor(opt) {
      super(opt);

      this.set_header('Transit to ' + system.name(this.plan.dest));

      this.progress = new UI.ProgressBar;
      this.add(this.progress.root);

      this.events = new UI.Component;
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
          const dist = util.R(Physics.distance(this.plan.coords, system.position(body)) / Physics.AU, 3);
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
      Game.game.turn(count);

      for (let i = 0; i < count; ++i) {
        Game.game.player.ship.burn(this.plan.accel);
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
        const au = ranges[body] / Physics.AU;

        if (au < 0.25) {
          const faction = data.bodies[body].faction;
          const patrol  = data.factions[faction].patrol;
          const scale   = data.scales[data.bodies[body].size];
          const adjust  = faction === Game.game.player.faction ? 0.5 : 1.0;
          const freq    = (1 - (Math.max(0.01, au) / 0.25)) * patrol * scale * adjust;
          const roll    = Math.random();

          if (roll <= freq) {
            if (this.stoppedBy[faction]) {
              continue;
            }
            else {
              this.stoppedBy[faction] = true;
              return body;
            }
          }
        }
      }

      return;
    }

    inspection(opt) {
      const inspection = new Transit.Inspection(opt);
      this.add(inspection.root.addClass('mt-3'));

      return inspection.begin().then(() => {
        inspection.detach();
        this.resume();
      });
    }

    end() {
      $('#nav-transit').modal('hide');
      $('#spacer').data({state: null, data: null});
      Game.game.transit(this.plan.dest);
      Game.open('summary');
    }
  };

  Transit.Inspection = class extends Interactive {
    constructor(opt) {
      super(opt);

      this.npc = new Npc({
        label     : 'Police Patrol',
        faction   : this.faction,
        shipClass : util.oneOf(['corvette', 'frigate', 'destroyer']),
      });
    }

    get place()   {return this.opt.place}
    get dist()    {return this.opt.dist}
    get name()    {return system.name(this.place)}
    get faction() {return data.bodies[this.place].faction}

    begin() {
      this.set_title('Police Inspection');

      const msg = `You have been hailed by a ${this.faction} patrol ship operating ${this.dist} AU out of ${this.name}. `
                + 'The captain requests that you cease acceleration and peacefully submit to inspection.';

      return this.ask(msg, 'Submit', 'Bribe', 'Flee') //, 'Attack')
        .then(choice => { return this[choice]() });
    }

    Submit() {
      let fine = 0;

      for (const [item, amt] of Game.game.player.ship.cargo.entries()) {
        if (amt > 0 && data.resources[item].contraband) {
          fine += amt * 100 * data.resources[item].contraband;
          Game.game.player.ship.cargo.set(item, 0);
          Game.game.player.decStanding(this.faction, data.resources[item].contraband);
        }
      }

      if (fine > 0) {
        Game.game.player.money = Math.max(0, Game.game.player.money - fine);
        return this.ok('Your contraband cargo was found and confiscated. You have been fined ' + fine + ' credits')
          .then(ok => { this.detach() });
      }
      else {
        if (!Game.game.player.hasStanding('Friendly')) {
          Game.game.player.inStanding(1);
        }

        return this.ok('No contraband was found. The police apologize for the inconvenience and send you on your way.')
          .then(ok => { this.detach() });
      }
    }

    Bribe() {
      const amount = Math.ceil(Game.game.player.ship.price() * 0.03);

      if (amount <= Game.game.player.money) {
        return this.ask(`After a bit of subtle back and forth, the patrol's captain intimates that they could use ${csn(amount)} for "repairs to their tracking systems". While making said repairs, they might miss a ship like yours passing by. Do you wish to contribute to the captain's maintenance efforts?`, 'Yes, it is my duty as a fellow captain', 'No, that would be dishonest')
          .then(choice => {
            if (choice.startsWith('Yes')) {
              Game.game.player.debit(amount);

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

    Flee() {
      return this.ask("This isn't the an action movie. The captain of the patrol ship can read the ship's navigation and tracking data as well as you and will eventually overtake your ship. That is, unless you are planning on making a run for Proxima...", "Got it", "Run for Proxima")
        .then(choice => {
          if (choice.startsWith("Got it")) {
            return this.begin();
          }
          else {
            return this.ok("You angle away and gun the engines. In just a 5 short years, your navigation computer flips the ship on automatic and begins the deceleration burn. Your corpse and those of your crew arrive at Proxima Centauri after perhaps 10 years, relativistic effects notwithstanding.")
              .then(ok => {
                if (this.timer) window.clearTimeout(this.timer);
                $('#nav-transit').modal('hide');
                $('#spacer').data({state: null, data: null});
                window.localStorage.removeItem('game');
                Game.open('newgame');
              });
          }
        });
    }
  };

  return Transit;
});
