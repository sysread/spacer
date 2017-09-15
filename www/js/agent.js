var agent_accept  = {};
var agent_decline = {};

class Agent {
  constructor(place, money) {
    this.place     = place;
    this.money     = money;
    this.pending   = null;
    this.inventory = new ResourceCounter;
    this.consumption_threshold = money * 2;
  }

accept(ev, res, amt) {
  let p = this.place;
  if (!agent_accept.hasOwnProperty(p)) agent_accept[p] = {};
  if (!agent_accept[p].hasOwnProperty(ev)) agent_accept[p][ev] = {};
  if (!agent_accept[p][ev].hasOwnProperty(res)) agent_accept[p][ev][res] = 0;
  agent_accept[p][ev][res] += amt;
}

decline(ev, res, why) {
  let p = this.place;
  if (!agent_decline.hasOwnProperty(p)) agent_decline[p] = {};
  if (!agent_decline[p].hasOwnProperty(ev)) agent_decline[p][ev] = {};
  if (!agent_decline[p][ev].hasOwnProperty(res)) agent_decline[p][ev][res] = {};
  if (!agent_decline[p][ev][res].hasOwnProperty(why)) agent_decline[p][ev][res][why] = 0;
  agent_decline[p][ev][res][why]++;
}

  save() {
    return {
      place: this.place,
      money: this.money,
      inventory: this.inventory.save(),
      consumption_threshold: this.consumption_threshold
    };
  }

  load(obj) {
    this.place = obj.place;
    this.money = obj.money;
    this.consumption_threshold = obj.consumption_threshold;
    this.inventory.load(obj.inventory);
    this.pending = null;
  }

  turn() {
    if (!this.pending)
      this.pending = this.next_action();

    if (this.pending && this.pending.perform())
      this.pending = null;
  }

  next_action() {
    let best = 0;
    let chooser = new ActionChooser;

    chooser.add(this.action_consume());

    Object.keys(data.resources).forEach((item) => {
      chooser.add(this.action_craft(item));
      chooser.add(this.action_sell(item));
    });

    return chooser.action;
  }

  max_can_buy(item) {
    let available = game.place(this.place).current_supply(item);
    if (available == 0) return 0;

    let price = game.place(this.place).price(item);
    if (price > this.money) return 0;

    return Math.min(available, Math.floor(this.money / price));
  }

  action_sell(resource) {
    let amt = this.inventory.get(resource);

    if (!amt)
      return;

    let contraband = data.resources[resource].contraband;

    // Decides against illegal activity
    if (contraband && ((Math.random() * 10) <= contraband))
      return;

    let price = game.place(this.place).sell_price(resource);
    let profit = amt * price;

    return new Action(1, profit, null,
      () => {
        // Busted and fined
        if (contraband && ((Math.random() * 10) <= contraband)) {
this.accept('busted', resource, amt);
          this.money -= 100 * contraband;
          if (this.money < 0)
            this.money = 50;
          return;
        }

        this.money += game.place(this.place).sell(resource, amt);
        this.inventory.dec(resource, amt);
      }
    );
  }

  action_craft(resource) {
    let recipe = data.resources[resource].recipe;

    if (!recipe)
      return;

    let profit = game.place(this.place).sell_price(resource);
    let cost   = profit * data.craft_fee;
    let stop   = false;

    Object.keys(recipe.materials).forEach((item) => {
      if (stop) return;
      let lack = recipe.materials[item] - this.inventory.get(item);

      if (lack > 0) {
        if (game.place(this.place).current_supply(item) >= lack) {
          cost += lack * game.place(this.place).buy_price(item);

          if (cost >= profit) {
            stop = true;
this.decline('craft', resource, 'profit');
          }

          if (cost > this.money) {
            stop = true;
this.decline('craft', resource, `afford/${item}`);
          }
        }
        else {
          stop = true;
this.decline('craft', resource, `supply/${item}`);
          game.place(this.place).inc_demand(item);
        }
      }
    });

    if (stop)
      return;

    profit -= cost;

    return new Action(recipe.tics, profit,
      () => {
        // Purchase any materials we don't have
        Object.keys(recipe.materials).forEach((item) => {
          let need = recipe.materials[item] - this.inventory.get(item);

          if (need > 0) {
            this.money -= game.place(this.place).buy(item, need);
            this.inventory.inc(item, need);
          }
        });
      },
      () => {
        Object.keys(recipe.materials).forEach((item) => {
          this.inventory.dec(item, recipe.materials[item]);
this.accept('use', item, recipe.materials[item]);
        });

        this.money -= game.place(this.place).price(resource);
        this.inventory.inc(resource, 1);
this.accept('craft', resource, 1);
      }
    );
  }

  action_consume() {
    if (this.money < this.consumption_threshold) return;

    let place   = game.place(this.place);
    let items   = ['food', 'medicine', 'cybernetics', 'narcotics', 'weapons'];
    let options = items.filter((item) => {return place.current_supply(item) > 0 && place.price(item) < this.money / 3});
    if (options.length === 0) return;

    let item   = options.reduce((a, b) => {return place.price(a) > place.price(b) ? a : b});
    let to_buy = Math.ceil(this.max_can_buy(item) / 2);

    if (to_buy === 0) return;

    return new Action(1, 5000,
      () => {
        game.place(this.place).buy(item, to_buy);
      },
      () => {
this.accept('consume', item, to_buy);
      }
    );
  }
}
