let _resource_value = {};

const data = {
  scales: {
    tiny   : 0.25,
    small  : 0.5,
    normal : 1,
    large  : 1.5,
    huge   : 2
  },

  resources: {
    water        : {mass: 200, mine: {tics: 3}},
    ore          : {mass: 1000, mine: {tics: 6}},
    chemicals    : {mass: 500, mine: {tics: 6}},
    food         : {mass: 200, recipe: {tics: 1, materials: {water: 1, chemicals: 1}}},
    metal        : {mass: 2000, recipe: {tics: 2, materials: {ore: 2}}},
    medicine     : {mass: 500, recipe: {tics: 2, materials: {food: 2, chemicals: 2}}},
    machines     : {mass: 1500, recipe: {tics: 2, materials: {metal: 2, chemicals: 1}}},
    electronics  : {mass: 750, recipe: {tics: 2, materials: {metal: 1, chemicals: 2}}},
    cybernetics  : {mass: 1800, recipe: {tics: 2, materials: {machines: 1, electronics: 1}}},
    weapons      : {mass: 1200, recipe: {tics: 2, materials: {metal: 1, chemicals: 2}}, contraband: 4},
    narcotics    : {mass: 500, recipe: {tics: 3, materials: {food: 1, chemicals: 2, medicine: 1}}, contraband: 7}
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
    mars      : {size: 'large',  traits: ['water poor']},
    phobos    : {size: 'small',  traits: ['water poor']},
    deimos    : {size: 'tiny',   traits: ['water poor']},
    ceres     : {size: 'small',  traits: []},
    io        : {size: 'normal', traits: ['mineral rich', 'water poor']},
    europa    : {size: 'small',  traits: []},
    ganymede  : {size: 'normal', traits: ['water rich']},
    callisto  : {size: 'normal', traits: []},
    mimas     : {size: 'small',  traits: ['water rich']},
    enceladus : {size: 'small',  traits: ['water rich']},
    tethys    : {size: 'tiny',   traits: ['water rich']},
    dione     : {size: 'small',  traits: ['water rich']},
    rhea      : {size: 'small',  traits: ['water rich']},
    titan     : {size: 'normal', traits: ['water rich']},
    iapetus   : {size: 'small',  traits: ['water rich']},
    phoebe    : {size: 'tiny',   traits: ['water rich']},
    titania   : {size: 'small',  traits: ['water rich']},
    triton    : {size: 'normal', traits: ['water rich']},
    pluto     : {size: 'small',  traits: ['water rich']},
    eris      : {size: 'small',  traits: ['mineral rich']}
  },

  shipclass: {
    corvette: {
      hull    : 10,
      armor   : 5,
      cargo   : 20,
      hardpts : 4,
      mass    : 175000,
      thrust  : 1400000
    }
  }
};
