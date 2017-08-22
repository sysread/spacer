class Person {
  constructor(opt) {
    this.name        = opt.name;
    this.money       = opt.money       || 500;
    this.inventory   = opt.inventory   || new ResourceCounter;
    this.exploration = opt.exploration || 1;
    this.negotiation = opt.negotiation || 1;
    this.piloting    = opt.piloting    || 1;
    this.stealth     = opt.stealth     || 1;
    this.tactics     = opt.tactics     || 1;
    this.health      = opt.health      || 10;
  }
}
