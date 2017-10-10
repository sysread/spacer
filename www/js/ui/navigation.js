class Navigation extends Card {
  constructor(opt) {
    super(opt);
    this.dests = {};
    this.navcomp = new NavComp;

    this.set_header('Navigation');
    this.add_header_button('Map').on('click', (e)=>{open('plot')});
    this.add_text('Your navigational computer automatically calculates the optimal trajectory from your current location to the other settlements in the system.');
    this.add_text(`Being born on ${data.bodies[game.player.home].name}, your body is adapted to ${data.bodies[game.player.home].gravity}G, allowing you to endure a sustained burn of ${R(Physics.G(game.player.maxAcceleration()), 3)}G.`);
    this.add_text(`Your ship is capable of ${R(Physics.G(game.player.shipAcceleration()), 3)}Gs of acceleration with her current load out (${csn(R(game.player.ship.currentMass()))} metric tonnes). With ${R(game.player.ship.fuel, 3)} tonnes of fuel, your ship has a maximum burn time of ${game.player.ship.maxBurnTime() * data.hours_per_turn} hours at maximum thrust.`);

    for (const body of system.bodies()) {
      if (body === game.locus)
        continue;

      const row = new NavRow(body);
      this.add(row.root);
    }

    this.root.on('click', 'button.nav-target', e => {
      const body = $(e.target).data('body');

      const modal = new TripPlanner({
        'place'   : game.place(body),
        'routes'  : this.navcomp.transits[body],
        'fastest' : this.navcomp.fastest(body)
      });

      modal.show();
    });
  }
}

class NavRow extends Component {
  constructor(body, opt) {
    super(opt);

    let au = Math.round(Physics.AU(system.distance(game.locus, body) * 100)) / 100;
    if (au < 0.01) au = '< 0.01';

    let btn = new Button;
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
}

class TripPlanner extends Modal {
  constructor(opt) {
    super(opt);

    this.dist = $('<span>');
    this.flip = $('<span>');
    this.dv   = $('<span>');
    this.maxv = $('<span>');
    this.fu   = $('<span>');
    this.tm   = $('<span>');

    this.slider = new Slider({
      min      : 0,
      max      : this.routes.length - 1,
      initial  : this.fastest.index,
      callback : n => {
        const route = this.routes[n];
        const plan = route.transit;
        const [days, hours] = plan.days_hours;

        let g = Math.round(Physics.G(plan.accel) * 1000) / 1000;
        if (g === 0) g = '< 0.001';

        this.flip.text(csn(Math.ceil(plan.km / 2)) + ' km');
        this.dist.text(`${Math.round(plan.au * 100) / 100} AU (${csn(Math.round(plan.km))} km)`);
        this.dv.text(g + ' G');
        this.maxv.text(csn(R(plan.maxVelocity / 1000)) + ' km/s');
        this.fu.text((Math.round(route.fuel * 100) / 100) + ' tonnes (est)');
        this.tm.text(`${csn(days)} days, ${csn(hours)} hours`);

        this.selectedRoute = route;
      }
    });

    this.set_header(system.name(this.place.name));

    this.add_header_button('Info').on('click', e => {
      let info = new InfoPopUp;
      info.addCard(new PlaceSummary({place: this.place}));
      info.show();
    });

    this.add_footer_button('Engage').on('click', e => {
      $('#spacer').data('info', this.selectedRoute.transit);
      this.hide();
      open('transit');
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
}
