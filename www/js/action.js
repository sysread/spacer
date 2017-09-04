class Action {
  constructor(tics, profit, prep, reward) {
    this.tics    = tics;
    this.profit  = profit;
    this.prep    = prep;
    this.reward  = reward;
    this.left    = tics;
    this.prepped = false;
    this.state   = new Map;

    if (!this.profit)
      this.value = 0;
    else
      this.value = Math.ceil(this.profit / this.tics);
  }

  perform() {
    if (!this.prepped) {
      if (this.prep)
        this.prep();
      this.prepped = true;
    }

    if (--this.left === 0) {
      this.reward();
      return true;
    }

    return false;
  }
}

class ActionChooser {
  constructor() {
    this.action = null;
  }

  add(action) {
    if (!action)
      return false;

    if (this.action && action.value <= this.action.value)
      return false;

    this.action = action;
    return true;
  }
}
