/**
 * deferred - exposes a Promise's resolve/reject handles as public properties.
 *
 * The standard Promise constructor hides resolve/reject inside its executor.
 * Deferred makes them accessible externally so that code outside the
 * constructor can settle the promise - useful when completion is triggered by
 * an event or callback in a different scope.
 *
 * Usage:
 *   const d = new Deferred<string>();
 *   someEventEmitter.once('done', (result) => d.resolve(result));
 *   return d.promise; // caller awaits completion elsewhere
 */

class Deferred<T> {
  promise: Promise<T>;
  resolve: Function = () => {};
  reject:  Function = () => {};

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject  = reject;
    });
  }
}

export = Deferred;
