import * as t from "./common";


declare var window: {
  dispatchEvent(ev: Event): void;
  addEventListener: (ev: string, cb: any, opt?: any) => void;
  removeEventListener: (ev: string, cb: any) => void;
}


export type SpacerEvent =
    GameLoaded
  | GameTurn
  | NewDay
  | Arrived
  | ItemsBought
  | ItemsSold
  | CaughtSmuggling;


export function trigger(ev: SpacerEvent) {
  window.dispatchEvent(ev);
}


type EventWatcher = (ev: CustomEvent) => {complete: boolean};

export function watch(event: string, cb: EventWatcher) {
  const opt = {passive: true, once: true};

  window.addEventListener(event, (ev: SpacerEvent) => {
    const rs = cb(ev);

    if (!rs.complete) {
      watch(event, cb);
    }
  }, opt);
}


class EventBase<T> extends CustomEvent<T> {
  constructor(name: string, detail: T) {
    super(name, {detail: detail});
  }
}


export class GameLoaded extends EventBase<null> {
  constructor() { super("gameLoaded", null) }
}


interface GameTurnInit {
  turn:     number;
  isNewDay: boolean;
}

export class GameTurn extends EventBase<GameTurnInit> {
  constructor(detail: GameTurnInit) { super("turn", detail) }
}


interface NewDayInit extends GameTurnInit {
}

export class NewDay extends EventBase<NewDayInit> {
  constructor(detail: NewDayInit) { super("day", detail) }
}


interface ArrivedInit {
  dest: t.body;
}

export class Arrived extends EventBase<ArrivedInit> {
  constructor(detail: ArrivedInit) { super("arrived", detail) }
}

interface ItemsBoughtInit {
  body:  t.body;
  item:  t.resource;
  count: number;
  price: number;
}

export class ItemsBought extends EventBase<ItemsBoughtInit> {
  constructor(detail: ItemsBoughtInit) { super("itemsBought", detail) }
}


interface ItemsSoldInit {
  count:    number;
  body:     t.body;
  item:     t.resource;
  price:    number;
  standing: number;
}

export class ItemsSold extends EventBase<ItemsSoldInit> {
  constructor(detail: ItemsSoldInit) { super("itemsSold", detail) }
}


interface CaughtSmugglingInit {
  faction: t.faction; // destination faction
  found:   t.ResourceCounter;
}

export class CaughtSmuggling extends EventBase<CaughtSmugglingInit> {
  constructor(detail: CaughtSmugglingInit) { super("caughtSmuggling", detail) }
}
