class Table extends Widget {
  constructor(stripy) {
    super();
    this.stripy = stripy;
    this.lazy('head body');
    this.cols  = [];
    this.rows  = [];
    this.align = [];
  }

  add_column(label) {
    this.cols.push(label);
    this.align.push('auto');
  }

  add_columns(labels) {
    labels.forEach((label) => {this.add_column(label)});
  }

  add_row(row) {
    this.rows.push(row);
  }

  align_column(column, direction) {
    this.align[column] = direction;
  }

  attach(target) {
    this.build();
    super.attach(target);
  }

  build() {
    let width = Math.ceil(100 / this.cols.length);

    $(this.head()).empty();
    $(this.body()).empty();

    let tr = $('<tr>');

    for (var i = 0; i < this.cols.length; ++i) {
      let th = $(`<th><div style="text-align:${this.align[i]}">${this.cols[i]}</div></th>`);
      tr.append(th);
    }

    this.head().append(tr);

    this.rows.forEach((row) => {
      let tr = $('<tr>');

      for (var i = 0; i < row.length; ++i) {
        let item = row[i];
        let td   = $(`<td width="${width}%">`);
        let div  = $(`<div style="text-align:${this.align[i]}">`);

        if (item instanceof Widget)
          item.attach(div);
        else
          div.html(item);

        td.append(div);
        tr.append(td);
      };

      this.body().append(tr);
    });
  }

  _build_root() {
    let root = $('<table class="table table-bordered table-responsive">');
    if (this.stripy) root.addClass('table-striped');

    root.append(this.head());
    root.append(this.body());

    return root;
  }

  _build_body() { return $('<tbody>') }
  _build_head() { return $('<thead>') }
}
