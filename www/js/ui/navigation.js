define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const system  = require('system');
  const Physics = require('physics');
  const Game    = require('game');
  const NavComp = require('navcomp');
  const UI      = require('ui');
  const Summary = require('ui/summary');

  const Navigation = {};

  Navigation.Navigation = class extends UI.Card {
    constructor(opt) {
      super(opt);
      this.dests = {};
      this.navcomp = new NavComp;

      this.set_header('Navigation');
      this.add_header_button('Map').on('click', (e)=>{Game.open('plot')});
      this.add_text('Your navigational computer automatically calculates the optimal trajectory from your current location to the other settlements in the system.');
      this.add_text(`Being born on ${data.bodies[Game.game.player.home].name}, your body is adapted to ${data.bodies[Game.game.player.home].gravity}G, allowing you to endure a sustained burn of ${util.R(Game.game.player.maxAcceleration() / Physics.G, 3)}G.`);
      this.add_text(`Your ship is capable of ${util.R(Game.game.player.shipAcceleration() / Physics.G, 3)}Gs of acceleration with her current load out (${util.csn(util.R(Game.game.player.ship.currentMass()))} metric tonnes). With ${util.R(Game.game.player.ship.fuel, 3)} tonnes of fuel, your ship has a maximum burn time of ${Game.game.player.ship.maxBurnTime() * data.hours_per_turn} hours at maximum thrust.`);

      for (const body of system.bodies()) {
        if (body === Game.game.locus)
          continue;

        const row = new Navigation.Row(body);
        this.add(row.root);
      }

      this.root.on('click', 'button.nav-target', e => {
        const body = $(e.target).data('body');

        const modal = new Navigation.TripPlanner({
          'place'   : Game.game.place(body),
          'routes'  : this.navcomp.transits[body],
          'fastest' : this.navcomp.fastest(body)
        });

        modal.show();
      });
    }
  };

  Navigation.Row = class extends UI.Component {
    constructor(body, opt) {
      super(opt);

      let au = Math.round(system.distance(Game.game.locus, body) / Physics.AU * 100) / 100;
      if (au < 0.01) au = '< 0.01';

      let btn = new UI.Button;
      btn.root.addClass('btn-block text-left nav-target');
      btn.add(system.short_name(body));
      btn.data({'body': body});

      if (system.type(body) === 'moon') {
        btn.add(`<span class="badge badge-pill float-right">${system.kind(body)}</span>`);
      }

      this.root = $('<div class="row">')
        .append( $('<div class="col col-sm-6 py-2">').append(btn.root) )
        .append(
          $('<div class="row col-12 col-sm-6 py-2">')
            .append($('<div class="col-6 mute">').append(au + ' AU'))
            .append($('<div class="col-6 mute">').append(system.faction(body))));
    }
  };

  Navigation.TripPlanner = class extends UI.Modal {
    constructor(opt) {
      super(opt);

      this.dist = $('<span>');
      this.flip = $('<span>');
      this.dv   = $('<span>');
      this.maxv = $('<span>');
      this.fu   = $('<span>');
      this.tm   = $('<span>');

      this.slider = new UI.Slider({
        min      : 0,
        max      : this.routes.length - 1,
        initial  : this.fastest.index,
        callback : n => {
          const route = this.routes[n];
          const plan = route.transit;
          const [days, hours] = plan.days_hours;

          let g = Math.round(plan.accel / Physics.G * 1000) / 1000;
          if (g === 0) g = '< 0.001';

          this.flip.text(util.csn(Math.ceil(plan.km / 2)) + ' km');
          this.dist.text(`${Math.round(plan.au * 100) / 100} AU (${util.csn(Math.round(plan.km))} km)`);
          this.dv.text(g + ' G');
          this.maxv.text(util.csn(util.R(plan.maxVelocity / 1000)) + ' km/s');
          this.fu.text((Math.round(route.fuel * 100) / 100) + ' tonnes (est)');
          this.tm.text(`${util.csn(days)} days, ${util.csn(hours)} hours`);

          this.selectedRoute = route;
        }
      });

      this.set_header(system.name(this.place.name));

      this.add_header_button('Info').on('click', e => {
        let info = new UI.InfoPopUp;
        info.addCard(new Summary.Place({place: this.place}));
        info.show();
      });

      this.add_footer_button('Engage').on('click', e => {
        $('#spacer').data('info', this.selectedRoute.transit);
        this.hide();
        Game.open('transit');
        $('#spacer').data('state', 'transit');
      });

      this.add_footer_button('Cancel')
        .addClass('btn-secondary')
        .on('click', e => {this.hide()});

      this.add_row('Flip point', this.flip);
      this.add_row('Distance', this.dist);
      this.add_row('Acceleration', this.dv);
      this.add_row('Max velocity (rel. destination)', this.maxv);
      this.add_row('Fuel', this.fu);
      this.add_row('Time', this.tm);
      this.add(this.slider.root);
    }

    get cancellable() {return true}
    get place()       {return this.opt.place}
    get routes()      {return this.opt.routes}
    get fastest()     {return this.opt.fastest}
  };

  return Navigation;
});
