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

  canCraft(item) {
    let recipe = data.resources[item].recipe.materials;
    let counts = [];

    for (let mat of Object.keys(recipe)) {
      counts.push(Math.floor(this.ship.cargo.get(mat) / recipe[mat]));
    }

    return counts.reduce((a,b) => {return Math.min(a, b)});
  }

  maxAcceleration() {
    return Physics.G() * data.bodies[this.home].gravity * data.grav_deltav_factor;
  }

  shipAcceleration() {
    return this.ship.currentAcceleration();
  }

  credit(n) {
    this.money += n;
  }

  debit(n) {
    this.money -= n;
  }
}
