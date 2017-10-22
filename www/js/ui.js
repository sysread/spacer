define(function(require, exports, module) {
  const util = require('util');

  const UI = {};

  UI.Component = class {
    constructor(opt) {
      this.opt  = opt || {};
      this.root = $('<' + (this.opt.tag || 'div') + '>');
    }

    data(opt) {
      this.root.data(opt);
    }

    add(thing) {
      this.root.append(thing);
      return thing;
    }

    detach() {
      this.root.remove();
    }

    attach(to) {
      if (to instanceof Component) {
        to.add(this.root);
      } else {
        to.append(this.root);
      }
    }
  };

  UI.Button = class extends UI.Component {
    constructor(opt) {
      super($.extend(opt || {}, {tag: 'button'}));
      this.root.attr('type', 'button').addClass('btn btn-dark');
    }

    onClick(fn) {
      this.root.on('click', fn);
    }
  };

  UI.ButtonGroup = class extends UI.Component {
    constructor(opt) {
      super(opt);
      this.root.addClass('btn-group').attr('role', 'group');
    }

    addButton(btn) {
      this.root.append(btn.root);
    }
  };

  UI.Slider = class extends UI.Component {
    constructor(opt) {
      super(opt);

      this.slider = $('<input type="range" class="form-control form-control-sm">');
      this.slider.attr('min',  this.min);
      this.slider.attr('max',  this.max);
      this.slider.attr('step', this.step);
      this.slider.on('input', (e) => { this.val = this.slider.val() });

      this.amount = $('<input type="number" class="form-control" readonly>');
      this.amount.attr('min', this.min);
      this.amount.attr('max', this.max);

      this.dn    = $('<button type="button" class="btn btn-dark">&#9668;</button>');
      this.up    = $('<button type="button" class="btn btn-dark">&#9658;</button>');
      this.dndn  = $('<button type="button" class="btn btn-dark">&#9668;&#9668;</button>');
      this.upup  = $('<button type="button" class="btn btn-dark">&#9658;&#9658;</button>');

      this.dn.click((e) => {this.val -= this.step});
      this.up.click((e) => {this.val += this.step});
      this.dndn.click((e) => {this.val = this.min});
      this.upup.click((e) => {this.val = this.max});

      this.root = $('<div class="input-group">');
      if (this.minmaxbtns) this.root.append($('<span class="input-group-btn">').append(this.dndn));
      this.root.append($('<span class="input-group-btn">').append(this.dn));
      this.root.append(this.slider);
      this.root.append($('<span class="input-group-btn">').append(this.up));
      if (this.minmaxbtns) this.root.append($('<span class="input-group-btn">').append(this.upup));

      this.value = this.initial;
      this.update();
    }

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
  };

  UI.ResourceExchange = class extends UI.Component {
    constructor(opt) {
      super(opt);

      this.resources = new util.ResourceCounter;
      this.store     = opt.store;
      this.cargo     = opt.cargo;
      this.root      = $('<table class="table table-sm">');

      for (let [item, amt] of this.store.entries()) {
        this.resources.inc(item, amt);
      }

      for (let [item, amt] of this.cargo.entries()) {
        this.resources.inc(item, amt);
      }

      for (let [item, amt] of this.resources.entries()) {
        if (amt === 0)
          continue;

        let store = $('<button type="button" class="btn btn-dark">').text(this.store.get(item)).css('width', '50px');
        let cargo = $('<button type="button" class="btn btn-dark">').text(this.cargo.get(item)).css('width', '50px');

        let slider = new UI.Slider({
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

        slider.root.prepend($('<span class="input-group-btn">').append(store));
        slider.root.append($('<span class="input-group-btn">').append(cargo));

        this.root
          .append($('<tr>')
            .append(`<td class="text-capitalize exchange-item">${item}</td>`)
            .append($('<td>').append(slider.root)));
      }
    }

    get max_cargo() { return this.opt.max_cargo }
    get max_store() { return this.opt.max_store }
    get approve()   { return this.opt.approve   }
    get callback()  { return this.opt.callback  }
  };

  UI.Row = class extends UI.Component {
    constructor(breaks, opt) {
      super(opt);
      this.root.addClass('row py-2');
      this.breaks = breaks;
    }

    colwidth(size) {
      let parts = ['col'];
      if (this.breaks) parts.push(this.breaks);
      if (size) parts.push(size);
      return parts.join('-');
    }

    col(body, size) {
      let col = $(`<div class="${this.colwidth(size)}">`).append(body);
      this.root.append(col);
      return col;
    }

    term(body, size) {
      return this.col(body, size).addClass('font-weight-bold');
    }

    def(body, size) {
      return this.col(body, size).addClass('text-muted');
    }
  };

  UI.row = function(term, def) {
    const r = new UI.Row;
    r.term(term);
    r.def(def);
    return r.root;
  };

  UI.Container = class extends UI.Component {
    constructor(opt) {
      super(opt);
      this.root.addClass('container-fluid');
    }
  };

  UI.Card = class extends UI.Component {
    constructor(opt) {
      super(opt);
      this.body = $('<div class="card-body bg-black">');
      this.root.addClass('card mb-3').append(this.body);
    }

    set_header(text, tag='h3') {
      if (!this.hdr) {
        this.hdr = $(`<${tag} class="card-header">`);
        this.body.before(this.hdr);
      }

      this.hdr.empty().append(text);
      return this.hdr;
    }

    add_header_button(text) {
      if (this.hdr) {
        let btn = $(`<button type="button" class="btn btn-dark btn-sm float-right ml-2">${text}</button>`);
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
      if (!this.title) {
        this.title = $(`<${tag} class="card-title">`);
        this.body.prepend(this.title);
      }

      this.title.empty().append(text);
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
      let row = new UI.Row;
      row.term(label);
      row.def(text);
      this.body.append(row.root);
      return row.root;
    }

    add_def(label, text) {
      let row = new UI.Row('sm');
      row.term(label);
      row.def(text);
      this.body.append(row.root);
      return row.root;
    }

    add_link(text) {
      let link = $('<a href="#" class="card-link">').append(text);
      return this.add(link);
    }

    add_button(text) {
      let btn = this.add_link(text);
      btn.removeClass('card-link').addClass('btn btn-dark m-1');
      return btn;
    }
  };

  UI.Modal = class extends UI.Component {
    constructor(opt) {
      super(opt);
      this.root    = $('<div class="modal">');
      this.dialog  = $('<div class="modal-dialog" role="document">');
      this.content = $('<div class="modal-content">');
      this.body    = $('<div class="modal-body">');

      this.root.append(this.dialog);
      this.dialog.append(this.content);
      this.content.append(this.body);

      if (!this.cancellable)
        this.root.attr('data-backdrop', 'static');
    }

    get cancellable() {return this.opt.cancellable}

    show() {this.root.modal('show')}
    hide() {this.root.modal('hide')}

    onShow(fn)   {this.root.on('show.bs.modal',   fn)}
    onShown(fn)  {this.root.on('shown.bs.modal',  fn)}
    onHide(fn)   {this.root.on('hide.bs.modal',   fn)}
    onHidden(fn) {this.root.on('hidden.bs.modal', fn)}

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

    add_footer() {
      if (!this.footer) {
        this.footer = $('<div class="modal-footer">');
        this.body.after(this.footer);
      }

      return this.footer;
    }

    add_footer_button(text) {
      this.add_footer();
      let btn = $('<button type="button" class="btn btn-dark">').append(text);
      this.footer.append(btn);
      return btn;
    }

    add(stuff) {
      this.body.append(stuff);
    }

    add_text(text) {
      let p = $('<p>').append(text);
      this.body.append(p);
      return p;
    }

    add_row(label, text) {
      let row = new UI.Row('sm');
      row.term(label);
      row.def(text);
      this.body.append(row.root);
      return row;
    }
  };

  UI.Ok = class extends UI.Modal {
    constructor(msg, opt) {
      super(opt);
      if (msg) this.add_text(msg);
      this.add_footer_button('Ok').attr('data-dismiss', 'modal');
    }
  };

  UI.Ask = class extends UI.Modal {
    constructor(msg, choices, cb, opt) {
      super(opt);
      if (msg) this.add_text(msg);
      for (let choice of choices) this.add_footer_button(choice).attr('data-dismiss', 'modal');
      this.root.on('click', 'button', e => { cb( $(e.target).text() ) });
    }
  };

  UI.InfoPopUp = class extends UI.Modal {
    constructor(opt) {
      super(opt);
      this.body.addClass('p-0 m-0');
      this.add_footer_button('Done').attr('data-dismiss', 'modal');
    }

    addCard(card) {
      card.root.removeClass('mb-3').addClass('border-0');
      this.body.append(card.root);
    }
  };

  UI.ProgressBar = class extends UI.Component {
    constructor(opt) {
      super(opt);
      this.meter = $('<div class="progress-bar bg-warning" style="height: 35px">');
      this.display = $('<span class="badge badge-pill badge-dark float-left m-1 font-weight-normal" style="font-size:14px">');
      this.meter.append(this.display);
      this.root.addClass('progress bg-dark').append(this.meter);
    }

    setProgress(pct, display) {
      if (display === undefined) display = `${pct}%`;
      this.meter.finish().css('width', `${pct}%`);
      this.display.finish().text(display);
    }
  };

  return UI;
});
