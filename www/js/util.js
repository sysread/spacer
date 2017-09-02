class DefaultMap {
  constructor(default_value) {
    this.default_value = default_value;
    this.map = new Map;
  }

  save() {
    let map = {};
    this.each((k, v) => {map[k] = v});
    return {default_value: this.default_value, map: map};
  }

  load(obj) {
    this.default_value = obj.default_value;
    this.map.clear();
    Object.keys(obj.map).forEach((k) => {this.set(k, obj.map[k])});
  }

  get(key) {
    if (!this.map.has(key)) this.map.set(key, this.default_value);
    return this.map.get(key);
  }

  set(key, val) {
    return this.map.set(key, val);
  }

  has(key) {
    return this.map.has(key);
  }

  delete(key) {
    return this.map.delete(key);
  }

  each(f) {
    this.map.forEach((val, key, map) => {f(key, val)});
  }
}

class ResourceCounter extends DefaultMap {
  constructor() {
    super(0);
  }

  save() { return super.save() }

  inc(key, amount) {
    this.set(key, this.get(key) + amount);
  }

  dec(key, amount) {
    this.set(key, this.get(key) - amount);
  }

  sum() {
    let n = 0;
    this.each((item, amount) => { n += amount });
    return n;
  }
}

class ResourceTracker {
  constructor(max) {
    this.max = max;
    this.history = {};
    this.summed = new ResourceCounter;
    Object.keys(data.resources).forEach((k) => {this.history[k] = []});
  }

  save() {
    let me = {};
    me.max = this.max;
    me.history = this.history;
    me.summed = this.summed.save();
    return me;
  }

  load(obj) {
    this.max = obj.max;
    this.history = obj.history;
    this.summed.load(obj.summed);
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
