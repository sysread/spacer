"use strict"

import { resources } from './common'

export default class Store {
  constructor(init) {
    this.store = {}
    this.clear();

    if (init && init.store)
      for (const item of resources)
        this.store[item] = init.store[item] || 0
  }

  clear() {
    for (const item of resources)
      this.store[item] = 0
  }

  set(item, amt) {
    if (isNaN(amt))
      throw new Error(`not a number: ${amt}`)

    this.store[item] = amt > 0 ? amt : 0
  }

  sum() {
    let n = 0

    for (const item of resources)
      n += this.store[item]

    return n
  }

  keys() { return resources }

  get(item) { return this.store[item] || 0 }

  count(item) { return ~~(this.store[item] || 0) }

  dec(item, amt) { return this.set(item, (this.store[item] || 0) - amt) }

  inc(item, amt) { return this.set(item, (this.store[item] || 0) + amt) }
}
