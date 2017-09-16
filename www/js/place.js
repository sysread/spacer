class Place extends Market {
  constructor(name) {
    super();
    this.name       = name;
    this.conditions = [];
    this.agents     = [];
    this.resources  = new ResourceCounter(0);
    this.using      = new ResourceCounter(0)
  }

  get type()      {return system.type(this.name)}
  get size()      {return data.bodies[this.name].size}
  get scale()     {return data.scales[this.size]}
  get traits()    {return data.bodies[this.name].traits}
  get faction()   {return data.bodies[this.name].faction}
  get sales_tax() {return data.factions[this.faction].sales_tax}

  save() {
    let me        = super.save();
    me.name       = this.name;
    me.conditions = this.conditions;
    me.resources  = this.resources.save();
    me.using      = this.using.save();
    me.agents     = [];

    this.agents.forEach((agent) => {me.agents.push(agent.save())});

    return me;
  }

  load(obj) {
    super.load(obj);
    this.name = obj.name;
    this.conditions = obj.conditions;
    this.resources.load(obj.resources);
    this.using.load(obj.using);
    this.agents = [];

    obj.agents.forEach((info) => {
      //let agent = new Agent(this.place);
      let agent = new Crafter
      agent.load(info);
      this.agents.push(agent);
    });
  }

  buy_price(resource) {
    let price = this.price(resource);
    return price + Math.ceil(price * this.sales_tax);
  }

  demand(resource) {
    let actual = super.demand(resource);
    let base = data.market.consumes[resource] || 0;
    return actual + (base * this.scale);
  }

  merge_scale(resources, traits, conditions) {
    let amounts = new ResourceCounter(0);

    for (let resource of Object.keys(resources))
      amounts.inc(resource, resources[resource]);

    if (traits)
      for (let trait of traits)
        for (let resource of Object.keys(trait))
          amounts.inc(resource, trait[resource]);

    if (conditions)
      for (let cond of conditions)
        for (let resource of Object.keys(cond))
          amounts.inc(resource, cond[resource]);

    amounts.each((resource, amount) => {
      let scaled = amount * this.scale;
      amounts.set(resource, Math.max(0, scaled));
    });

    return amounts;
  }

  get production() {
    let traits = this.traits.map((t)     => {return data.traits[t].produces});
    let conds  = this.conditions.map((c) => {return data.conditions[c].produces});
    return this.merge_scale(data.market.produces, traits, conds);
  }

  get consumption() {
    let traits = this.traits.map((t)     => {return data.traits[t].consumes});
    let conds  = this.conditions.map((c) => {return data.conditions[c].consumes});
    return this.merge_scale(data.market.consumes, traits, conds);
  }

  mine(resource) {
    let count = this.resources.get(resource);

    if (count > 0) {
      if (Math.random() <= data.market.minability) {
        this.resources.dec(resource, 1);
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
    if (this.agents.length < data.market.agents * this.scale) {
      let money = data.market.agent_money * this.scale;
      //this.agents.push(new Agent(this.name, money));
      this.agents.push(new Crafter({place: this.name, money: money}));
    }

    // Produce
    this.production.each((resource, amt) => {
      this.resources.set(resource, amt);
      if (game.turns % data.resources[resource].mine.tics === 0) {
        this.sell(resource, amt);
      }
    });

    // Agents
    this.agents.push(this.agents.shift()); // Shuffle order
    this.agents.forEach((agent) => {
      let money = data.market.agent_money * this.scale;
      if (agent.money <= (money / 4)) agent.money = money;
      agent.turn()
    });

    // Consume
    this.consumption.each((item, amt) => {
      if (this.using.get(item) < amt) {
        let want  = Math.ceil(amt);
        let avail = Math.min(want, this.current_supply(item));

        if (avail) {
          this.buy(item, avail);
          this.using.inc(item, avail);
        }

        if (avail < want)
          this.inc_demand(item, want - avail);

        this.using.dec(item, amt);
      }
    });
  }
}
