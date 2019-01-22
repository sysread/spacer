import * as t from './common';

export enum Ev {
  Turn        = 'Turn',
  Arrived     = 'Arrived',
  ItemsBought = 'ItemsBought',
  ItemsSold   = 'ItemsSold',
};


export interface Turn {
  type: Ev.Turn;
  turn: number;
}

export interface Arrived {
  type: Ev.Arrived;
  dest: t.body;
}

export interface ItemsBought {
  type:  Ev.ItemsBought;
  item:  t.resource;
  count: number;
  price: number;
}

export interface ItemsSold {
  type:     Ev.ItemsSold;
  item:     t.resource;
  count:    number;
  price:    number;
  standing: number;
}

export type Event =
  | Turn
  | Arrived
  | ItemsBought
  | ItemsSold;


export class Events {
  static watcher: {[key: string]: Function[]} = {};

  static watch(ev: Ev, cb: Function) {
    if (!Events.watcher[ev]) {
      Events.watcher[ev] = [];
    }

    Events.watcher[ev].push(cb);
  }

  static signal(event: Event) {
    if (Events.watcher[event.type]) {
      const retain: Function[] = [];

      for (const fn of Events.watcher[event.type]) {
        if (!fn(event)) {
          retain.push(fn);
        }
      }

      Events.watcher[event.type] = retain;
    }
  }
}
