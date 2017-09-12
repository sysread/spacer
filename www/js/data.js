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

  demand_history  : 300 * 3, // * turns/day
  base_unit_price : 25,
  scarcity_markup : 0.1,
  necessity       : {water: true, food: true, medicine: true},

  haulers         : 2, // per body
  hauler_money    : 1000,

  fuel_price      : 200,

  scales: {
    tiny   : 0.25,
    small  : 0.5,
    normal : 1,
    large  : 1.5,
    huge   : 2
  },

  resources: {
    water        : {mass: 10,  mine: {tics: 2}},
    ore          : {mass: 90,  mine: {tics: 6}},
    chemicals    : {mass: 50,  mine: {tics: 4}},
    food         : {mass: 5,   mine: {tics: 8}, recipe: {tics: 2, materials: {water: 1, chemicals: 1}}},
    metal        : {mass: 110, recipe: {tics: 3, materials: {ore: 4}}},
    medicine     : {mass: 10,  recipe: {tics: 4, materials: {food: 1, chemicals: 2}}},
    machines     : {mass: 75,  recipe: {tics: 4, materials: {metal: 2, chemicals: 1}}},
    electronics  : {mass: 20,  recipe: {tics: 6, materials: {metal: 1, chemicals: 2}}},
    cybernetics  : {mass: 80,  recipe: {tics: 8, materials: {machines: 1, electronics: 1}}},
    weapons      : {mass: 50,  recipe: {tics: 6, materials: {metal: 1, chemicals: 2}}, contraband: 4},
    narcotics    : {mass: 10,  recipe: {tics: 4, materials: {food: 1, chemicals: 1, medicine: 1}}, contraband: 7}
  },

  market: {
    agents        : 80,
    miners        : 10,
    agent_money   : 500,
    minability    : 0.25,
    produces      : {},
    consumes      : {
      water       : 8,
      food        : 6,
      medicine    : 2,
      machines    : 2,
      electronics : 2,
      cybernetics : 1,
      weapons     : 1,
      narcotics   : 0
    }
  },

  traits: {
    'mineral rich' : {produces: {ore: 2, chemicals: 1}, consumes: {}},
    'mineral poor' : {produces: {ore: -2, chemicals: -1}, consumes: {}},
    'water rich'   : {produces: {water: 3}, consumes: {}},
    'water poor'   : {produces: {water: -3}, consumes: {}},

    'ringed'       : {produces: {water: 4}, consumes: {}},
    'asteroids'    : {produces: {water: 1, ore: 4}, consumes: {}},
    'rocky'        : {produces: {ore: 2, chemicals: 1}, consumes: {}},
    'icy'          : {produces: {water: 2, chemicals: 1}, consumes: {}},

    'habitable'    : {produces: {water: 12, food: 8}, consumes: {}},
    'orbital'      : {produces: {water: 2}, consumes: {}},
    'domed'        : {produces: {water: 8}, consumes: {}},
    'subterranean' : {produces: {water: 4}, consumes: {}},
  },

  conditions: {
    drought : {produces: {water: -4}, consumes: {medicine: 1}},
    famine  : {produces: {food: -2}, consumes: {medicine: 1}},
    plague  : {produces: {}, consumes: {medicine: 2, narcotics: 1}},
    war     : {produces: {}, consumes: {metal: 4, food: 2, chemicals: 2, weapons: 4, medicine: 2, narcotics: 1}},
  },

  factions: {
    'UN': {
      full_name : 'United Nations',
      sales_tax : 0.18
    },
    'MC': {
      full_name : 'Martian Commonwealth',
      sales_tax : 0.12
    },
    'TRANSA': {
      full_name : 'Trans-Neptunian Authority',
      sales_tax : 0.01
    },
    'ICS': {
      full_name : 'Interplanetary Commercial Syndicate',
      sales_tax : 0.08
    },
    'CERES': {
      full_name : 'Ceres',
      sales_tax : 0.06
    }
  },

  bodies: {
    mercury: {
      size     : 'normal',
      traits   : ['subterranean', 'rocky', 'mineral rich', 'water poor', 'water poor'],
      faction  : 'UN'
    },
    earth: {
      size     : 'huge',
      traits   : ['habitable', 'orbital', 'rocky'],
      faction  : 'UN'
    },
    moon: {
      size     : 'large',
      traits   : ['domed', 'subterranean', 'rocky', 'water poor'],
      faction  : 'UN'
    },
    mars: {
      size     : 'large',
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'water poor', 'mineral rich'],
      faction  : 'MC'
    },
    phobos: {
      size     : 'small',
      traits   : ['subterranean', 'rocky', 'water poor', 'water poor', 'mineral poor'],
      faction  : 'MC'
    },
    deimos: {
      size     : 'tiny',
      traits   : ['subterranean', 'rocky', 'water poor', 'water poor', 'mineral poor'],
      faction  : 'MC'
    },
    ceres: {
      size     : 'large',
      traits   : ['subterranean', 'rocky', 'asteroids', 'water rich', 'mineral rich'],
      faction  : 'CERES'
    },
    europa: {
      size     : 'small',
      traits   : ['subterranean', 'rocky'],
      faction  : 'MC'
    },
    ganymede: {
      size     : 'large',
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'water rich', 'mineral poor'],
      faction  : 'ICS'
    },
    callisto: {
      size     : 'normal',
      traits   : ['subterranean', 'rocky'],
      faction  : 'MC'
    },
    enceladus: {
      size     : 'small',
      traits   : ['orbital', 'icy', 'ringed', 'water rich', 'mineral poor'],
      faction  : 'ICS'
    },
    rhea: {
      size     : 'small',
      traits   : ['orbital', 'icy', 'ringed', 'water rich', 'water rich', 'mineral poor'],
      faction  : 'ICS'
    },
    triton: {
      size     : 'normal',
      traits   : ['orbital', 'icy', 'ringed', 'water rich', 'water rich', 'mineral poor'],
      faction  : 'TRANSA'
    },
    pluto: {
      size     : 'normal',
      traits   : ['domed', 'subterranean', 'rocky', 'water rich'],
      faction  : 'TRANSA'
    }
  },

  drives: {
    ion: {
      name      : 'Ion',
      thrust    : 40,
      mass      : 10,
      desc      : 'Ion thrusters are commodity, inexpensive, and efficient. Bolted on by the hundreds, they are the work horse of the cargo fleet.',
      burn_rate : 0.02,
    },
    fusion: {
      name      : 'Fusion',
      thrust    : 1000,
      mass      : 80,
      desc      : 'Condensed pellets of fuel, ignited by a laser or maser, produce vast amouts of plasma which is then directed by magnetic fields to produce thrust. Expensive enough to maintain and keep fueled to make it impractical for most hauler operations, it is the favored drive for military vessels.',
      burn_rate : 0.15,
    }
  },

  shipclass: {
    /* Civilian */
    shuttle     : {hull: 3,  armor: 1,  cargo: 2,   hardpoints: 1,  mass: 200,   tank: 2,   drives: 1,   drive: 'ion'},
    cutter      : {hull: 4,  armor: 2,  cargo: 10,  hardpoints: 1,  mass: 250,   tank: 8,   drives: 6,   drive: 'ion'},
    yacht       : {hull: 6,  armor: 2,  cargo: 6,   hardpoints: 2,  mass: 300,   tank: 10,  drives: 8,   drive: 'ion'},
    schooner    : {hull: 8,  armor: 4,  cargo: 12,  hardpoints: 2,  mass: 450,   tank: 14,  drives: 8,   drive: 'ion'},

    /* Merchant */
    merchantman : {hull: 7,  armor: 2,  cargo: 25,  hardpoints: 2,  mass: 4000,  tank: 80,  drives: 80,  drive: 'ion'},
    freighter   : {hull: 10, armor: 2,  cargo: 50,  hardpoints: 2,  mass: 6500,  tank: 100, drives: 80,  drive: 'ion'},
    hauler      : {hull: 20, armor: 5,  cargo: 100, hardpoints: 4,  mass: 10000, tank: 250, drives: 130, drive: 'ion'},

    /* Military */
    transport   : {hull: 20, armor: 10, cargo: 50,  hardpoints: 6,  mass: 8000,  tank: 250, drives: 200, drive: 'ion'},
    corvette    : {hull: 10, armor: 5,  cargo: 5,   hardpoints: 4,  mass: 550,   tank: 10,  drives: 2,   drive: 'fusion'},
    frigate     : {hull: 10, armor: 5,  cargo: 25,  hardpoints: 4,  mass: 800,   tank: 26,  drives: 4,   drive: 'fusion'},
    destroyer   : {hull: 15, armor: 12, cargo: 10,  hardpoints: 8,  mass: 1100,  tank: 40,  drives: 8,   drive: 'fusion'},
    cruiser     : {hull: 20, armor: 15, cargo: 12,  hardpoints: 10, mass: 1850,  tank: 100, drives: 16,  drive: 'fusion'},
    battleship  : {hull: 35, armor: 25, cargo: 20,  hardpoints: 16, mass: 2300,  tank: 140, drives: 20,  drive: 'fusion'}
  },

  stats: {
    strength: {
      desc: 'Strength determines the level of sustained acceleration you can endure.'
    }
  }
};
