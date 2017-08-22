class Game {
  constructor() {
    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  }

  onDeviceReady() {
    let me = this;

    $(function() {
      me.bindNav();
      $('#spacer-nav a:first').click();
      me.begin();
    });
  }

  bindNav() {
    $('#spacer-nav a').click(function(e) {
      e.preventDefault();

      let link = $(e.target);

      $('#spacer-nav li').removeClass('active');
      link.parent('li').addClass('active');

      $('#spacer-content').load(link.data('path'));
    });
  }

  start() {
    this.data = {
      date   : new Date('2242-01-01 00:00:01'),
      turns  : 0,
      player : new Person({name: 'Jameson'}),
      places : {},
      place  : 'earth'
    };

    for (let name of system.bodies())
      this.data.places[name] = new Place(name);

    this.save();
  }

  save() {
  }

  load() {
    return false;
  }

  begin() {
    if (!this.load())
      this.start();
    this.refresh();
  }

  place(name) {
    return this.data.places[name || this.data.place];
  }

  player() {
    return this.data.player;
  }

  date() {
    let y = this.data.date.getFullYear();
    let m = this.data.date.getMonth() + 1;
    let d = this.data.date.getDay();

    return [y, m < 10 ? `0${m}` : m, d < 10 ? `0${d}` : d].join('-');
  }

  refresh() {
    $('#spacer-nav-credits').text(`${this.data.player.money} credits`);
    $('#spacer-nav-turn').text(`${this.date()} (turn ${this.data.turns})`);
  }

  turn() {
    ++this.data.turns;
    this.data.date.setHours(this.data.date.getHours() + 4);
    system.set_date(this.date());

    system.bodies().forEach((name) => {
      this.place(name).turn();
    });

    this.refresh();
  }
}
