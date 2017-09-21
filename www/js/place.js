class Place extends Market {
  constructor(name) {
    super();
    this.name       = name;
    this.conditions = [];
    this.agents     = [];
    this.resources  = new ResourceCounter(0);
    this.using      = new ResourceCounter(0)
    this.fabricator = data.fabricators;
    this.deliveries = [];
  }

  get type()      {return system.type(this.name)}
  get size()      {return data.bodies[this.name].size}
  get scale()     {return data.scales[this.size]}
  get traits()    {return data.bodies[this.name].traits}
  get faction()   {return data.bodies[this.name].faction}
  get sales_tax() {return data.factions[this.faction].sales_tax}
  get max_fabs()  {return Math.ceil(data.fabricators * this.scale)}

  save() {
    let me        = super.save();
    me.name       = this.name;
    me.conditions = this.conditions;
    me.resources  = this.resources.save();
    me.using      = this.using.save();
    me.fabricator = this.fabricator;
    me.deliveries = this.deliveries;
    me.agents     = [];

    this.agents.forEach((agent) => {me.agents.push(agent.save())});

    return me;
  }

  load(obj) {
    super.load(obj);
    this.name = obj.name;
    this.conditions = obj.conditions;
    this.fabricator = obj.fabricator;
    this.deliveries = obj.deliveries;
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

  /*
   * Returns the percentage of total fabrication resources currently available
   * for commercial use.
   */
  fabrication_availability() {
    return Math.min(100, Math.round(this.fabricator / this.max_fabs * 1000) / 10);
  }

  /*
   * Given a resource name, returns the adjusted number of turns based on the
   * fabrication resources available.
   */
  fabrication_time(item) {
    let recipe = data.resources[item].recipe;
    if (!recipe) return;
    let turns = recipe.tics;
    if (turns <= this.fabricator)
      return Math.ceil(turns / 2);
    else
      return Math.max(1, Math.ceil((turns - this.fabricator) / 2));
  }

  /*
   * "Wears out" the fabricator while crafting for the specified number of
   * turns.
   */
  fabricate(item) {
    let recipe = data.resources[item].recipe;
    if (!recipe) return;
    let turns = recipe.tics;
    let adjusted = this.fabrication_time(item);
    this.fabricator = Math.max(0, this.fabricator - turns);
    return adjusted;
  }

  craft_time(item) {
    return this.fabrication_time(item);
  }

  turn() {
    super.turn();

    // Start agents if needed
    if (this.agents.length < data.market.agents * this.scale) {
      let money = data.market.agent_money * this.scale;
      this.agents.push(new Crafter({place: this.name, money: money}));
    }

    // Produce
    this.production.each((resource, amt) => {
      this.resources.set(resource, amt);
      if (game.turns % data.resources[resource].mine.tics !== 0) return;
      if (this.is_over_supplied(resource)) return;
      this.sell(resource, amt);
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

    // Restore fabricators
    if (this.fabricator < (this.max_fabs * 0.7)) {
      let each  = data.fab_health;
      let want  = Math.floor((this.max_fabs - this.fabricator) / each);
      let avail = Math.min(want, this.current_supply('cybernetics'));

      if (avail > 0) {
        this.buy('cybernetics', avail);
        this.fabricator += avail * each;
      }

      if (avail < want)
        this.inc_demand('cybernetics', want - avail);
    }

    /*
     * Process deliveries
     */
    if (this.deliveries.length < 2) {
      // Sort by distance
      let bodies = Object.keys(data.bodies).sort((a, b) => {
        let a_faction = data.bodies[a].faction === this.faction;
        let b_faction = data.bodies[b].faction === this.faction;

        if ((a_faction && b_faction) || (!a_faction && !b_faction)) {
          return system.distance(this.name, a) < system.distance(this.name, b);
        }
        else if (a_faction) {
          return -1;
        }
        else {
          return 1;
        }
      });

      // Order supplies
      ITEM:for (let item of Object.keys(data.resources)) {
        // We need it
        if (!this.is_under_supplied(item)) continue ITEM;

        // Filter out bodies which are poorly supplied in what we need
        let possibilities = bodies.filter((b) => {
          return game.place(b).current_supply(item) > 0
              && game.place(b).is_over_supplied(item);
        });

        BODY:for (let body of possibilities) {
          let place = game.place(body);

          if (!place.is_over_supplied(item)) continue BODY;

          let amt = Math.floor(place.current_supply(item) / 2);
          if (amt === 0) continue BODY;

          let dist  = Physics.AU(system.distance(this.name, body));
          let turns = Math.ceil((24 / data.hours_per_turn) * 5 * dist);
          place.store.dec(item, amt);

          let want = Math.ceil(dist / 4);
          let get  = Math.min(want, place.current_supply('fuel'));
          place.store.dec('fuel', get);
          if (want < get) place.store.inc_demand(want - get);

          let delivery = {
            origin : body,
            item   : item,
            amt    : amt,
            turns  : turns,
            dist   : dist
          };

          this.deliveries.push(delivery);
        }
      }
    }

    for (let d of this.deliveries) {
      if (--d.turns === 0) {
        this.store.inc(d.item, d.turns);
      }
    }

    this.deliveries = this.deliveries.filter((d)=>{return d.turns > 0});
  }
}
