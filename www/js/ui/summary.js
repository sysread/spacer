class PlaceSummary extends Card {
  constructor(opt) {
    super(opt);
    this.place  = opt.place || game.place();
    this.traits = uniq(this.place.traits, ', ');
    this.conds  = uniq(this.place.conditions, ', ');

    this.set_header(this.place.name).addClass('text-capitalize');

    this.add_def('Environment', system.kind(this.place.name));
    this.add_def('Faction', data.factions[this.place.faction].full_name);
    this.add_def('Economy', this.place.size).addClass('text-capitalize');
    this.add_def('Details', this.traits || 'None').addClass('text-capitalize');
    this.add_def('Special', this.conds  || 'None').addClass('text-capitalize');
  }
}
