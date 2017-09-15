/*
 * Masses in metric tonnes (t)
 * Thrust in kiloNewtons
 */

const data = {
  C  : 299792458,    // m/s
  G  : 9.80665,      // m/s/s
  AU : 149597870700, // m

  start_date      : new Date(2242, 0, 1, 1),
  hours_per_turn  : 8,
  initial_turns   : 300,
  craft_fee       : 0.005,

  market_history  : 100,
  base_unit_price : 50,
  scarcity_markup : 0.1,
  necessity       : {water: true, food: true, medicine: true, fuel: true},

  haulers         : 2, // per body
  hauler_money    : 1000,

  scales: {
    tiny   : 0.5,
    small  : 0.75,
    normal : 1,
    large  : 1.25,
    huge   : 1.5
  },

  resources: {
    water        : {mass: 10,  mine: {tics: 2}},
    ore          : {mass: 90,  mine: {tics: 4}},
    chemicals    : {mass: 50,  mine: {tics: 3}},
    food         : {mass: 5,   mine: {tics: 5}, recipe: {tics: 2, materials: {water: 1, chemicals: 1}}},
    fuel         : {mass: 1,   recipe: {tics: 1, materials: {ore: 2}}},
    metal        : {mass: 110, recipe: {tics: 2, materials: {ore: 4}}},
    medicine     : {mass: 10,  recipe: {tics: 1, materials: {food: 1, chemicals: 2}}},
    machines     : {mass: 75,  recipe: {tics: 1, materials: {metal: 1, chemicals: 1}}},
    electronics  : {mass: 20,  recipe: {tics: 1, materials: {metal: 1, chemicals: 4}}},
    cybernetics  : {mass: 80,  recipe: {tics: 1, materials: {machines: 1, electronics: 1}}},
    weapons      : {mass: 50,  recipe: {tics: 1, materials: {metal: 1, chemicals: 3}}, contraband: 4},
    narcotics    : {mass: 10,  recipe: {tics: 1, materials: {food: 1, chemicals: 1, medicine: 1}}, contraband: 7}
  },

  market: {
    agents        : 10,
    agent_money   : 1000,
    minability    : 0.25,
    produces      : {},
    consumes      : {water: 0.5, food: 0.5}
  },

  traits: {
    'mineral rich' : {produces: {ore:    0.5, chemicals:  0.5}, consumes: {}},
    'mineral poor' : {produces: {ore:   -0.5, chemicals: -0.5}, consumes: {}},
    'water rich'   : {produces: {water:  0.5}, consumes: {}},
    'water poor'   : {produces: {water: -0.5}, consumes: {}},

    'asteroids'    : {produces: {ore:   1.00, chemicals: 0.50}, consumes: {}},
    'ringed'       : {produces: {water: 1.00, chemicals: 0.50}, consumes: {}},
    'rocky'        : {produces: {ore:   0.75, chemicals: 0.25, water: 0.20}, consumes: {}},
    'icy'          : {produces: {water: 0.75, chemicals: 0.25, ore:   0.20}, consumes: {}},

    'habitable'    : {produces: {water: 1, food: 1}, consumes: {machines: 1}},
    'domed'        : {produces: {}, consumes: {machines: 1, electronics: 1, cybernetics: 1}},
    'subterranean' : {produces: {}, consumes: {machines: 1, electronics: 1}},
    'orbital'      : {produces: {}, consumes: {machines: 1, electronics: 1}}
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
      sales_tax : 0.18
    },
    'MC': {
      full_name : 'Martian Commonwealth',
      capital   : 'Mars',
      sales_tax : 0.12
    },
    'TRANSA': {
      full_name : 'Trans-Neptunian Authority',
      capital   : 'Pluto',
      sales_tax : 0.01
    },
    'ICS': {
      full_name : 'Interplanetary Commercial Syndicate',
      capital   : 'Ganymede',
      sales_tax : 0.08
    },
    'CERES': {
      full_name : 'Ceres',
      capital   : 'Ceres',
      sales_tax : 0.06
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
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'water poor'],
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
    ganymede: {
      name     : 'Ganymede',
      size     : 'large',
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'water rich', 'mineral poor'],
      faction  : 'ICS',
      gravity  : 0.146
    },
    callisto: {
      name     : 'Callisto',
      size     : 'normal',
      traits   : ['subterranean', 'rocky'],
      faction  : 'MC',
      gravity  : 0.126
    },
    enceladus: {
      name     : 'Enceladus Supply Station',
      size     : 'small',
      traits   : ['orbital', 'icy', 'ringed', 'water rich', 'mineral poor'],
      faction  : 'ICS',
      gravity  : 0.35
    },
    rhea: {
      name     : 'Rhea Orbital Lab',
      size     : 'small',
      traits   : ['orbital', 'icy', 'ringed', 'water rich', 'mineral poor'],
      faction  : 'ICS',
      gravity  : 0.35
    },
    triton: {
      name     : 'Triton Command',
      size     : 'small',
      traits   : ['orbital', 'icy', 'ringed', 'mineral poor'],
      faction  : 'TRANSA',
      gravity  : 0.35
    },
    titania: {
      name     : 'Titania Outpost',
      size     : 'small',
      traits   : ['subterranean', 'icy', 'rocky', 'ringed'],
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
      desc      : 'Ion thrusters are commodity, inexpensive, and efficient. Bolted on by the hundreds, they are the work horse of the cargo fleet.',
      burn_rate : 0.01,
    },
    fusion: {
      name      : 'Fusion',
      thrust    : 900,
      mass      : 40,
      desc      : 'Condensed pellets of fuel, ignited by a laser or maser, produce vast amouts of plasma which is then directed by magnetic fields to produce thrust. Expensive enough to maintain and keep fueled to make it impractical for most hauler operations, it is the favored drive for military vessels.',
      burn_rate : 0.25,
    }
  },

  shipclass: {
    /* Civilian */
    shuttle     : {hull: 3,  armor: 1,  cargo: 2,   hardpoints: 0,  mass: 200,   tank: 1,   drives: 1,   drive: 'ion'},
    cutter      : {hull: 4,  armor: 2,  cargo: 6,   hardpoints: 1,  mass: 250,   tank: 2,   drives: 2,   drive: 'ion'},
    yacht       : {hull: 6,  armor: 2,  cargo: 6,   hardpoints: 2,  mass: 300,   tank: 4,   drives: 3,   drive: 'ion'},
    schooner    : {hull: 8,  armor: 4,  cargo: 10,  hardpoints: 2,  mass: 450,   tank: 6,   drives: 4,   drive: 'ion'},

    /* Merchant */
    trader      : {hull: 4,  armor: 1,  cargo: 25,  hardpoints: 1,  mass: 2500,  tank: 35,  drives: 30,  drive: 'ion'},
    merchantman : {hull: 7,  armor: 2,  cargo: 30,  hardpoints: 2,  mass: 4000,  tank: 60,  drives: 50,  drive: 'ion'},
    freighter   : {hull: 10, armor: 3,  cargo: 50,  hardpoints: 2,  mass: 6800,  tank: 110, drives: 80,  drive: 'ion'},
    hauler      : {hull: 20, armor: 5,  cargo: 100, hardpoints: 4,  mass: 10000, tank: 150, drives: 100, drive: 'ion'},

    /* Ultra-long range */
    neptune     : {hull: 10, armor: 5,  cargo: 45,  hardpoints: 3,  mass: 5000,  tank: 80,  drives: 40,  drive: 'ion'},

    /* Military */
    transport   : {hull: 40, armor: 10, cargo: 50,  hardpoints: 6,  mass: 8000,  tank: 180, drives: 220, drive: 'ion'},
    corvette    : {hull: 25, armor: 5,  cargo: 10,  hardpoints: 4,  mass: 550,   tank: 25,  drives: 2,   drive: 'fusion'},
    frigate     : {hull: 30, armor: 5,  cargo: 30,  hardpoints: 4,  mass: 800,   tank: 40,  drives: 4,   drive: 'fusion'},
    destroyer   : {hull: 45, armor: 12, cargo: 12,  hardpoints: 8,  mass: 1100,  tank: 40,  drives: 8,   drive: 'fusion'},
    cruiser     : {hull: 60, armor: 15, cargo: 15,  hardpoints: 10, mass: 1850,  tank: 100, drives: 16,  drive: 'fusion'},
    battleship  : {hull: 85, armor: 25, cargo: 20,  hardpoints: 16, mass: 2300,  tank: 140, drives: 20,  drive: 'fusion'}
  }
};
