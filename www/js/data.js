/*
 * Masses in metric tonnes (t)
 * Thrust in kiloNewtons
 */

const data = {
  scales: {
    tiny   : 0.25,
    small  : 0.5,
    normal : 1,
    large  : 1.5,
    huge   : 2
  },

  resources: {
    water        : {mass: 10, mine: {tics: 4}},
    ore          : {mass: 90, mine: {tics: 8}},
    chemicals    : {mass: 50, mine: {tics: 6}},
    food         : {mass: 5, recipe: {tics: 12, materials: {water: 4, chemicals: 4}}},
    metal        : {mass: 110, recipe: {tics: 3, materials: {ore: 4}}},
    medicine     : {mass: 10, recipe: {tics: 4, materials: {food: 2, chemicals: 2}}},
    machines     : {mass: 75, recipe: {tics: 4, materials: {metal: 4, chemicals: 2}}},
    electronics  : {mass: 20, recipe: {tics: 6, materials: {metal: 2, chemicals: 4}}},
    cybernetics  : {mass: 80, recipe: {tics: 8, materials: {machines: 2, electronics: 2}}},
    weapons      : {mass: 50, recipe: {tics: 6, materials: {metal: 2, chemicals: 4}}, contraband: 4},
    narcotics    : {mass: 10, recipe: {tics: 5, materials: {food: 2, chemicals: 4, medicine: 2}}, contraband: 7}
  },

  market: {
    agents        : 10,
    agent_money   : 500,
    minability    : 0.25,
    produces: {
      water       : 40,
      ore         : 20,
      chemicals   : 10
    },
    consumes: {
      water       : 10,
      food        : 10,
      medicine    : 3,
      machines    : 2,
      electronics : 2,
      cybernetics : 1,
      weapons     : 1,
      narcotics   : 1
    }
  },

  traits: {
    'mineral rich' : {produces: {ore: 1.5, chemicals: 1.25}, consumes: {}},
    'mineral poor' : {produces: {ore: 0.5, chemicals: 0.75}, consumes: {}},
    'water rich'   : {produces: {water: 1.5}, consumes: {}},
    'water poor'   : {produces: {water: 0.5}, consumes: {}}
  },

  conditions: {
    drought : {produces: {water: 0.75}, consumes: {medicine: 1.5}},
    famine  : {produces: {food: 0.75}, consumes: {medicine: 1.5}},
    plague  : {produces: {}, consumes: {medicine: 2, narcotics: 1.5}},
    war     : {produces: {}, consumes: {metal: 1.25, chemicals: 1.25, weapons: 3, medicine: 2, narcotics: 1.2}},
  },

  bodies: {
    mercury   : {size: 'normal', traits: ['mineral rich', 'water poor', 'water poor']},
    venus     : {size: 'huge',   traits: ['water poor', 'water poor']},
    earth     : {size: 'huge',   traits: ['water rich', 'water rich', 'mineral rich', 'mineral rich']},
    moon      : {size: 'normal', traits: ['mineral rich']},
    mars      : {size: 'large',  traits: ['water poor', 'mineral rich']},
    phobos    : {size: 'small',  traits: ['water poor']},
    deimos    : {size: 'tiny',   traits: ['water poor']},
    ceres     : {size: 'small',  traits: []},
    io        : {size: 'normal', traits: ['mineral rich', 'water poor']},
    europa    : {size: 'small',  traits: []},
    ganymede  : {size: 'normal', traits: ['water rich', 'mineral poor']},
    callisto  : {size: 'normal', traits: []},
    mimas     : {size: 'small',  traits: ['water rich', 'mineral poor']},
    enceladus : {size: 'small',  traits: ['water rich', 'mineral poor']},
    tethys    : {size: 'tiny',   traits: ['water rich', 'mineral poor']},
    dione     : {size: 'small',  traits: ['water rich', 'mineral poor']},
    rhea      : {size: 'small',  traits: ['water rich', 'mineral poor']},
    titan     : {size: 'normal', traits: ['water rich', 'mineral poor']},
    iapetus   : {size: 'small',  traits: ['water rich', 'mineral poor']},
    phoebe    : {size: 'tiny',   traits: ['water rich', 'mineral poor']},
    titania   : {size: 'small',  traits: ['water rich', 'mineral poor']},
    triton    : {size: 'normal', traits: ['water rich', 'mineral poor']},
    pluto     : {size: 'small',  traits: ['water rich']},
    eris      : {size: 'small',  traits: ['mineral rich']}
  },

  shipclass: {
    /* Civilian */
    shuttle     : {hull: 1,  armor: 0,  cargo: 2,   hardpoints: 1,  mass: 30,    thrust: 20},
    cutter      : {hull: 3,  armor: 1,  cargo: 5,   hardpoints: 1,  mass: 200,   thrust: 130},
    clipper     : {hull: 4,  armor: 2,  cargo: 8,   hardpoints: 1,  mass: 400,   thrust: 550},
    yacht       : {hull: 6,  armor: 2,  cargo: 10,  hardpoints: 2,  mass: 950,   thrust: 1100},
    schooner    : {hull: 8,  armor: 4,  cargo: 12,  hardpoints: 2,  mass: 1100,  thrust: 1350},

    /* Merchant */
    merchantman : {hull: 7,  armor: 2,  cargo: 25,  hardpoints: 2,  mass: 3800,  thrust: 2500},
    freighter   : {hull: 10, armor: 2,  cargo: 50,  hardpoints: 2,  mass: 4500,  thrust: 3200},
    hauler      : {hull: 20, armor: 5,  cargo: 100, hardpoints: 4,  mass: 9000, thrust:  6500},

    /* Military */
    corvette    : {hull: 10, armor: 5,  cargo: 5,   hardpoints: 4,  mass: 750,   thrust: 2200},
    frigate     : {hull: 10, armor: 5,  cargo: 25,  hardpoints: 4,  mass: 800,   thrust: 2750},
    destroyer   : {hull: 15, armor: 12, cargo: 10,  hardpoints: 8,  mass: 1100,  thrust: 4000},
    cruiser     : {hull: 20, armor: 15, cargo: 12,  hardpoints: 10, mass: 1850,  thrust: 7000},
    battleship  : {hull: 35, armor: 25, cargo: 20,  hardpoints: 16, mass: 2700,  thrust: 11500}
  },

  stats: {
    strength: {
      desc: 'Strength determines the level of sustained acceleration you can endure.'
    }
  }
};
