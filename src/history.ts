import { resource, resources } from './common';
import Store from './store';

interface Counter {
  [key: string]: number;
}

interface EntryList {
  [key: string]: number[];
}

interface Saved {
  history: EntryList;
  sum:     Counter;
  daily:   Counter;
}

class History {
  protected length:  number;
  protected history: EntryList;
  protected sum:     Store;
  protected daily:   Store;

  constructor(length: number, init?: Saved) {
    this.length = length;

    if (init == null) {
      this.history = {};
      this.sum     = new Store;
      this.daily   = new Store;
    }
    else {
      this.history = init.history;
      this.sum     = new Store(init.sum);
      this.daily   = new Store(init.daily);
    }
  }

  keys(): resource[] {
    return resources;
  }

  inc(item: resource, amt: number) {
    this.daily.inc(item, amt);
  }

  dec(item: resource, amt: number) {
    this.daily.dec(item, amt);
  }

  get(item: resource): number {
    return this.sum.get(item);
  }

  count(item: resource): number {
    return this.sum.count(item);
  }

  avg(item: resource): number {
    if (!(item in this.history)) {
      return 0;
    }

    if (this.history[item].length == 0) {
      return 0;
    }

    return this.sum.get(item) / this.history[item].length;
  }

  add(item: resource, amt: number) {
    if (!(item in this.history)) {
      this.history[item] = [];
    }

    this.history[item].unshift(amt);
    this.sum.inc(item, amt);

    while (this.history[item].length > this.length) {
      this.sum.dec(item, this.history[item].pop());
    }
  }

  rollup() {
    for (const item of resources) {
      this.add(item, this.daily.get(item));
    }

    this.daily.clear();
  }
}

export = History;
