class DefaultMap {
  constructor(dfltval) {
    this.dfltval = dfltval;
    this.data = {};
  }

  load(obj) {
    this.dfltval = obj.dfltval;
    this.data = obj.data;
  }

  save()        {return {dfltval: this.dfltval, data: this.data}}
  has(key)      {return this.data.hasOwnProperty(key)}
  get(key)      {return this.has(key) ? this.data[key] : this.dfltval}
  set(key, val) {this.data[key] = val}
  delete(key)   {delete this.data[key]}
  clear()       {this.data = {}}
  each(f)       {for (let key of Object.keys(this.data)) f(key, this.get(key))}
  *keys()       {for (let key of Object.keys(this.data)) yield key}
  *values()     {for (let key of this.keys()) yield this.get(key)}
  *entries()    {for (let key of this.keys()) yield [key, this.get(key)]}
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

  inc(key, amount=1) {
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
    for (let amount of this.values()) n += amount;
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
