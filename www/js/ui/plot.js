class Plot extends UI {
  constructor(opt) {
    super(opt);
    this.data = system.plot();

    this.root.on('click', '.plot-body-info', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const body = $(e.target).data('body');

      if (body === 'sun')
        return false;

      const info = new InfoPopUp;
      info.addCard(new PlaceSummary({place: game.place(body)}));

      info.add_footer_button('Plot course').on('click', e => {
        const navComp = new NavComp;

        const modal = new TripPlanner({
          'place'   : game.place(body),
          'routes'  : navComp.transits[body],
          'fastest' : navComp.fastest(body)
        });

        info.hide();
        modal.show();
      });

      info.show();

      return false;
    });

    this.root.on('click', 'a.plot-point', (e) => {this.pointOnClickHandler(e)});
  }

  get points() {return this.data.points}
  get width()  {return this.root.width()}
  get height() {return this.root.height()}

  /*
   * Returns a fraction that scales down a pixel length more the larger it is.
   */
  static adjust(n) {
    if (n === 0) return 1;

    const inc = 0.25;
    const abs = Math.abs(n);
    let adj = 1;

    for (let i = 100; (i > abs) && (((adj + inc) * abs) < 100); i -= 10) {
      adj += inc;
    }

    return adj;
  }

  static bodyName(body) {
    const central = system.central(body);
    let name = system.name(body);

    if (central && central !== 'sun')
      name += ` (${system.name(central)})`;

    return name;
  }

  rePlot() {
    $('.plot', this.root).remove();

    this.root.width(this.root.width());
    this.root.height(this.root.width());

    const pos = this.root.position();
    this.zero = Math.ceil(this.root.width() / 2);

    this.plot = {};

    for (let body of Object.keys(this.points)) {
      this.addPoint(body);
    }

    this.root.on('click', (e) => {
      $('a', this.root).removeClass('border border-danger');
      $('.plot-selected').remove();
    });
  }

  addPoint(body) {
    const [x, y] = this.points[body];
    const left   = this.zero + (this.zero *  x * Plot.adjust(x) / 100);
    const top    = this.zero + (this.zero * -y * Plot.adjust(y) / 100);
    const key    = `p-${Math.ceil(x)}-${Math.ceil(y)}`;

    if (this.plot[key] === undefined) {
      this.plot[key] = [body];

      let item = $('<a class="plot plot-point p1" href="#">&bull;</a>');
      item.attr('id', key);

      if (body === 'sun')
        item.addClass('text-warning font-weight-bold');

      if (body === game.locus)
        item.addClass('text-success font-weight-bold');

      this.root.append(item);
      item.css({'top': top, 'left': left})
    }
    else {
      this.plot[key].push(body);

      if (body == game.locus)
        $('#' + key).addClass('text-success font-weight-bold');
    }
  }

  pointOnClickHandler(e) {
    e.stopPropagation();
    e.preventDefault();

    $('a', this.root).removeClass('border').removeClass('border-danger');
    $(e.target).addClass('border border-danger');

    let key = e.target.id;
    let point = this.plot[key];

    // Build list of bodies at this position
    let badges = $('<ul class="plot plot-selected">');
    for (let body of point) {
      let badge = $('<a href="#">')
        .addClass('plot-body-info badge badge-dark ml-1 p-2')
        .append(Plot.bodyName(body))
        .data('body', body);

      badges.append($('<li>').append(badge));
    }

    // Position badges
    let pos   = $(e.target).position();
    let width = $(e.target).outerWidth();
    badges.css({left: pos.left + 20, top: pos.top});

    $('.plot-selected').remove();
    this.root.append(badges);

    // Prevent over-flowing the right side of the page
    let badgePos   = badges.position();
    let badgeWidth = badges.width();

    if (badgeWidth + badgePos.left > this.width) {
      badges.css({
        left : this.width - badgeWidth - 20,
        top  : badgePos.top + 20
      });
    }

    return false;
  }
}
