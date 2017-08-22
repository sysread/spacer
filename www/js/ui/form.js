class FormGroup extends Widget {
  constructor(name, type, label, extra) {
    super();
    this.name = name;
    this.type = type;
    this.label_text = label;
    this.extra = extra;
    this.lazy('label input');
  }

  get() { return $(this.input()).val() }
  set(new_value) { $(this.input()).val(new_value) }

  _build_root() {
    let div = super._build_root();
    div.addClass('form-group');
    if (this.label()) div.append(this.label());
    div.append(this.input());
    return div;
  }

  _build_label() {
    return this.label_text
      ? $(`<label for="${this.name}">${this.label_text}</label>`)
      : null;
  }

  _build_input() {
    let input = $(`<input type="${this.type}" name="${this.name}" class="form-control">`);

    if (this.extra) {
      Object.keys(this.extra).forEach((key) => {
        input.attr(key, this.extra[key]);
      });
    }

    return input;
  }
}

class CounterField extends FormGroup {
  constructor(name, label, min, max) {
    super(name, 'number', label, {'min': min, 'max': max});
    this.lazy('all up down real_input');
  }

  get() {
    let n = parseInt($(this.real_input()).val(), 10);
    return isNaN(n) ? this.extra.min : n;
  }

  set(new_count) {
    if (new_count < this.extra.min)
      $(this.real_input()).val(this.extra.min);
    else if (new_count > this.extra.max)
      $(this.real_input()).val(this.extra.max);
    else
      $(this.real_input()).val(new_count);
    this.get();
  }

  _build_real_input() {
    let input = super._build_input();
    $(input).val(this.extra.min);
    return input;
  }

  _build_input() {
    let div = $('<div class="input-group">');
    div.append(this.set_button(this.extra.min, 'glyphicon-fast-backward'));
    div.append(this.inc_button(-5, 'glyphicon-backward'));
    div.append(this.inc_button(-1, 'glyphicon-chevron-left'));
    div.append(this.real_input());
    div.append(this.inc_button(1, 'glyphicon-chevron-right'));
    div.append(this.inc_button(5, 'glyphicon-forward'));
    div.append(this.set_button(this.extra.max, 'glyphicon-fast-forward'));
    return div;
  }

  inc_button(amount, glyph) {
    let div = $(`<div class="input-group-addon" style="cursor:pointer"><span class="glyphicon ${glyph}"></span></div>`);
    let me  = this; div.on('click', (e) => {me.set(me.get() + amount)});
    return div;
  }

  set_button(amount, glyph) {
    let div = $(`<div class="input-group-addon" style="cursor:pointer"><span class="glyphicon ${glyph}"></span></div>`);
    let me  = this; div.on('click', (e) => {me.set(amount)});
    return div;
  }
}

class Form extends Widget {
  constructor() {
    super();
    this.inputs = new Map;
  }

  _build_root() {
    return $('<form>');
  }

  input(name) { return this.inputs.get(name) }
  get(name) { return this.input(name).get() }
  set(name, value) { return this.input(name).set(value) }

  add_action(label, action) {
    let btn = new Button(label);
    this.root().append(btn);
    btn.on('click', action);
    return this;
  }

  add_input(input) {
    input.attach(this.root());
    this.inputs.set(input.name, input);
    return this;
  }
}

class InlineForm extends Form {
  constructor() {
    super();
  }

  _build_root() {
    let root = super._build_root();
    root.addClass('form-inline');
    return root;
  }
}

class HorizontalForm extends Form {
  constructor() {
    super();
  }

  _build_root() {
    let root = super._build_root();
    root.addClass('form-horizontal');
    return root;
  }
}
