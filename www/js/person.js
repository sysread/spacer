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

  can_craft(item) {
    let recipe = data.resources[item].recipe.materials;

    for (let mat of Object.keys(recipe))
      if (recipe[mat] > this.inventory.get(mat))
        return false;

    return true;
  }
}
