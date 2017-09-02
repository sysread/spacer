class Person {
  constructor(opt) {
    this.name     = opt.name;
    this.money    = opt.money    || 1000;
    this.strength = opt.strength || 1;
    this.xp       = opt.xp       || 0;
    this.health   = opt.health   || 10;
    this.ship     = opt.ship;
  }

  save() {
    return {
      name     : this.name,
      money    : this.money,
      strength : this.strength,
      xp       : this.xp,
      health   : this.health,
      ship     : this.ship.save()
    };
  }

  load(obj) {
    this.name     = obj.name;
    this.money    = obj.money;
    this.strength = obj.strength;
    this.xp       = obj.xp;
    this.health   = obj.health;
    this.ship.load(obj.ship);
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
