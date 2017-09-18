class Person {
  constructor(opt) {
    opt = opt || {};
    this.name    = opt.name;
    this.home    = opt.home;
    this.faction = opt.faction;
    this.money   = opt.money || 1000;
    this.ship    = opt.ship  || new Ship({shipclass: 'shuttle'});
  }

  save() {
    return {
      name    : this.name,
      home    : this.home,
      faction : this.faction,
      money   : this.money,
      ship    : this.ship.save()
    };
  }

  load(obj) {
    this.name    = obj.name;
    this.home    = obj.home;
    this.faction = obj.faction;
    this.money   = obj.money;
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
    return data.bodies[this.home].gravity * 2;
  }

  ship_acceleration() {
    return this.ship.current_acceleration();
  }

  credit(n) {
    this.money += n;
  }

  debit(n) {
    this.money -= n;
  }
}
