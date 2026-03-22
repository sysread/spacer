export const drives = {
  ion: {
    name:      'Ion',
    thrust:    200,
    mass:      20,
    desc:      'Ion thrusters are commodity, inexpensive, and efficient. Bolted on by the dozen, they are the work horse of the cargo fleet.',
    burn_rate: 0.0025,
    value:     1200,
  },
  fusion: {
    name:      'Fusion',
    thrust:    2100,
    mass:      80,
    desc:      'Condensed pellets of fuel, ignited by a laser or maser, produce vast amouts of plasma which is then directed by magnetic fields to produce thrust. Expensive enough to maintain and keep fueled to make it impractical for most hauler operations, it is the favored drive for military vessels.',
    burn_rate: .05,
    value:     30000,
  }
};

export const shipclass = {
  /* Civilian */
  shuttle:     { hull: 2, armor: 1, cargo: 6,  hardpoints: 1, mass: 6000,  tank: 10, drives: 6,  drive: 'ion', restricted: false, desc: ''},
  schooner:    { hull: 4, armor: 2, cargo: 14, hardpoints: 1, mass: 16000, tank: 30, drives: 14, drive: 'ion', restricted: false, desc: ''},
  cutter:      { hull: 6, armor: 3, cargo: 20, hardpoints: 2, mass: 24000, tank: 50, drives: 20, drive: 'ion', restricted: false, desc: ''},

  /* Merchant */
  hauler:      { hull: 6,   armor: 2,  cargo: 30, hardpoints: 2, mass: 30000, tank: 40, drives: 20, drive: 'ion', restricted: false, desc: ''},
  merchantman: { hull: 8,   armor: 4,  cargo: 40, hardpoints: 3, mass: 44000, tank: 60, drives: 30, drive: 'ion', restricted: false, desc: ''},
  freighter:   { hull: 12,  armor: 6,  cargo: 50, hardpoints: 3, mass: 60000, tank: 80, drives: 60, drive: 'ion', restricted: false, desc: ''},

  /* Military */
  guardian:    { hull:  8, armor: 6,  cargo: 10, hardpoints: 3,  mass: 36000, tank: 40,  drives: 40, drive: 'ion',    restricted: 'Friendly', markets: ['capital', 'military'], desc: ''},
  corvette:    { hull: 10, armor: 10, cargo: 10, hardpoints: 4,  mass: 24000, tank: 40,  drives: 10, drive: 'fusion', restricted: 'Trusted',  markets: ['capital', 'military'], desc: ''},
  cruiser:     { hull: 20, armor: 15, cargo: 15, hardpoints: 8,  mass: 56000, tank: 120, drives: 30, drive: 'fusion', restricted: 'Admired',  markets: ['capital', 'military'], desc: ''},
  battleship:  { hull: 30, armor: 20, cargo: 20, hardpoints: 10, mass: 85000, tank: 140, drives: 40, drive: 'fusion', restricted: 'Admired',  markets: ['capital', 'military'], desc: ''},

  /* Faction ships */
  fortuna:     { hull: 8,  armor: 6,  cargo: 60, hardpoints: 2, mass: 72000, tank: 80,  drives: 70, drive: 'ion',    restricted: 'Friendly',  faction: 'JFT', desc: "Named for the daughter of Jupiter, the Fortuna is a container ship optimized to carry larger loads at higher efficiency than a typical freighter."},
  neptune:     { hull: 14, armor: 10, cargo: 40, hardpoints: 4, mass: 42000, tank: 100, drives: 50, drive: 'ion',    restricted: 'Trusted',   faction: 'TRANSA', markets: ['capital', 'military'], stealth: 0.05, desc: "Designed and built in TRANSA's own shipyards, the Neptune class cargo hauler has the longest range of any vessel while retaining low mass and reasonable cargo space. A favorite of traders and smugglers on the Long Haul alike due to its low albedo design, it has the armor and hard points to defend itself in the unguarded outer oribts."},
  barsoom:     { hull: 20, armor: 20, cargo: 25, hardpoints: 5, mass: 21000, tank: 80,  drives: 10, drive: 'fusion', restricted: 'Admired',   faction: 'MC',     markets: ['capital', 'military'], desc: "The Barsoomian class frigate adopts the latest advances in Martian technology resulting in a frigate class ship with more range, speed, and enough firepower to act as its own escort."},
  rockhopper:  { hull: 6,  armor: 4,  cargo: 35, hardpoints: 3, mass: 32000, tank: 40,  drives: 8,  drive: 'fusion', restricted: 'Respected', faction: 'CERES', burn_rate: -0.015, desc: "In the true spirit of the belt, the Rock Hopper is a rebuilt schooner class, retrofitted with upgraded armor, increased thrust, and after market hacks to boost fuel efficiency, making it great for hauling moderate sized loads of the heavy materials for which it is named."},
};

export const ship = {
  hull:  {repair: 50},
  armor: {repair: 200},
};
