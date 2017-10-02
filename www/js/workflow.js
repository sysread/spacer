class Interactive extends Card {
  clear() {
    $('.interactive', this.root).remove();
  }

  ask(msg, ...choices) {
    return new Promise(resolve => {
      this.clear();
      this.add_text(msg).addClass('interactive');

      for (let choice of choices) {
        let btn = this.add_button(choice).addClass('interactive');
        btn.data('value', choice);
      }

      this.root.on('click', 'a', (e) => {
        e.preventDefault();
        resolve( $(e.target).data('value') );
      });
    });
  }

  ok(msg) {
    return this.ask(msg, 'Ok');
  }
}
