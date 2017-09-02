class Place extends Market {
  constructor(name) {
    super();
    this.name       = name;
    this.conditions = [];
    this.agents     = [];
    this.resources  = new ResourceCounter;
    this.mine_total = new ResourceCounter;
  }

  get type()       {return system.type(this.name)}
  get scale()      {return data.scales[this.size]}
  get size()       {return data.bodies[this.name].size}
  get traits()     {return data.bodies[this.name].traits}
  get minability() {return data.market.minability * this.scale}

  save() {
    let me        = super.save();
    me.name       = this.name;
    me.conditions = this.conditions;
    me.resources  = this.resources.save();
    me.mine_total = this.mine_total.save();
    me.agents     = [];

    for (let agent of this.agents)
      me.agents.push(agent.save());

    return me;
  }

  load(obj) {
    super.load(obj);
    this.name = obj.name;
    this.conditions = obj.conditions;
    this.resources.load(obj.resources);
    this.mine_total.load(obj.mine_total);

    for (let agent_data of obj.agents) {
      let agent = this.agents.shift() || new Agent(this.place);
      agent.load(agent_data);
      this.agents.push(agent);
    }
  }

  demand(resource) {
    let actual = super.demand(resource);
    let base = data.market.consumes[resource] || 0;
    return actual + (base * this.scale);
  }

  merge_scale(resources, traits, conditions) {
    let amounts = new DefaultMap(0);

    Object.keys(resources).forEach((resource) => {
      amounts.set(resource, Math.floor(this.scale * resources[resource]));
    });

    if (traits) {
      traits.forEach((trait) => {
        Object.keys(traits).forEach((resource) => {
          amounts.set(resource, amounts.get(resource) * traits[trait][resource]);
        });
      });
    }

    if (conditions) {
      conditions.forEach((cond) => {
        Object.keys(conditions).forEach((resource) => {
          amounts.set(resource, amounts.get(resource) * conditions[cond][resource]);
        });
      });
    }

    return amounts;
  }

  production() {
    return this.merge_scale(data.market.produces, this.traits.produces, this.conditions.produces);
  }

  consumption() {
    return this.merge_scale(data.market.consumes, this.traits.consumes, this.conditions.consumes);
  }

  mine(resource) {
    let count = this.resources.get(resource);

    if (count > 0) {
      if (Math.random() <= this.minability) {
        this.resources.dec(resource, 1);
        this.mine_total.inc(resource, 1);
        return true;
      }
    }

    return false;
  }

  harvest(turns=1) {
    let collected = new ResourceCounter;

    for (let i = 1; i <= turns; ++i) {
      this.resources.each((item, amt) => {
        let tics = data.resources[item].mine.tics;
        if ((i >= tics) && (i % tics === 0) && this.mine(item))
          collected.inc(item, 1);
      });
    }

    return collected;
  }

  turn() {
    super.turn();

    // Start agents if needed
    if (this.agents.length === 0) {
      let money = data.market.agent_money * this.scale;
      for (var i = 0; i < this.scale * data.market.agents; ++i) {
        this.agents.push(new Agent(this.name, money));
      }
    }

    // Produce
    this.production().each((resource, amt) => {
      this.resources.set(resource, amt);
    });

    // Consume
    this.consumption().each((resource, amt) => {
      let avail = Math.min(amt, this.supply(resource));
      if (avail) this.buy(resource, avail);
    });

    // Agents
    this.agents.push(this.agents.shift()); // Shuffle agent order
    this.agents.forEach((agent) => {agent.turn()});

    this.resources.each((resource, amt) => {
      if (this.supply(resource) == 0 && amt > 0)
        this.store.inc(resource, Math.ceil(amt/2));
    });
  }
}
