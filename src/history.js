"use strict"

import { resources } from './common'
import Store from './store'

export default class History {
  constructor(length, init) {
    this.length  = length
    this.history = {}

    for (const item of resources)
      this.history[item] = []

    if (!init) {
      this.sum   = new Store
      this.daily = new Store
    }
    else {
      this.sum   = new Store(init.sum)
      this.daily = new Store(init.daily)

      if (init.history)
        for (const item of resources)
          this.history[item] = init.history[item] || []
    }

    // poor man's delegation to avoid the overhead of an extra funcall
    this.get   = this.sum.get
    this.count = this.sum.count

    this._avg = {}
  }

  keys() {
    return resources
  }

  inc(item, amt) {
    this.daily.inc(item, amt)
    delete this._avg[item]
  }

  dec(item, amt) {
    this.daily.dec(item, amt)
    delete this._avg[item]
  }

  avg(item) {
    if (!this.history[item].length)
      return 0;

    if (this._avg[item] === undefined)
      this._avg[item] = this.sum.get(item) / this.history[item].length

    return this._avg[item]
  }

  add(item, amt) {
    this.history[item].unshift(amt)
    this.sum.inc(item, amt)

    while (this.history[item].length > this.length) {
      this.sum.dec(item, this.history[item].pop())
    }
  }

  rollup() {
    for (const item of resources)
      this.add(item, this.daily.get(item))

    this.daily.clear()
  }
}
