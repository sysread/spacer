function uniq(items, sep=' ') {
  if (!(items instanceof Array))
    items = `${items}`.split(sep).filter((s) => {return s != ''});
  let set = new Set(items);
  let arr = [];
  set.forEach((val) => {arr.push(val)});
  return arr.join(sep);
}

/*
 * Rounds `n` to `places` decimal places.
 */
function R(n, places) {
  if (places === undefined) {
    return Math.round(n);
  }

  const factor = Math.pow(10, places);
  return Math.round(n * factor) / factor;
}

/*
 * Returns a random integer no lower than min and lower than max.
 * 
 * Direct copy pasta from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

/*
 * Returns a random element from an array.
 */
function oneOf(options) {
  return options[getRandomInt(0, options.length)];
}

function resourceMap(dflt=0, entries) {
  if (entries === undefined) {
    entries = {};
  }

  return new Proxy(entries, {
    get: (obj, prop, recvr) => {
      if (!data.resources.hasOwnProperty(prop)) {
        return;
      }

      if (!obj.hasOwnProperty(prop)) {
        obj[prop] = dflt;
      }

      return obj[prop];
    },

    set: (obj, prop, val, recvr) => {
      if (!data.resources.hasOwnProperty(prop)) {
        return;
      }

      obj[prop] = val;
      return true;
    }
  });
}

class DefaultMap {
  constructor(dflt) {
    this.dflt = dflt;
    this.data = resourceMap(dflt);
  }

  load(obj) {
    this.dflt = obj.dflt;
    this.data = resourceMap(obj.dflt, obj.data);
  }

  save()        {return {dflt: this.dflt, data: this.data}}
  has(key)      {return key in this.data}
  get(key)      {return this.data[key]}
  set(key, val) {this.data[key] = val}
  clear()       {this.data = resourceMap(this.dflt)}
  each(f)       {for (let key of this.keys()) f(key, this.data[key])}
  keys()        {return Object.keys(this.data)}
  *values()     {for (let key of this.keys()) yield this.data[key]}
  *entries()    {for (let key of this.keys()) yield [key, this.data[key]]}
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
