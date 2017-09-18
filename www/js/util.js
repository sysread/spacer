class DefaultMap {
  constructor(default_value) {
    this.default_value = default_value;
    this.map = new Map;
  }

  save() {
    let map = {};
    this.each((k, v) => {map[k] = v});
    return {
      default_value: this.default_value,
      map: map
    };
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

  clear() {
    this.map.clear();
  }

  each(f) {
    this.map.forEach((val, key, map) => {f(key, val)});
  }
}

class ResourceCounter extends DefaultMap {
  constructor(min) {
    super(0);
    this.min = min;
  }

  save() {
    let me = super.save();
    me.min = this.min;
    return me;
  }

  load(obj) {
    super.load(obj);
    this.min = obj.min;
  }

  inc(key, amount) {
    let n = this.get(key) + amount;
    this.set(key, n);

    if (this.min !== undefined && n < this.min) {
      this.set(key, this.min);
    }
  }

  dec(key, amount) {
    this.inc(key, -amount);
  }

  sum() {
    let n = 0;
    for (let amount of this.map.values()) n += amount;
    return n;
  }
}

class ResourceTracker {
  constructor(len) {
    this.len = len;
    this.history = {};
    this.summed = new ResourceCounter;
    Object.keys(data.resources).forEach((k) => {this.history[k] = []});
  }

  save() {
    let me = {};
    me.len = this.len;
    me.history = this.history;
    me.summed = this.summed.save();
    return me;
  }

  load(obj) {
    this.len = obj.len;
    this.history = obj.history;
    this.summed.load(obj.summed);
  }

  length(resource) {
    return this.history[resource].length;
  }

  add(resource, amount) {
    this.history[resource].unshift(amount);
    this.summed.inc(resource, amount);
    while (this.history[resource].length > this.len) {
      this.summed.dec(resource, this.history[resource].pop());
    }
  }

  sum(resource, length) {
    if (length === undefined) {
      return this.summed.get(resource);
    }
    else {
      let n = 0;

      for (let i = 0; i < length && i < this.history[resource].length; ++i)
        n += this.history[resource][i];

      return n;
    }
  }

  avg(resource, length) {
    let sum, count;

    if (length === undefined) {
      sum   = this.sum(resource);
      count = this.length(resource);
    }
    else {
      sum   = this.sum(resource, length);
      count = Math.min(length, this.length(resource));
    }

    return (sum > 0) ? Math.ceil(sum / count) : 0;
  }
}
