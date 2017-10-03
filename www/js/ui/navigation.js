class Navigation extends Card {
  constructor(opt) {
    super(opt);
    this.dests = {};

    this.set_header('Navigation');
    this.add_text('Your navigational computer automatically calculates the optimal trajectory from your current location to the other settlements in the system.');
    this.add_text(`Being born on ${data.bodies[game.player.home].name}, your body is adapted to ${data.bodies[game.player.home].gravity}G, allowing you to endure a sustained burn at ${game.player.maxAcceleration().toFixed(2)}G.`);
    this.add_text(`Your ship is capable of ${game.player.shipAcceleration().toFixed(2)}Gs of acceleration with her current load out (${csn(Math.round(game.player.ship.currentMass()))} metric tonnes). With ${Math.round(game.player.ship.fuel * 100) / 100} tonnes of fuel, your ship has a maximum burn time of ${game.player.ship.maxBurnTime() * data.hours_per_turn} hours at maximum thrust.`);

    for (const body of system.bodies()) {
      if (body === game.locus)
        continue;

      let au = Math.round(Physics.AU(system.distance(game.locus, body) * 100)) / 100;
      if (au < 0.01) au = '< 0.01';

      let btn = new Button;
      btn.root.addClass('btn-block text-left');
      btn.add(system.short_name(body));
      btn.data({'body': body});

      if (system.type(body) === 'moon') {
        btn.add(`<span class="badge badge-pill float-right">${system.kind(body)}</span>`);
      }

      let row = $('<div class="row">')
        .append( $('<div class="col col-sm-6 py-2">').append(btn.root) )
        .append(
          $('<div class="row col-12 col-sm-6 py-2">')
            .append($('<div class="col-6 mute">').append(au + ' AU'))
            .append($('<div class="col-6 mute">').append(system.faction(body))));

      this.add(row);
    }

    this.root.on('click', 'button', e => {
      let body  = $(e.target).data('body');
      let modal = new TripPlanner({place: game.place(body)});
      modal.show();
    });
  }
}

class TripPlanner extends InfoPopUp {
  constructor(opt) {
    super(opt);
    this.navcomp = new NavComp(Physics.G(game.player.maxAcceleration()), game.player.ship, game.place().name);
    this.addCard(new PlaceSummary({place: this.place}));
  }

  get place() {return this.opt.place}
}
