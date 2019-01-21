import * as t from './common';

type Event = 'Turn' | 'Arrived' | 'BoughtItems' | 'SoldItems';

export class Events {
  static watcher: {[key: string]: Function[]} = {};

  static watch(event: Event, cb: Function) {
    if (!Events.watcher[event]) {
      Events.watcher[event] = [];
    }

    Events.watcher[event].push(cb);
  }

  static signal(event: Event, param: any) {
    //console.log('event', event, param);

    if (Events.watcher[event]) {
      const retain: Function[] = [];

      for (const fn of Events.watcher[event]) {
        if (!fn(event, param)) {
          retain.push(fn);
        }
      }

      Events.watcher[event] = retain;
    }
  }

  static Turn(turn: number) {
    Events.signal('Turn', turn);
  }

  static Arrived(dest: t.body) {
    Events.signal('Arrived', dest);
  }

  static BoughtItems(payload: {item: t.resource, bought: number, price: number}) {
    Events.signal('BoughtItems', payload);
  }

  static SoldItems(payload: {item: t.resource, amount: number, price: number, standing: number}) {
    Events.signal('SoldItems', payload);
  }
}


class Passengers {
  accepted:  boolean = false;
  deadline:  number;
  dest:      t.body;

  constructor(opt: any) {
    this.deadline = opt.deadline;
    this.dest     = opt.destination;
  }

  accept() {
    this.accepted = true;

    Events.watch('Turn', (turn: number) => {
      if (turn < this.deadline /* && this.completed */) {
      }
      else {
      }
    });

    Events.watch('Arrived', (dest: t.body) => {
      if (dest == this.dest) {

      }
    });
  }
}
