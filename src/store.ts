import { resource, resources } from './common';

interface Counter {
  [key: string]: number;
}

interface SavedCounter {
  store: Counter;
}

class Store {
  protected store: Counter = {};

  constructor(init?: Counter | SavedCounter) {
    if (init == null) {
      return;
    }
    else if (init.store !== undefined) {
      for (const elt of Object.keys(init.store)) {
        this.store[ (<resource>elt) ] = (<SavedCounter>init).store[elt];
      }
    }
    else {
      for (const elt of Object.keys(init)) {
        this.store[ (<resource>elt) ] = (<Counter>init)[elt];
      }
    }
  }

  keys(): resource[] {
    return Object.keys(this.store) as resource[];
  }

  clear(): void {
    for (const item of this.keys()) {
      this.store[item] = 0;
    }
  }

  set(item: resource, amt: number) {
    if (isNaN(amt)) {
      throw new Error('not a number');
    }

    this.store[item] = Math.max(0, amt);
  }

  get(item: resource): number {
    return this.store[item] || 0;
  }

  count(item: resource): number {
    return Math.floor(this.store[item] || 0);
  }

  sum(): number {
    let n = 0;

    for (const item of this.keys()) {
      n += this.store[item];
    }

    return n;
  }

  dec(item: resource, amt: number = 0) {
    this.set(item, (this.store[item] || 0) - amt);
  }

  inc(item: resource, amt: number = 0) {
    this.set(item, (this.store[item] || 0) + amt);
  }
}

export = Store;
