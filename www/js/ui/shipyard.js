define(function(require, exports, module) {
  const data = require('data');
  const util = require('util');
  const Game = require('game');
  const UI   = require('ui');

  return {
    Upgrades: class extends UI.Container {
      constructor(opt) {
        super(opt);
        this.refresh();
      }

      refresh() {
        this.root.empty();

        for (let addon of Object.keys(data.shipAddOns)) {
          const info = data.shipAddOns[addon];

          if (info.restricted) {
            if (!Game.game.player.hasStanding(Game.game.place().faction, info.restricted)) {
              continue;
            }
          }

          const basePrice = info.price;
          const price = Math.ceil(basePrice + basePrice * Game.game.place().sales_tax);
          const card = new UI.Card;

          card.set_header(info.name);
          card.add_text(info.desc);
          card.add_def('Price', util.csn(price) + ' credits');
          card.add_def('Mass', info.mass + ' kg');

          if (info.hasOwnProperty('cargo'))     card.add_def('Cargo',     info.cargo);
          if (info.hasOwnProperty('armor'))     card.add_def('Armor',     info.armor);
          if (info.hasOwnProperty('damage'))    card.add_def('Damage',    info.damage);
          if (info.hasOwnProperty('reload'))    card.add_def('Reload',    info.reload + ' turns');
          if (info.hasOwnProperty('rate'))      card.add_def('Rate',      info.rate + ' / turn');
          if (info.hasOwnProperty('dodge'))     card.add_def('Dodge',     (info.dodge * 100) + '%');
          if (info.hasOwnProperty('intercept')) card.add_def('Intercept', (info.intercept * 100) + '%');

          const btn = card.add_header_button('Buy');

          btn.on('click', e => {
            if (price > Game.game.player.money) {
              const ok = new UI.Ok('You do not have enough money for this.');
              ok.show();
            }
            else if (Game.game.player.ship.availableHardPoints() <= 0) {
              const ok = new UI.Ok('Your ship does not have enough free hard points.');
              ok.show();
            }
            else {
              const ask = new UI.Ask(
                'Purchase and install <b>' + info.name + '</b> for ' + util.csn(price) + ' credits?',
                ['Yes', 'No'],
                choice => {
                  if (choice === 'Yes') {
                    Game.game.player.debit(price);
                    Game.game.player.ship.installAddOn(addon);
                    Game.game.save_game();
                    Game.game.refresh();
                    this.refresh();
                  }
                }
              );

              ask.show();
            }
          });

          if (Game.game.player.ship.hasAddOn(addon)) {
            const sellPrice = Math.ceil(0.7 * price);
            const btn = card.add_header_button('Sell');

            btn.on('click', e => {
              const ask = new UI.Ask(
                'Remove and sell your <b>' + info.name + '</b> for ' + util.csn(sellPrice) + ' credits?',
                ['Yes', 'No'],
                choice => {
                  if (choice === 'Yes') {
                    Game.game.player.ship.removeAddOn(addon);
                    Game.game.player.credit(sellPrice);
                    Game.game.save_game();
                    Game.game.refresh();
                    this.refresh();
                  }
                }
              );

              ask.show();
            });
          }
        
          this.add(card.root);
        }
      }
    },
  };
});
