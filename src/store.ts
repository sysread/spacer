import { resource, resources, ResourceCounter } from './common';

interface SavedCounter {
  store: ResourceCounter;
}

class Store {
  store: ResourceCounter = {};

  constructor(init?: ResourceCounter | SavedCounter) {
    if (init != null) {
      if ((<SavedCounter>init).store !== undefined) {
        for (const elt of Object.keys((<SavedCounter>init).store)) {
          this.store[ (<resource>elt) ] = (<SavedCounter>init).store[elt as resource];
        }
      }
      else {
        for (const elt of Object.keys(init)) {
          this.store[ (<resource>elt) ] = (<ResourceCounter>init)[elt as resource];
        }
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
    if (isNaN(amt)) throw new Error('not a number');
    this.store[item] = amt < 0 ? 0 : amt;
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
      n += this.store[item] || 0;
    }

    return n;
  }

  dec(item: resource, amt: number = 0) {
    if (isNaN(amt)) throw new Error('not a number');
    this.store[item] = this.get(item) - amt;
  }

  inc(item: resource, amt: number = 0) {
    if (isNaN(amt)) throw new Error('not a number');
    this.store[item] = this.get(item) + amt;
  }
}

export = Store;
