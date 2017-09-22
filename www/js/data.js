/*
 * Masses in metric tonnes (t)
 * Thrust in kiloNewtons
 */

const data = {
  start_date      : new Date(2242, 0, 1, 1),
  hours_per_turn  : 8,
  initial_turns   : 1000,
  market_history  : 30,
  base_unit_price : 100,
  scarcity_markup : 0.3,
  necessity       : {water: true, food: true, medicine: true, fuel: true},
  craft_fee       : 0.05,
  fabricators     : 100,
  fab_health      : 40,
  base_pay        : 20,

  scales: {
    tiny   : 0.66,
    small  : 0.83,
    normal : 1,
    large  : 1.17,
    huge   : 1.33
  },

  resources: {
    water        : {mass: 10, mine: {tics: 2}},
    ore          : {mass: 60, mine: {tics: 3}},
    minerals     : {mass: 50, mine: {tics: 3}},
    hydrocarbons : {mass: 8,  mine: {tics: 4}},
    food         : {mass: 30, mine: {tics: 5}, recipe: {tics: 3, materials: {water: 1, minerals: 1, hydrocarbons: 2}}},
    fuel         : {mass: 4,  recipe: {tics: 2, materials: {minerals: 1}}},
    metal        : {mass: 90, recipe: {tics: 2, materials: {ore: 4}}},
    ceramics     : {mass: 30, recipe: {tics: 3, materials: {minerals: 1, water: 1}}},
    medicine     : {mass: 10, recipe: {tics: 4, materials: {food: 1, hydrocarbons: 1}}},
    machines     : {mass: 75, recipe: {tics: 4, materials: {metal: 2, ceramics: 1}}},
    electronics  : {mass: 20, recipe: {tics: 5, materials: {ceramics: 2, minerals: 1}}},
    cybernetics  : {mass: 80, recipe: {tics: 6, materials: {metal: 1, ceramics: 1, machines: 1, electronics: 1}}}
  },

  market: {
    agents      : 2,
    fabricators : 2,
    minability  : 0.25,
    produces    : {},
    consumes    : {water: 1, food: 1}
  },

  traits: {
    'mineral rich'     : {produces: {ore:    0.5, minerals:  0.5}, consumes: {}},
    'mineral poor'     : {produces: {ore:   -0.5, minerals: -0.25}, consumes: {}},
    'water rich'       : {produces: {water:  0.5}, consumes: {}},
    'water poor'       : {produces: {water: -0.5}, consumes: {}},
    'hydrocarbon rich' : {produces: {hydrocarbons: 0.5, minerals: 0.2}, consumes: {}},
    'hydrocarbon poor' : {produces: {hydrocarbons: -0.5, minerals: -0.2}, consumes: {}},

    'asteroids'        : {produces: {ore:   1.0, minerals: 0.75}, consumes: {}},
    'rocky'            : {produces: {ore:   0.6, minerals: 0.5} , consumes: {}},
    'icy'              : {produces: {water: 0.8, minerals: 0.35, hydrocarbons: 0.2}, consumes: {}},

    'agricultural'     : {produces: {food: 0.3, hydrocarbons: 0.1}, consumes: {machines: 0.2, fuel: 0.025, water: 0.2, hydrocarbons: 0.4}},
    'habitable'        : {produces: {food: 0.7, hydrocarbons: 0.3}, consumes: {}},
    'domed'            : {produces: {food: 0.1, hydrocarbons: 0.05}, consumes: {fuel: 0.2, electronics: 0.05, machines: 0.05, water: 0.1, hydrocarbons: 0.2}},
    'subterranean'     : {produces: {}, consumes: {fuel: 0.1, electronics: 0.05, machines: 0.05}},
    'orbital'          : {produces: {}, consumes: {fuel: 0.3, electronics: 0.1, machines: 0.1}}
  },

  conditions: {
    drought : {produces: {}, consumes: {}},
    famine  : {produces: {}, consumes: {}},
    plague  : {produces: {}, consumes: {}},
    war     : {produces: {}, consumes: {}},
  },

  factions: {
    'UN': {
      full_name : 'United Nations',
      capital   : 'Earth',
      sales_tax : 0.1135,
      ship      : 'trader'
    },
    'MC': {
      full_name : 'Martian Commonwealth',
      capital   : 'Mars',
      sales_tax : 0.0925,
      ship      : 'barsoom'
    },
    'TRANSA': {
      full_name : 'Trans-Neptunian Authority',
      capital   : 'Pluto',
      sales_tax : 0.025,
      ship      : 'neptune'
    },
    'SCS': {
      full_name : 'Solar Commercial Syndicate',
      capital   : 'Ganymede',
      sales_tax : 0.0822,
      ship      : 'trader'
    },
    'CERES': {
      full_name : 'Ceres',
      capital   : 'Ceres',
      sales_tax : 0.065,
      ship      : 'trader'
    }
  },

  bodies: {
    mercury: {
      name     : 'Mercury',
      size     : 'small',
      traits   : ['subterranean', 'rocky', 'mineral rich', 'water poor'],
      faction  : 'UN',
      gravity  : 0.377
    },
    earth: {
      name     : 'Earth',
      size     : 'huge',
      traits   : ['habitable', 'orbital', 'rocky', 'water rich'],
      faction  : 'UN',
      gravity  : 1.0
    },
    moon: {
      name     : 'Luna',
      size     : 'large',
      traits   : ['domed', 'subterranean', 'rocky', 'water poor'],
      faction  : 'UN',
      gravity  : 0.165
    },
    mars: {
      name     : 'Mars',
      size     : 'large',
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'water poor', 'mineral rich'],
      faction  : 'MC',
      gravity  : 0.378
    },
    phobos: {
      name     : 'Phobos Science Station',
      size     : 'small',
      traits   : ['subterranean', 'rocky', 'water poor'],
      faction  : 'MC',
      gravity  : 0.35
    },
    deimos: {
      name     : 'Deimos Command',
      size     : 'tiny',
      traits   : ['subterranean', 'rocky', 'water poor'],
      faction  : 'MC',
      gravity  : 0.35
    },
    ceres: {
      name     : 'Ceres',
      size     : 'large',
      traits   : ['subterranean', 'rocky', 'asteroids'],
      faction  : 'CERES',
      gravity  : 0.5
    },
    europa: {
      name     : 'Europa',
      size     : 'small',
      traits   : ['subterranean', 'rocky'],
      faction  : 'MC',
      gravity  : 0.134
    },
    callisto: {
      name     : 'Callisto',
      size     : 'normal',
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'agricultural'],
      faction  : 'MC',
      gravity  : 0.126
    },
    ganymede: {
      name     : 'Ganymede',
      size     : 'large',
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'mineral poor', 'agricultural'],
      faction  : 'SCS',
      gravity  : 0.146
    },
    enceladus: {
      name     : 'Enceladus Depot',
      size     : 'small',
      traits   : ['orbital', 'icy', 'water rich', 'mineral poor', 'hydrocarbon rich'],
      faction  : 'SCS',
      gravity  : 0.35
    },
    rhea: {
      name     : 'Rhea Orbital Lab',
      size     : 'small',
      traits   : ['orbital', 'icy', 'water rich', 'mineral poor'],
      faction  : 'SCS',
      gravity  : 0.35
    },
    titan: {
      name     : 'Titan',
      size     : 'normal',
      traits   : ['domed', 'icy', 'water rich', 'hydrocarbon rich'],
      faction  : 'TRANSA',
      gravity  : 0.14
    },
    triton: {
      name     : 'Triton Command',
      size     : 'small',
      traits   : ['orbital', 'icy', 'water rich', 'mineral poor'],
      faction  : 'TRANSA',
      gravity  : 0.35
    },
    titania: {
      name     : 'Titania Outpost',
      size     : 'small',
      traits   : ['subterranean', 'icy', 'rocky', 'hydrocarbon rich'],
      faction  : 'TRANSA',
      gravity  : 0.39
    },
    pluto: {
      name     : 'Pluto',
      size     : 'small',
      traits   : ['domed', 'subterranean', 'rocky', 'water rich'],
      faction  : 'TRANSA',
      gravity  : 0.063
    }
  },

  drives: {
    ion: {
      name      : 'Ion',
      thrust    : 80,
      mass      : 10,
      desc      : 'Ion thrusters are commodity, inexpensive, and efficient. Bolted on by the dozen, they are the work horse of the cargo fleet.',
      burn_rate : 0.008,
    },
    fusion: {
      name      : 'Fusion',
      thrust    : 800,
      mass      : 40,
      desc      : 'Condensed pellets of fuel, ignited by a laser or maser, produce vast amouts of plasma which is then directed by magnetic fields to produce thrust. Expensive enough to maintain and keep fueled to make it impractical for most hauler operations, it is the favored drive for military vessels.',
      burn_rate : 0.20,
    }
  },

  shipclass: {
    /* Civilian */
    shuttle     : {hull: 3,  armor: 1,  cargo: 2,   hardpoints: 0,  mass: 200,   tank: 2,   drives: 1,   drive: 'ion',    restricted: false},
    cutter      : {hull: 4,  armor: 2,  cargo: 6,   hardpoints: 1,  mass: 250,   tank: 2,   drives: 2,   drive: 'ion',    restricted: false},
    yacht       : {hull: 6,  armor: 2,  cargo: 6,   hardpoints: 2,  mass: 300,   tank: 4,   drives: 3,   drive: 'ion',    restricted: false},
    schooner    : {hull: 8,  armor: 4,  cargo: 10,  hardpoints: 2,  mass: 450,   tank: 6,   drives: 4,   drive: 'ion',    restricted: false},

    /* Merchant */
    trader      : {hull: 4,  armor: 1,  cargo: 25,  hardpoints: 1,  mass: 2500,  tank: 35,  drives: 30,  drive: 'ion',    restricted: false},
    merchantman : {hull: 7,  armor: 2,  cargo: 30,  hardpoints: 2,  mass: 4000,  tank: 60,  drives: 50,  drive: 'ion',    restricted: false},
    freighter   : {hull: 10, armor: 3,  cargo: 50,  hardpoints: 2,  mass: 6800,  tank: 110, drives: 80,  drive: 'ion',    restricted: false},
    hauler      : {hull: 20, armor: 5,  cargo: 100, hardpoints: 4,  mass: 10000, tank: 150, drives: 100, drive: 'ion',    restricted: false},

    /* Military */
    transport   : {hull: 40, armor: 10, cargo: 50,  hardpoints: 6,  mass: 8000,  tank: 180, drives: 220, drive: 'ion',    restricted: true},
    corvette    : {hull: 25, armor: 5,  cargo: 10,  hardpoints: 4,  mass: 550,   tank: 25,  drives: 2,   drive: 'fusion', restricted: true},
    frigate     : {hull: 30, armor: 5,  cargo: 30,  hardpoints: 4,  mass: 800,   tank: 40,  drives: 4,   drive: 'fusion', restricted: true},
    destroyer   : {hull: 45, armor: 12, cargo: 12,  hardpoints: 8,  mass: 1100,  tank: 40,  drives: 8,   drive: 'fusion', restricted: true},
    cruiser     : {hull: 60, armor: 15, cargo: 15,  hardpoints: 10, mass: 1850,  tank: 100, drives: 16,  drive: 'fusion', restricted: true},
    battleship  : {hull: 85, armor: 25, cargo: 20,  hardpoints: 16, mass: 2300,  tank: 140, drives: 20,  drive: 'fusion', restricted: true},

    /* Faction ships */
    neptune     : {hull: 10, armor: 4,  cargo: 45,  hardpoints: 3,  mass: 3200,  tank: 80,  drives: 40,  drive: 'ion',    restricted: true, faction: 'TRANSA'},
    barsoom     : {hull: 35, armor: 6,  cargo: 30,  hardpoints: 4,  mass: 600,   tank: 30,  drives: 4,   drive: 'fusion', restricted: true, faction: 'MC'}
  },
};

/*
 * Descriptions
 */
data.shipclass.neptune.desc = 'Designed and built in TRANSA\'s own shipyards, the Neptune class cargo hauler has the longest range of any vessel while retaining low mass and reasonable cargo space. A favorite of traders and smugglers on the Long Haul alike, it has the armor and hard points to defend itself in the unguarded outer oribts.';
data.shipclass.barsoom.desc = 'The Barsoomian class frigate adopts the latest advances in Martian technology resulting in a frigate class ship with more range, speed, and enough firepower to act as its own escort.';
