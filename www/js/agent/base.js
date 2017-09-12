class Actor {
  constructor(opt) {
    opt = opt || {};
    this.money = opt.money || 0;
    this.place = opt.place;
    this.queue = [];
  }

  save() {
    return {
      money : this.money,
      place : this.place,
      queue : this.queue
    };
  }

  load(obj) {
    this.money = obj.money;
    this.place = obj.place;
    this.queue = obj.queue;
  }

  gain(amount) {
    this.money += amount;
  }

  cost(amount) {
    this.money -= amount;
  }

  has_pending() {
    return this.queue.length > 0;
  }

  enqueue(action, info) {
    this.queue.push([action, info]);
  }

  dequeue() {
    return this.queue.shift();
  }

  plan() {
    throw new Error('plan() must be overridden by the implementer');
  }

  turn() {
    if (!this.has_pending())
      this.plan();

    let [action, info] = this.dequeue();
    this[action].call(this, info);
  }

  // Do nothing for one turn
  wait() {}
}
