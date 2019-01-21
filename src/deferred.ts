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
