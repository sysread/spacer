import * as t from './common';

export type TurnDetail   = {detail: {turn: number, isNewDay: boolean}};
export type TurnCallBack = (ev: TurnDetail) => void;

export enum Ev {
  Turn            = 'Turn',
  Arrived         = 'Arrived',
  ItemsBought     = 'ItemsBought',
  ItemsSold       = 'ItemsSold',
  CaughtSmuggling = 'CaughtSmuggling',
};


/*
 * Global events
 */
export interface Turn {
  type: Ev.Turn;
  turn: number;
}

/*
 * Player-specific events
 */
export interface Arrived {
  type: Ev.Arrived;
  dest: t.body;
}

export interface ItemsBought {
  type:  Ev.ItemsBought;
  body:  t.body;
  item:  t.resource;
  count: number;
  price: number;
}

export interface ItemsSold {
  type:     Ev.ItemsSold;
  body:     t.body;
  item:     t.resource;
  count:    number;
  price:    number;
  standing: number;
}

export interface CaughtSmuggling {
  type: Ev.CaughtSmuggling;
  by:   t.body;
}

export type Event =
  | Turn
  | Arrived
  | ItemsBought
  | ItemsSold
  | CaughtSmuggling
;


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
