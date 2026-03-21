/**
 * history - rolling-window averages for per-resource economic signals.
 *
 * Used by Planet to track supply, demand, and need over a configurable window
 * of data points. Each data point represents one rollup period (typically one
 * game day). The rolling window is capped at `length` entries; older entries
 * are evicted and subtracted from the running sum.
 *
 * Usage pattern (per turn):
 *   history.inc(item, amount)   - accumulate into the daily bucket
 *   history.rollup()            - called once per day; commits daily totals
 *                                 into the window and resets the daily bucket
 *
 * avg(item) returns sum / window_length, giving a moving average that smooths
 * out per-turn noise. Planet uses this for supply/demand signals that drive
 * pricing and import decisions.
 *
 * Serialized as { history, sum, daily } for restoration from localStorage.
 */

"use strict"

import { resources } from './common'

export default class History {
  constructor(length, init) {
    this.length  = length   // max window size (number of rollup periods to retain)
    this.history = {}       // per-resource arrays of historical values
    this.daily   = {}       // per-resource accumulator for the current period
    this.sum     = {}       // per-resource running sum of the window

    for (const item of resources) {
      this.history[item] = []
      this.daily[item]   = 0
      this.sum[item]     = 0
    }

    if (init) {
      if (init.history)
        for (const item of resources)
          this.history[item] = init.history[item] || []

      if (init.sum)
        for (const item of resources)
          this.sum[item] = init.sum[item] || 0

      if (init.daily)
        for (const item of resources)
          this.daily[item] = init.daily[item] || 0
    }
  }

  /** Returns the raw running sum for item. */
  get(item) {
    return this.sum[item]
  }

  /** Returns the integer-truncated running sum. */
  count(item) {
    return ~~this.sum[item];
  }

  keys() {
    return resources
  }

  /** Adds to the daily accumulator (not yet committed to the window). */
  inc(item, amt) {
    this.daily[item] += amt
  }

  /** Subtracts from the daily accumulator, clamped to non-negative. */
  dec(item, amt) {
    this.daily[item] -= amt > this.daily[item]
      ? this.daily[item]
      : amt
  }

  /** Returns the moving average: sum / window_length. Returns 0 if no data. */
  avg(item) {
    if (!this.history[item].length)
      return 0

    return this.sum[item] / this.history[item].length
  }

  /**
   * Pushes a value into the rolling window. Adds to sum, prepends to history.
   * If the window exceeds max length, the oldest value is evicted and
   * subtracted from sum. Sum is floored at 0 to prevent negative drift
   * from floating-point accumulation.
   */
  add(item, amt) {
    this.sum[item] += amt
    this.history[item].unshift(amt)

    while (this.history[item].length > this.length)
      this.sum[item] -= this.history[item].pop()

    if (this.sum[item] < 0)
      this.sum[item] = 0
  }

  /**
   * Commits each resource's daily accumulator into the rolling window
   * and resets the accumulator to 0. Called once per game day by Planet.
   */
  rollup() {
    for (const item of resources) {
      this.add(item, this.daily[item])
      this.daily[item] = 0
    }
  }
}
