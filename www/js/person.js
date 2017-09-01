class Person {
  constructor(opt) {
    this.name     = opt.name;
    this.money    = opt.money    || 1000;
    this.strength = opt.strength || 1;
    this.xp       = opt.xp       || 0;
    this.health   = opt.health   || 10;
    this.ship     = opt.ship;
  }

  can_craft(item) {
    let recipe = data.resources[item].recipe.materials;

    for (let mat of Object.keys(recipe))
      if (recipe[mat] > this.ship.cargo.get(mat))
        return false;

    return true;
  }

  max_acceleration() {
    return 0.1 + (Math.log(this.strength) * 0.3);
  }

  ship_acceleration() {
    return this.ship.acceleration();
  }
}
