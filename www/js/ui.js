class UI {
  constructor(opt) {
    this.opt  = opt || {};
    this.base = $('<div>');
  }

  get root() {return this.base}
}

class Slider extends UI {
  constructor(opt) {
    super(opt);

    this.slider = $('<input type="range" class="form-control form-control-sm">');
    this.slider.attr('min',  this.min);
    this.slider.attr('max',  this.max);
    this.slider.attr('step', this.step);

    this.amount = $('<input type="number" class="form-control" readonly>');
    this.amount.attr('min', this.min);
    this.amount.attr('max', this.max);

    this.monitor = null;
    this.slider.mousedown((e) => {if (e.button == 0) this.start_monitor()});
    this.slider.mouseup((e) => {this.stop_monitor()});
    this.slider.change((e) => {this.val = this.slider.val(); this.stop_monitor();});

    this.dn    = $('<button type="button" class="btn btn-dark">&#9664;</button>');
    this.up    = $('<button type="button" class="btn btn-dark">&#9658;</button>');
    this.dndn  = $('<button type="button" class="btn btn-dark">&#9664;&#9664;</button>');
    this.upup  = $('<button type="button" class="btn btn-dark">&#9658;&#9658;</button>');

    this.dn.click((e) => {this.val -= this.step});
    this.up.click((e) => {this.val += this.step});
    this.dndn.click((e) => {this.val = this.min});
    this.upup.click((e) => {this.val = this.max});

    this.group = $('<div class="input-group">');
    if (this.minmaxbtns) this.group.append($('<span class="input-group-btn">').append(this.dndn));
    this.group.append($('<span class="input-group-btn">').append(this.dn));
    this.group.append(this.slider);
    this.group.append($('<span class="input-group-btn">').append(this.up));
    if (this.minmaxbtns) this.group.append($('<span class="input-group-btn">').append(this.upup));

    this.value = this.initial;
    this.update();
  }

  start_monitor() {
    this.stop_monitor();
    this.monitor = window.setInterval(() => {this.val = this.slider.val()}, this.interval);
  }

  stop_monitor() {
    window.clearInterval(this.monitor);
    this.monitor = null;
  }

  get root()       { return this.group }
  get min()        { return this.opt.min  || 0 }
  get max()        { return this.opt.max  || 0 }
  get step()       { return this.opt.step || 1 }
  get val()        { return this.value }
  get initial()    { return this.opt.initial || this.min }
  get interval()   { return this.opt.interval || 100 }
  get minmaxbtns() { return this.opt.minmaxbtns }
  get callback()   { return this.opt.callback }
  get approve()    { return this.opt.approve }

  set val(n) {
    n = parseInt(`${n}`, 10);
    n = Math.max(n, this.min);
    n = Math.min(n, this.max);

    if (n === this.val)
      return;

    if (this.approve)
      n = this.approve(n - this.val, this.val);

    this.value = n;
    this.update();
  }

  update() {
    this.slider.val(this.val);
    this.amount.val(this.val);
    if (this.callback) this.callback(this.val);
  }

  reset() {
    this.val = this.initial;
  }
}

class ResourceExchange extends UI {
  constructor(opt) {
    super(opt);

    this.resources = new ResourceCounter;
    this.store     = opt.store;
    this.cargo     = opt.cargo;
    this.table     = $('<table class="table table-sm">');

    this.store.each((item, amt) => {this.resources.inc(item, amt)});
    this.cargo.each((item, amt) => {this.resources.inc(item, amt)});

    this.resources.each((item, amt) => {
      if (amt === 0) return;

      let store = $('<button type="button" class="btn btn-dark">').append(this.store.get(item)).css('width', '50px');
      let cargo = $('<button type="button" class="btn btn-dark">').append(this.cargo.get(item)).css('width', '50px');

      let slider = new Slider({
        step     : 1,
        min      : 0,
        max      : amt,
        initial  : this.cargo.get(item),
        approve  : (change, amt) => {
          if (this.max_cargo) {
            let total = this.cargo.sum();
            if (total + change >= this.max_cargo)
              return amt + this.max_cargo - total;
          }

          if (this.max_store) {
            let total = this.store.sum();
            if (total + change >= this.max_store)
              return amt + this.max_store - total;
          }

          if (this.approve)
            return this.approve(item, change, amt);

          return amt + change;
        },
        callback : (amt) => {
          let change = amt - this.cargo.get(item);

          store.text(this.resources.get(item) - amt);
          this.store.set(item, this.resources.get(item) - amt);

          cargo.text(amt);
          this.cargo.set(item, amt);

          if (this.callback)
            this.callback(item, change, amt);
        }
      });

      slider.group.prepend($('<span class="input-group-btn">').append(store));
      slider.group.append($('<span class="input-group-btn">').append(cargo));

      this.table
        .append($('<tr>')
          .append(`<td class="text-capitalize exchange-item">${item}</td>`)
          .append($('<td>').append(slider.group)));
    });
  }

  get root()      { return this.table }
  get max_cargo() { return this.opt.max_cargo }
  get max_store() { return this.opt.max_store }
  get approve()   { return this.opt.approve   }
  get callback()  { return this.opt.callback  }
}

class Row extends UI {
  constructor(breaks, opt) {
    super(opt);
    this.base = $('<div class="row py-2">');
    this.breaks = breaks;
  }

  get root() {return this.base}
  get row()  {return this.base}

  colwidth(size) {
    let parts = ['col'];
    if (this.breaks) parts.push(this.breaks);
    if (size) parts.push(size);
    return parts.join('-');
  }

  col(body, size) {
    let col = $(`<div class="${this.colwidth(size)}">`).append(body);
    this.base.append(col);
    return col;
  }

  term(body, size=3) {
    return this.col(body, size).addClass('font-weight-bold');
  }

  def(body, size) {
    return this.col(body, size).addClass('text-muted');
  }
}

class Container extends UI {
  constructor(opt) {
    super(opt);
    this.base = $('<div class="container">');
  }

  get root()      {return this.base}
  get container() {return this.base}

  add(thing) {
    this.base.append(thing);
    return thing;
  }
}

class Card extends UI {
  constructor(opt) {
    super(opt);
    this.base = $('<div class="card mb-3">');
    this.body = $('<div class="card-body bg-black">');
    this.base.append(this.body);
  }

  get root() {return this.base}
  get card() {return this.base}

  data(opt) {this.base.data(opt)}

  set_header(text, tag='h3') {
    if (this.hdr) this.hdr.remove();
    this.hdr = $(`<${tag} class="card-header">`).append(text);
    this.body.before(this.hdr);
    return this.hdr;
  }

  add_header_button(text) {
    if (this.hdr) {
      let btn = $(`<button type="button" class="btn btn-dark btn-sm float-right">${text}</button>`);
      this.hdr.append(btn);
      return btn;
    }

    console.log('no header has been set');
  }

  set_footer(text, tag='div') {
    if (this.ftr) this.ftr.remove();
    this.ftr = $(`<${tag} class="card-footer">`).append(text);
    this.body.after(this.ftr);
    return this.ftr;
  }

  set_title(text, tag='h4') {
    if (this.title) this.title.remove();
    this.title = $(`<${tag} class="card-title">`).append(text);
    this.body.prepend(this.title);
    return this.title;
  }

  add(thing) {
    this.body.append(thing);
    return thing;
  }

  add_text(text) {
    let p = $('<p class="card-text">').append(text);
    return this.add(p);
  }

  add_row(label, text) {
    let row = new Row;
    row.term(label);
    row.def(text);
    this.body.append(row.row);
    return row.row;
  }

  add_def(label, text) {
    let row = new Row('sm');
    row.term(label);
    row.def(text);
    this.body.append(row.row);
    return row.row;
  }

  add_link(text) {
    let link = $('<a href="#" class="card-link">').append(text);
    return this.add(link);
  }

  add_button(text) {
    let btn = this.add_link(text);
    btn.removeClass('card-link').addClass('btn btn-dark');
    return btn;
  }
}

class Modal extends UI {
  constructor(opt) {
    super(opt);
    this.base    = $('<div class="modal">');
    this.dialog  = $('<div class="modal-dialog" role="document">');
    this.content = $('<div class="modal-content">');
    this.body    = $('<div class="modal-body">');

    this.base.append(this.dialog);
    this.dialog.append(this.content);
    this.content.append(this.body);

    if (!this.cancellable) this.base.attr('data-backdrop', 'static');
  }

  get root()        {return this.base}
  get modal()       {return this.base}
  get cancellable() {return this.opt.cancellable}

  show() {this.base.modal('show')}
  hide() {this.base.modal('hide')}

  set_header(text, tag='h5') {
    if (this.header) this.header.remove();
    this.header = $(`<div class="modal-header"><${tag} class="modal-title">${text}</${tag}></div>`);
    this.body.before(this.header);
    return this.header;
  }

  add_header_button(text) {
    if (this.header) {
      let btn = $(`<button type="button" class="btn btn-dark">${text}</button>`);
      this.header.append(btn);
      return btn;
    }

    console.log('no header has been set');
  }

  add_footer_button(text) {
    if (!this.footer) {
      this.footer = $('<div class="modal-footer">');
      this.body.after(this.footer);
    }

    let btn = $(`<button type="button" class="btn btn-dark">${text}</button>`);
    this.footer.append(btn);
    return btn;
  }

  add_text(text) {
    let p = $(`<p>${text}</p>`);
    this.body.append(p);
    return p;
  }

  add_row(label, text) {
    let row = new Row('sm');
    row.term(label);
    row.def(text);
    this.body.append(row.row);
    return row;
  }
}

class Ok extends Modal {
  constructor(msg, opt) {
    super(opt);
    this.add_text(msg);
    this.add_footer_button('Ok').attr('data-dismiss', 'modal');
  }

  get ok() {return this.modal}
}
