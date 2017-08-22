class DefaultMap extends Map {
  constructor(builder, iterable) {
    super(iterable);
    this.builder = builder;
  }

  get(key) {
    if (!this.has(key)) {
      this.set(key, this.builder());
    }

    return super.get(key);
  }

  each(f) {
    this.forEach((val, key, map) => {
      f(key, val);
    });
  }
}

class ResourceCounter extends DefaultMap {
  constructor(iterable) {
    super(() => {return 0}, iterable);
  }

  inc(key, amount) {
    this.set(key, this.get(key) + amount);
  }

  dec(key, amount) {
    this.set(key, this.get(key) - amount);
  }
}

class ResourceTracker {
  constructor(max) {
    this.max = max;
    this.history = {};
    this.summed = new ResourceCounter;
    Object.keys(data.resources).forEach((k) => {this.history[k] = []});
  }

  add(resource, amount) {
    this.history[resource].unshift(amount);
    this.summed.inc(resource, amount);
    while (this.history[resource].length > this.max) {
      this.summed.dec(resource, this.history[resource].pop());
    }
  }

  sum(resource) {
    return this.summed.get(resource);
  }

  avg(resource) {
    let sum = this.sum(resource);
    return (sum > 0)
      ? Math.ceil(this.sum(resource) / this.history[resource].length)
      : 0;
  }
}
