class Person {
  constructor(opt) {
    this.opt      = opt || {};
    this.name     = this.opt.game;
    this.money    = this.opt.money    || 1000;
    this.strength = this.opt.strength || 1;
    this.xp       = this.opt.xp       || 0;
    this.health   = this.opt.health   || 10;
    this.ship     = this.opt.ship     || new Ship;
    this.faction  = this.opt.faction;
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
    return 0.1 + (this.strength * 0.115);
  }

  ship_acceleration() {
    return this.ship.acceleration;
  }

  credit(n) {
    this.money += n;
  }

  debit(n) {
    this.money -= n;
  }
}
