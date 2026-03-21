/**
 * store - per-resource numeric inventory.
 *
 * A simple key-value store keyed by resource name, used for ship cargo,
 * planet stock, and pending import counts. Initializes all resource keys
 * to 0 and clamps values to non-negative on set.
 *
 * get() returns the raw float value; count() truncates to integer (via ~~)
 * for display and comparison where fractional units aren't meaningful.
 *
 * Serialized as { store: { [resource]: number } } - the constructor accepts
 * this shape for restoration from localStorage.
 */

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

  /** Resets all resource counts to 0. */
  clear() {
    for (const item of resources)
      this.store[item] = 0
  }

  /** Sets the count for item, clamped to non-negative. Throws on NaN. */
  set(item, amt) {
    if (isNaN(amt))
      throw new Error(`not a number: ${amt}`)

    this.store[item] = amt > 0 ? amt : 0
  }

  /** Returns the total count across all resources. */
  sum() {
    let n = 0

    for (const item of resources)
      n += this.store[item]

    return n
  }

  /** Returns the resource key array (all resource names). */
  keys() { return resources }

  /** Returns the raw float count for item (0 if absent). */
  get(item) { return this.store[item] || 0 }

  /** Returns the integer-truncated count for item (0 if absent). */
  count(item) { return ~~(this.store[item] || 0) }

  dec(item, amt) { return this.set(item, (this.store[item] || 0) - amt) }

  inc(item, amt) { return this.set(item, (this.store[item] || 0) + amt) }
}
