/**
 * events - typed game event system built on the browser CustomEvent API.
 *
 * Events are dispatched on window and consumed by any subsystem that calls
 * watch(). This decouples producers (game, planet, transit) from consumers
 * (agents, missions, factions, ships) without requiring direct references.
 *
 * All event payloads are typed via the EventBase generic. Consumers receive
 * the full typed event object from which they read ev.detail.
 *
 * watch() is self-re-registering: a watcher stays active until its callback
 * returns { complete: true }. This lets long-lived listeners (e.g. an agent
 * waiting for a GameTurn) re-arm themselves after each firing without managing
 * their own listener lifecycle.
 */

import data from './data';
import * as t from "./common";


declare var window: {
  dispatchEvent(ev: Event): void;
  addEventListener: (ev: string, cb: any, opt?: any) => void;
  removeEventListener: (ev: string, cb: any) => void;
}


export type SpacerEvent =
    GameLoaded
  | GameTurn
  | Arrived
  | ItemsBought
  | ItemsSold
  | CaughtSmuggling;


/** Dispatches a typed game event on window. */
export function trigger(ev: SpacerEvent) {
  window.dispatchEvent(ev);
}


// A watcher callback returns {complete: true} to unsubscribe, or
// {complete: false} to remain registered for the next occurrence.
type EventWatcher = (ev: CustomEvent) => {complete: boolean};

/**
 * Registers a one-shot listener for the given event that re-registers itself
 * unless the callback signals completion. Uses {passive: true} since game
 * event handlers never call preventDefault().
 */
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


/** Fired once after the game state is loaded from storage and initialized. */
export class GameLoaded extends EventBase<null> {
  constructor() { super("gameLoaded", null) }
}


interface GameTurnInit {
  turn: number;
  isNewDay?: boolean;
}

/**
 * Fired each time the game clock advances by one turn (one game hour).
 * isNewDay is set automatically when turn is a multiple of turns_per_day.
 * Agents, planets, and the conflict system all use this to drive periodic logic.
 */
export class GameTurn extends EventBase<GameTurnInit> {
  constructor(detail: GameTurnInit) {
    super("turn", detail);
    this.detail.isNewDay = this.detail.turn % data.turns_per_day == 0;
  }
}


interface ArrivedInit {
  dest: t.body;
}

/** Fired when the player completes a transit and arrives at a destination. */
export class Arrived extends EventBase<ArrivedInit> {
  constructor(detail: ArrivedInit) { super("arrived", detail) }
}


interface ItemsBoughtInit {
  body:  t.body;
  item:  t.resource;
  count: number;
  price: number;
}

/** Fired when the player purchases goods at a planet. */
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

/** Fired when the player sells goods at a planet. */
export class ItemsSold extends EventBase<ItemsSoldInit> {
  constructor(detail: ItemsSoldInit) { super("itemsSold", detail) }
}


interface CaughtSmugglingInit {
  faction: t.faction;       // the destination faction conducting the inspection
  found:   t.ResourceCounter; // contraband found, keyed by resource type
}

/** Fired when the player is caught carrying contraband upon arrival. */
export class CaughtSmuggling extends EventBase<CaughtSmugglingInit> {
  constructor(detail: CaughtSmugglingInit) { super("caughtSmuggling", detail) }
}
