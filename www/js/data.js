/*
 * Masses in metric tonnes (t)
 * Thrust in kiloNewtons
 */

const data = {
  C  : 299792458,    // m/s
  G  : 9.80665,      // m/s/s
  AU : 149597870700, // m

  hours_per_turn  : 4,
  initial_turns   : 60,
  demand_history  : 100 * 6, // 6 turns/day
  base_unit_price : 25,
  scarcity_markup : 1.25,
  necessity       : {water: true, food: true, medicine: true},

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
    food         : {mass: 5,   recipe: {tics: 10, materials: {water: 2, chemicals: 2}}},
    metal        : {mass: 110, recipe: {tics: 3, materials: {ore: 2}}},
    medicine     : {mass: 10,  recipe: {tics: 4, materials: {food: 1, chemicals: 1}}},
    machines     : {mass: 75,  recipe: {tics: 4, materials: {metal: 2, chemicals: 1}}},
    electronics  : {mass: 20,  recipe: {tics: 6, materials: {metal: 1, chemicals: 2}}},
    cybernetics  : {mass: 80,  recipe: {tics: 8, materials: {machines: 1, electronics: 1}}},
    weapons      : {mass: 50,  recipe: {tics: 6, materials: {metal: 1, chemicals: 2}}, contraband: 4},
    narcotics    : {mass: 10,  recipe: {tics: 4, materials: {food: 1, chemicals: 1, medicine: 1}}, contraband: 7}
  },

  market: {
    agents        : 100,
    agent_money   : 500,
    minability    : 0.25,
    produces: {
      water       : 10,
      ore         : 6,
      chemicals   : 4,
    },
    consumes: {
      water       : 5,
      food        : 2,
      medicine    : 1,
      machines    : 1,
      electronics : 1,
      cybernetics : 1,
      weapons     : 1,
      narcotics   : 1
    }
  },

  traits: {
    'mineral rich' : {produces: {ore: 1.5, chemicals: 1.25}, consumes: {}},
    'mineral poor' : {produces: {ore: 0.5, chemicals: 0.75}, consumes: {}},
    'water rich'   : {produces: {water: 1.5}, consumes: {}},
    'water poor'   : {produces: {water: 0.5}, consumes: {}},
  },

  conditions: {
    drought : {produces: {water: 0.75}, consumes: {medicine: 1.5}},
    famine  : {produces: {food: 0.75}, consumes: {medicine: 1.5}},
    plague  : {produces: {}, consumes: {medicine: 2, narcotics: 1.5}},
    war     : {produces: {}, consumes: {metal: 1.25, chemicals: 1.25, weapons: 3, medicine: 2, narcotics: 1.2}},
  },

  bodies: {
    mercury   : {size: 'normal', traits: ['mineral rich', 'water poor', 'water poor']},
    earth     : {size: 'huge',   traits: []},
    moon      : {size: 'normal', traits: []},
    mars      : {size: 'large',  traits: ['water poor', 'mineral rich']},
    phobos    : {size: 'small',  traits: ['water poor', 'water poor', 'mineral poor']},
    deimos    : {size: 'tiny',   traits: ['water poor', 'water poor', 'mineral poor']},
    ceres     : {size: 'small',  traits: ['water poor', 'mineral poor']},
    europa    : {size: 'small',  traits: ['mineral poor']},
    ganymede  : {size: 'normal', traits: ['water rich', 'mineral poor']},
    callisto  : {size: 'normal', traits: []},
    mimas     : {size: 'small',  traits: ['water rich', 'mineral poor']},
    enceladus : {size: 'small',  traits: ['water rich', 'mineral poor']},
    tethys    : {size: 'tiny',   traits: ['water rich', 'mineral poor']},
    dione     : {size: 'small',  traits: ['water rich', 'mineral poor']},
    rhea      : {size: 'small',  traits: ['water rich', 'mineral poor', 'mineral poor']},
    titan     : {size: 'normal', traits: ['water rich', 'mineral poor']},
    iapetus   : {size: 'small',  traits: ['water rich', 'mineral poor']},
    phoebe    : {size: 'tiny',   traits: ['water rich', 'mineral poor']},
    titania   : {size: 'small',  traits: ['water rich', 'mineral poor']},
    triton    : {size: 'normal', traits: ['water rich', 'mineral poor']},
    pluto     : {size: 'small',  traits: ['water rich']},
    eris      : {size: 'small',  traits: ['water poor', 'mineral poor']}
  },

  drives: {
    ion: {
      name   : 'HDI',
      desc   : '(pulsed inductive thruster) something about high power from fusion reactors, highly pressurized containment for reaction mass, and bolting them together by the hundreds, workhorse of the cargo fleet',
      thrust : 80,
      mass   : 5
    },
    plasma: {
      name   : 'Boswell',
      desc   : 'Having solved the problems of heat dissipation and electromagnetic interactions with modern ceramics and alloys, the original concept behind the VASIMR drive dates back more than two centuries. The modern Boswell drive is powerful enough to push even the largest craft efficiently, if not quickly.',
      thrust : 150,
      mass   : 10
    },
    fusion: {
      name   : 'Fusion',
      desc   : 'Condensed pellets of fuel, ignited by a laser or maser, produce vast amouts of plasma which is then directed by magnetic fields to produce thrust. Expensive enough to maintain and keep fueled to make it impractical for most hauler operations, it is the favored drive for military vessels.',
      thrust : 1000,
      mass   : 30
    }
  },

  shipclass: {
    /* Civilian */
    shuttle     : {hull: 3,  armor: 1,  cargo: 4,   hardpoints: 1,  mass: 100,   drives: 1,   drive: 'plasma'},
    cutter      : {hull: 4,  armor: 2,  cargo: 10,  hardpoints: 1,  mass: 200,   drives: 2,   drive: 'plasma'},
    yacht       : {hull: 6,  armor: 2,  cargo: 6,   hardpoints: 2,  mass: 350,   drives: 4,   drive: 'plasma'},
    schooner    : {hull: 8,  armor: 4,  cargo: 12,  hardpoints: 2,  mass: 400,   drives: 8,   drive: 'plasma'},

    /* Merchant */
    merchantman : {hull: 7,  armor: 2,  cargo: 25,  hardpoints: 2,  mass: 4000,  drives: 50,  drive: 'ion'},
    freighter   : {hull: 10, armor: 2,  cargo: 50,  hardpoints: 2,  mass: 6500,  drives: 80,  drive: 'ion'},
    hauler      : {hull: 20, armor: 5,  cargo: 100, hardpoints: 4,  mass: 10000, drives: 130, drive: 'ion'},

    /* Military */
    transport   : {hull: 20, armor: 10, cargo: 50,  hardpoints: 6,  mass: 8000,  drives: 180, drive: 'ion'},
    corvette    : {hull: 10, armor: 5,  cargo: 5,   hardpoints: 4,  mass: 550,   drives: 2,   drive: 'fusion'},
    frigate     : {hull: 10, armor: 5,  cargo: 25,  hardpoints: 4,  mass: 800,   drives: 4,   drive: 'fusion'},
    destroyer   : {hull: 15, armor: 12, cargo: 10,  hardpoints: 8,  mass: 1100,  drives: 6,   drive: 'fusion'},
    cruiser     : {hull: 20, armor: 15, cargo: 12,  hardpoints: 10, mass: 1850,  drives: 12,  drive: 'fusion'},
    battleship  : {hull: 35, armor: 25, cargo: 20,  hardpoints: 16, mass: 2300,  drives: 16,  drive: 'fusion'}
  },

  stats: {
    strength: {
      desc: 'Strength determines the level of sustained acceleration you can endure.'
    }
  }
};
