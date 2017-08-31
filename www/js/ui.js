class Slider {
  constructor(opt) {
    this.opt = opt || {};

    this.slider = $('<input type="range" class="form-control">');
    this.slider.attr('min',  this.min);
    this.slider.attr('max',  this.max);
    this.slider.attr('step', this.step);
    this.slider.val(this.initial);

    this.amount = $('<input type="number" class="form-control" readonly>');
    this.amount.attr('min', this.min);
    this.amount.attr('max', this.max);
    this.amount.val(this.initial);

    this.monitor = null;
    this.slider.mousedown((e) => {this.monitor = window.setInterval(() => {this.update()}, this.interval)});
    this.slider.mouseup((e) => {window.clearInterval(this.monitor)});
    this.slider.change((e) => {this.amount.val(this.slider.val())});

    this.dn    = $('<button type="button" class="btn btn-dark btn-sm">&#9664;</button>');
    this.up    = $('<button type="button" class="btn btn-dark btn-sm">&#9658;</button>');
    this.dndn  = $('<button type="button" class="btn btn-dark btn-sm">&#9664;&#9664;</button>');
    this.upup  = $('<button type="button" class="btn btn-dark btn-sm">&#9658;&#9658;</button>');

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
  }

  get min()        { return this.opt.min  || 0 }
  get max()        { return this.opt.max  || 0 }
  get step()       { return this.opt.step || 1 }
  get val()        { return parseInt(this.slider.val(), 10) }
  get initial()    { return this.opt.initial || this.min }
  get interval()   { return this.opt.interval || 100 }
  get minmaxbtns() { return this.opt.minmaxbtns }
  get callback()   { return this.opt.callback }
  get approve()    { return this.opt.approve }

  set val(n) {
    n = Math.max(n, this.min);
    n = Math.min(n, this.max);

    if (this.approve)
      n = this.approve(n - this.val, this.val);

    this.slider.val(n);
    this.update();
  }

  reset() {
    this.val = this.initial;
  }

  update() {
    this.amount.val(this.val);
    if (this.callback) this.callback(this.val);
  }
}

class ResourceExchange {
  constructor(opt) {
    this.opt = opt || {};
    this.resources = new ResourceCounter;
    this.store     = new ResourceCounter(opt.store);
    this.cargo     = new ResourceCounter(opt.cargo);
    this.table     = $('<table class="table table-sm">');

    this.store.each((item, amt) => {this.resources.inc(item, amt)});
    this.cargo.each((item, amt) => {this.resources.inc(item, amt)});

    this.resources.each((item, amt) => {
      if (amt === 0) return;

      let store = $('<button type="button" class="btn btn-sm btn-dark">').append(this.store.get(item)).css('width', '50px');
      let cargo = $('<button type="button" class="btn btn-sm btn-dark">').append(this.cargo.get(item)).css('width', '50px');

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

  get max_cargo() { return this.opt.max_cargo }
  get max_store() { return this.opt.max_store }
  get approve()   { return this.opt.approve   }
  get callback()  { return this.opt.callback  }
}
