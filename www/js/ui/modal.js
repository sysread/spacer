class Modal extends Widget {
  constructor(title, ok_button, ok_callback) {
    super();
    this.title_text  = title;
    this.ok_button   = ok_button;
    this.ok_callback = ok_callback;
    this.lazy('modal doc content title header body footer');
  }

  show()   { this.modal().modal('show');   return this; }
  hide()   { this.modal().modal('hide');   return this; }
  toggle() { this.modal().modal('toggle'); return this; }

  _build_modal() {
    return $(this.root()).modal({show: false});
  }

  _build_root() {
    let div = super._build_root();
    div.addClass('modal', 'fade');
    div.attr('tabindex', '-1');
    div.attr('role', 'dialog');
    div.append(this.doc());
    return div;
  }

  _build_doc() {
    let div = $('<div class="modal-dialog" role="document">');
    div.append(this.content());
    return div;
  }

  _build_content() {
    let div = $('<div class="modal-content">');
    div.append(this.header());
    div.append(this.body());
    div.append(this.footer());
    return div;
  }

  _build_title() {
    return $(`<h4 class="modal-title">${this.title_text}</h4>`);
  }

  _build_header() {
    let div = $('<div class="modal-header">');
    let close = new Button('&times;', {'class': 'close', 'data-dismiss': 'modal'});
    div.append(close);
    div.append(this.title());
    return div;
  }

  _build_body() {
    return $('<div class="modal-body">');
  }

  _build_footer() {
    let div = $('<div class="modal-footer">');

    if (this.ok_button) {
      let btn = new Button(this.ok_button, {'class': 'btn btn-primary text-capitalize', 'data-dismiss': 'modal'});
      if (this.ok_callback) $(btn.root()).on('click', this.ok_callback);
      btn.attach(div);
    }

    let close = new Button('Close', {'data-dismiss': 'modal'});
    close.attach(div);

    return div;
  }
}

class Ask extends Modal {
  constructor(question) {
    super(question);
    this.choices = [];
    this.cb = null;
  }

  add_choice(value, text) {
    this.choices.push([value, text]);
  }

  set_callback(fn) {
    this.cb = fn;
  }

  _build_body() {
    let div = super._build_body();
    let grp = $('<div class="btn-group-vertical" role="group">');

    this.choices.forEach((choice) => {
      let btn = new Button(choice[1], {'data-dismiss': 'modal', 'data-value': choice[0]});
      btn.attach(grp);
    });

    grp.on('click', 'button', (e) => {if (this.cb) this.cb($(e.target).data('value'))});

    div.append(grp);
    return div;
  }
}
