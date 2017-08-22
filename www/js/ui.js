class Widget {
  constructor() {
    this.attr = new Map;
    this.lazy('root');
  }

  attach(target) {
    $(target).append(this.root());
    return this;
  }

  detach() {
    $(this).remove();
    return this;
  }

  lazy(names) {
    if (!(names instanceof Array))
      names = names.split(' ');

    names.forEach((name) => {
      this.attr.set(name, null);

      this[name] = () => {
        if (this.attr.get(name) === null)
          this.attr.set(name, this['_build_' + name].call(this));
        return this.attr.get(name);
      }
    });
  }

  _build_root() {
    return $('<div>');
  }
}

class Notice extends Widget {
  constructor(level, msg) {
    super();
    this.level = level;
    this.msg = msg;
  }

  attach(target) {
    $(target).prepend(this.root());
    return this;
  }

  detach() {
    $(this.root()).fadeOut(() => {super.detach()});
    return this;
  }

  _build_root() {
    let div = super._build_root();
    div.addClass(`alert alert-${this.level} alert-dismissible`);
    div.attr('role', 'alert');

    let btn = new Button('&times;', {'class': 'close', 'data-dismiss': 'alert'});
    btn.attach(div);

    div.append($(`<span>${this.msg}</span>`));

    return div;
  }
}

class Button extends Widget {
  constructor(txt, extra) {
    super();
    this.txt = txt;
    this.extra = extra;
  }

  _build_root() {
    let btn = $(`<button type="button" class="btn btn-default">${this.txt}</button>`);

    if (this.extra) {
      Object.keys(this.extra).forEach((key) => {
        btn.attr(key, this.extra[key]);
      });
    }

    return btn;
  }
}

function number(n, precision) {
  let dec;

  if (!precision) {
    n = Math.round(n);
  }
  else {
    [n, dec] = new String(n).split('.');
    dec = dec.substr(0, precision);
  }

  let str   = new String(n);
  let buf   = [];
  let parts = [];

  for (var i = str.length - 1; i >= 0; --i) {
    buf.unshift(str[i]);

    if (buf.length == 3) {
      parts.unshift(buf.join(''));
      buf = [];
    }
  }

  if (buf.length > 0) {
    parts.unshift(buf.join(''));
  }

  if (dec)
    return parts.join(',') + '.' + dec;
  else
    return parts.join(',');
}

function distance(meters) {
  let au = 149597870700;
  return (meters/au) > 0.1
    ? number(meters/au, 1) + ' AU'
    : number(meters/1000) + ' km';
}
