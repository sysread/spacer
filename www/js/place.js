define(function(require, exports, module) {
  const data    = require('data');
  const util    = require('util');
  const system  = require('system');
  const Game    = require('game');
  const Market  = require('market');
  const Crafter = require('agent/crafter');
  const Physics = require('physics');

  return class extends Market {
    constructor(name) {
      super();
      this.name       = name;
      this.conditions = [];
      this.agents     = [];
      this.resources  = new util.ResourceCounter(0);
      this.fabricator = data.fabricators;
      this.deliveries = [];
    }

    get title()     {return data.bodies[this.name].name}
    get type()      {return system.type(this.name)}
    get size()      {return data.bodies[this.name].size}
    get scale()     {return data.scales[this.size]}
    get traits()    {return data.bodies[this.name].traits}
    get faction()   {return data.bodies[this.name].faction}
    get sales_tax() {return data.factions[this.faction].sales_tax}
    get patrol()    {return data.factions[this.faction].patrol}
    get max_fabs()  {return Math.ceil(data.fabricators * this.scale)}
    get num_agents() {return Math.ceil(data.market.agents * this.scale)}

    save() {
      const me      = super.save();
      me.name       = this.name;
      me.conditions = this.conditions;
      me.resources  = this.resources.save();
      me.fabricator = this.fabricator;
      me.deliveries = this.deliveries;
      me.agents     = [];

      //this.agents.forEach((agent) => {me.agents.push(agent.save())});
      for (const agent of this.agents)
        me.agents.push(agent.save());

      return me;
    }

    load(obj) {
      this.name = obj.name;
      this.conditions = obj.conditions;
      this.fabricator = obj.fabricator;
      this.deliveries = obj.deliveries;
      this.resources.load(obj.resources);
      this.agents = [];

      /*obj.agents.forEach((info) => {
        const agent = new Crafter;
        agent.load(info);
        this.agents.push(agent);
      });*/

      for (const info of obj.agents) {
        const agent = new Crafter;
        agent.load(info);
        this.agents.push(agent);
      }

      super.load(obj);
    }

    isLocallyMined(resource) {
      const isLocallyProduced = this.production.get(resource) > 0;
      const isMinable = data.resources[resource].hasOwnProperty('mine');
      return isLocallyProduced && isMinable ? true : false;
    }

    nearestSource(resource) {
      const ranges = system.ranges(system.position(this.name));
      let best;
      let dist;

      for (const body of Object.keys(ranges)) {
        if (body === this.name) continue;
        if (dist != undefined && ranges[body] >= dist) continue;

        const place = Game.game.place(body);

        if (!place.is_under_supplied(resource)) {
          dist = ranges[body];
          best = body;
        }
      }

      return [best, dist];
    }

    distancePriceMalus(resource) {
      if (!data.resources[resource].hasOwnProperty('mine'))
        return 0;

      if (this.isLocallyMined(resource))
        return 0;

      const [best, dist] = this.nearestSource(resource);
      const malus = dist ? (dist / Physics.AU / 10) : 3;

      return this.is_under_supplied(resource) ? malus : malus / 2;
    }

    // For non-local and manufactured goods in remote economies, there is a
    // premium markup.
    adjustment(resource) {
      return super.adjustment(resource) + this.distancePriceMalus(resource);
    }

    demand(resource) {
      const actual = super.demand(resource);
      const base = data.market.consumes[resource] || 0;
      return actual + (base * this.scale);
    }

    applyStandingDiscount(price, player) {
      if (player) return Math.ceil(price * (1 - player.getStandingPriceAdjustment(this.faction)));
      return price;
    }

    calculateBuyPrice(resource, player) {
      return Math.ceil(super.calculateBuyPrice(resource) * (1 + this.sales_tax));
    }

    buyPrice(resource, player) {
      return Math.ceil(this.applyStandingDiscount(super.buyPrice(resource), player));
    }

    mergeScale(resources, traits, conditions) {
      const amounts = new util.ResourceCounter(0);

      for (const resource of Object.keys(resources))
        amounts.inc(resource, resources[resource]);

      if (traits)
        for (const trait of traits)
          for (const resource of Object.keys(trait))
            amounts.inc(resource, trait[resource]);

      if (conditions)
        for (const cond of conditions)
          for (const resource of Object.keys(cond))
            amounts.inc(resource, cond[resource]);

      amounts.each((resource, amount) => {
        const scaled = amount * this.scale;
        amounts.set(resource, Math.max(0, scaled));
      });

      return amounts;
    }

    get production() {
      let traits = this.traits.map((t)     => {return data.traits[t].produces});
      let conds  = this.conditions.map((c) => {return data.conditions[c].produces});
      let extra  = data.factions[this.faction].produces;
      return this.mergeScale(data.market.produces, traits, conds, extra);
    }

    get consumption() {
      let traits = this.traits.map((t)     => {return data.traits[t].consumes});
      let conds  = this.conditions.map((c) => {return data.conditions[c].consumes});
      let extra  = data.factions[this.faction].consumes;
      return this.mergeScale(data.market.consumes, traits, conds, extra);
    }

    get availableWorkTasks() {
      const work = [];

      TASK:
      for (const task of data.work) {
        for (const req of task.avail) {
          for (const trait of this.traits) {
            if (req === trait) {
              work.push(task);
              continue TASK;
            }
          }
        }
      }

      return work;
    }

    payRate(player, task) {
      let rate = task.pay * this.scale;
      rate += rate * player.getStandingPriceAdjustment(this.faction);
      rate -= rate * this.sales_tax;
      return Math.ceil(rate);
    }

    work(player, task, days) {
      const pay       = this.payRate(player, task) * days
      const turns     = days * (24 / data.hours_per_turn);
      const rewards   = task.rewards;
      const collected = new util.ResourceCounter;

      for (let turn = 0; turn < turns; ++turn) {
        for (const item of rewards) {
          if (data.resources[item].hasOwnProperty('mine')) {
            const tics = data.resources[item].mine.tics;

            if ((turn >= tics) && (turn % tics === 0) && this.mine(item)) {
              collected.inc(item, 1);
            }
          }
        }
      }

      return {
        pay: pay,
        items: collected,
      };
    }

    mine(resource) {
      const count = this.resources.get(resource);

      if (count > 0) {
        if (Math.random() <= data.market.minability) {
          this.resources.dec(resource, 1);
          return true;
        }
      }

      return false;
    }

    /*
     * Returns the percentage of total fabrication resources currently available
     * for commercial use.
     */
    fabricationAvailability() {
      return Math.min(100, Math.round(this.fabricator / this.max_fabs * 1000) / 10);
    }

    /*
     * Given a resource name, returns the adjusted number of turns based on the
     * fabrication resources available.
     */
    fabricationTime(item) {
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
      let adjusted = this.fabricationTime(item);
      this.fabricator = Math.max(0, this.fabricator - turns);
      return adjusted;
    }

    craftTime(item) {
      return this.fabricationTime(item);
    }

    resourcesNeeded() {
      return Object.keys(data.resources)
        .filter((r) => {return this.is_under_supplied(r)})
        .sort((a, b) => {return this.localNeed(a) < this.localNeed(b)});
    }

    deliveryOriginDesirability(origin, resource) {
      const place = Game.game.place(origin);

      // Already have a delivery scheduled
      for (const delivery of this.deliveries) {
        if (delivery.item === resource)
          return 0;
      }

      // Origin does not have enough of resource
      const stock = place.currentSupply(resource);

      if (stock < data.min_delivery_amt)
        return 0;

      if (place.is_under_supplied(resource))
        return 0;

      // Distance bonus
      const distance = system.distance(this.name, origin) / Physics.AU;
      let rating = stock / distance;

      // Shared faction bonus
      if (data.bodies[origin].faction === this.faction)
        rating *= 1.5;

      // Remote supply bonus
      if (place.is_over_supplied(resource))
        rating *= 2;

      return rating;
    }

    deliveryAmount(origin, resource) {
      const remoteStock = Game.game.place(origin).currentSupply(resource);
      const localSupply = this.currentSupply(resource) + this.supplyHistory.avg(resource);
      const localDemand = this.demand(resource);

      for (let i = 1; i <= remoteStock; ++i) {
        // see Market.supply()
        let supply = 1 + ((i + localSupply) / 2);
        if (localDemand / supply < 0.75) {
          return i;
        }
      }

      return remoteStock;
    }

    deliverySchedule() {
      const consumption = 10;

      if (this.deliveries.length >= this.num_agents)
        return;

      for (const resource of this.resourcesNeeded()) {
        let possible = Object.keys(data.bodies)
          .filter((b) => {return b !== this.name})
          .map((b) => {return [b, this.deliveryOriginDesirability(b, resource)]})
          .filter((b) => {return b[1] > 0});

        for (let [body, desirability] of possible) {
          let place = Game.game.place(body);
          let want  = this.deliveryAmount(body, resource);

          if (want < data.min_delivery_amt)
            continue;

          let amt   = want;
          let dist  = system.distance(this.name, place.name) / Physics.AU;
          let turns = Math.ceil((24 / data.hours_per_turn) * consumption * dist);
          let fuel  = Math.ceil(dist / consumption);
          let avail = place.currentSupply('fuel');

          // If getting fuel delivered, adjust the delivery amount until there is
          // at least enough fuel to make the delivery.
          if (resource === 'fuel') {
            avail -= amt;
            while (amt > 0 && avail < fuel) {
              --amt;
              ++avail;
            }
          }

          // After adjustments, is the amount still positive?
          if (amt === 0) {
            place.incDemand(resource, want);
            continue;
          }

          // Is there enough fuel available to make the delivery?
          if (avail < fuel) {
            place.incDemand('fuel', fuel - avail);
            place.incDemand(resource, amt);
            continue;
          }

          if (amt < data.min_delivery_amt)
            continue;

          place.buy('fuel', fuel);
          place.buy(resource, amt);

          let delivery = {
            origin : place.name,
            item   : resource,
            amount : amt,
            turns  : turns
          };

          this.deliveries.push(delivery);

          if (this.deliveries.length >= this.num_agents)
            return;

          break;
        }
      }
    }

    deliveryProcess() {
      let incomplete = [];

      for (let d of this.deliveries) {
        d.turns -= 1;

        if (d.turns === 0) {
          this.sell(d.item, d.amount);
          console.log(`[${Game.game.turns}] delivery: ${this.name} received ${d.amount} units of ${d.item} from ${d.origin}`);
        }
        else {
          incomplete.push(d);
        }
      }

      this.deliveries = incomplete;
    }

    produceResources() {
      for (let [resource, amt] of this.production.entries()) {
        this.resources.set(resource, amt);

        const tics = data.resources[resource].hasOwnProperty('mine')
          ? data.resources[resource].mine.tics    // naturally occurring
          : data.resources[resource].recipe.tics; // manufactured

        if (Game.game.turns % tics !== 0)
          return;

        if (this.is_over_supplied(resource))
          return;

        this.sell(resource, Math.floor(amt));
      }
    }

    turn() {
      // Start agents if needed
      if (this.agents.length < this.num_agents) {
        const money = data.market.agent_money * this.scale;
        this.agents.push(new Crafter({place: this.name, money: money}));
      }

      // Produce
      this.produceResources();

      // Agents
      this.agents.push(this.agents.shift()); // Shuffle order
      //this.agents.forEach((agent) => {agent.turn()});
      for (const agent of this.agents)
        agent.turn();

      // Consume
      this.consumption.each((item, amt) => {
        const want  = Math.ceil(amt);
        const avail = Math.min(want, this.currentSupply(item));

        if (avail)
          this.buy(item, avail);

        if (avail < want)
          this.incDemand(item, want - avail);
      });

      // Restore fabricators
      if (this.fabricator <= (this.max_fabs * 0.5)) {
        const each  = data.fab_health;
        const want  = Math.floor((this.max_fabs - this.fabricator) / each);
        const avail = Math.min(want, this.currentSupply('cybernetics'));

        if (avail < want)
          this.incDemand('cybernetics', want - avail);

        if (avail > 0) {
          this.buy('cybernetics', avail);
          this.fabricator += avail * each;
        }
      }

      for (const item of (Object.keys(data.necessity))) {
        if (this.currentSupply(item) === 0) {
          this.incDemand(item, 10);
        }
      }

      this.deliverySchedule();
      this.deliveryProcess();

      super.turn();
    }

    inspectionRate(distance) {
      const adjust = Game.game.player.hasStanding('Friendly') ? 0.5 : 1.0;
      const rate = this.patrol * this.scale * adjust;
      return distance ? rate * Math.pow(data.jurisdiction, 2) / Math.pow(distance, 2) : rate;
    }

    inspectionChance(distance) {
      return Math.random() <= this.inspectionRate(distance);
    }

    inspectionFine() {
      return Math.max(10, data.max_abs_standing - Game.game.player.getStanding(this.faction));
    }
  };
});
