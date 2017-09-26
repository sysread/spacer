class Plot extends UI {
  constructor(opt) {
    super(opt);
    this.data = system.plot();
    this.root.addClass('p-1 m-0')
      .css({
        'position' : 'absolute',
        'left'     : '50%',
        'top'      : '50%',
        'height'   : '50%',
        'width'    : '50%'
      });

    this.root.on('click', '.plot-body-info', (e) => {
      e.stopPropagation();
      e.preventDefault();
      let body = $(e.target).data('body');
      let info = new InfoPopUp;
      info.addCard(new PlaceSummary({place: game.place(body)}));
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
    let i = (100 - Math.abs(n)) / 10;
    let j = Math.log(i) * 2;
    return j;
  }

  static bodyName(body) {
    let name    = system.name(body);
    let central = system.central(body);

    if (central && central !== 'sun')
      name += ` (${system.name(central)})`;

    return name;
  }

  rePlot() {
    this.root.height( this.root.width() );
    this.root.empty();
    this.plot = {};

    for (let body of Object.keys(this.points))
      this.addPoint(body);

    this.root.parent().on('click', (e) => {
      $('a', this.root).removeClass('border border-danger');
      $('.plot-selected').remove();
    });
  }

  addPoint(body) {
    let [x, y] = this.points[body];
    let left   = Math.ceil(this.width  * x * Plot.adjust(x) / 100 / 2);
    let top    = Math.ceil(this.height * y * Plot.adjust(y) / 100 / 2);
    let key    = `p-${left}-${top}`;

    if (this.plot[key] === undefined) {
      this.plot[key] = [body];

      let item = $('<a class="plot-point" href="#" id="' + key + '">&bull;</a>')
        .css({'top': top, 'left': left})
        .addClass('plot-locus p1');

      if (body === 'sun')
        item.addClass('text-warning font-weight-bold');

      if (body === game.locus)
        item.addClass('text-success font-weight-bold');

      this.root.append(item);
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
    let badges = $('<ul class="plot-selected">');
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
