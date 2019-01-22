import { resource, resources, ResourceCounter, Counter } from './common';
import Store from './store';

interface EntryList {
  [key: string]: number[];
}

interface Saved {
  history: EntryList;
  sum:     ResourceCounter;
  daily:   ResourceCounter;
}

class History {
  length:  number;
  history: EntryList;
  sum:     Store;
  daily:   Store;
  _avg:    Counter;

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

    this._avg = {};
  }

  keys(): resource[] {
    return resources;
  }

  inc(item: resource, amt: number) {
    this.daily.inc(item, amt);
    delete this._avg[item];
  }

  dec(item: resource, amt: number) {
    this.daily.dec(item, amt);
    delete this._avg[item];
  }

  get(item: resource): number {
    return this.sum.get(item);
  }

  count(item: resource): number {
    return this.sum.count(item);
  }

  avg(item: resource): number {
    if (this.history[item] == undefined || this.history[item].length == 0) {
      return 0;
    }

    if (this._avg[item] == undefined) {
      this._avg[item] = this.sum.get(item) / this.history[item].length;
    }

    return this._avg[item];
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
      delete this._avg[item];
    }

    this.daily.clear();
  }
}

export = History;
