define(function(require, exports, module) {
  const data    = require('data');
  const system  = require('system');
  const util    = require('util');
  const Game    = require('game');
  const Physics = require('physics');
  const UI      = require('ui');

  return {
    Place: class extends UI.Card {
      constructor(opt) {
        super(opt);
        this.place  = opt.place || Game.game.place();
        this.traits = util.uniq(this.place.traits, ', ');
        this.conds  = util.uniq(this.place.conditions, ', ');

        this.set_header(this.place.title).addClass('text-capitalize');

        if (this.showDescription) {
          this.add_text( $('<i>').append(data.bodies[this.place.name].desc.split('|').map(t => {return `<p>${t}</p>`}).join('')) );
        }

        if (this.place.name !== Game.game.locus) {
          this.add_def('Distance', Math.round(system.distance(Game.game.locus, this.place.name) / Physics.AU * 100) / 100 + ' AU');
        } else {
          this.add_def('Location', 'Docked');
        }

        this.add_def('Environ', system.kind(this.place.name));
        this.add_def('Faction', data.factions[this.place.faction].full_name);
        this.add_def('Economy', this.place.size).addClass('text-capitalize');
        this.add_def('Details', this.traits || 'None').addClass('text-capitalize');
        this.add_def('Special', this.conds  || 'None').addClass('text-capitalize');
      }

      get showDescription() {
        return this.opt.showDescription;
      }
    },
  };
});
