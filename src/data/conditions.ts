export default {
  'plague': {
    days:     [15, 90] as [number, number],
    consumes: {medicine: 2},
    produces: {},
    triggers: {
      shortage:  {'water': 0.0005, 'food': 0.0003},
      surplus:   {'narcotics': 0.001},
      condition: {},
    },
  },

  'environmental disaster': {
    days:     [15, 90] as [number, number],
    consumes: {medicine: 2, machines: 1, electronics: 1},
    produces: {water: -1, food: -2},
    triggers: {
      shortage:  {},
      surplus:   {},
      condition: {'agricultural': 0.0003, 'habitable': 0.0006, 'manufacturing hub': 0.0009, 'military': 0.0008, 'black market': 0.0010},
    },
  },

  'grey goo': {
    days:     [10, 60] as [number, number],
    consumes: {electronics: 2, cybernetics: 1, machines: 2},
    produces: {ore: -2, minerals: -1, ceramics: -1},
    triggers: {
      shortage:  {},
      surplus:   {'cybernetics': 0.0004, 'electronics': 0.0003},
      condition: {'tech hub': 0.0005, 'manufacturing hub': 0.0003},
    },
  },

  "workers' strike": {
    days:     [7, 30] as [number, number],
    consumes: {},
    produces: {water: -2, ore: -2, minerals: -1, food: -1},
    triggers: {
      shortage:  {'food': 0.002, 'fuel': 0.0004, 'cybernetics': 0.0002},
      surplus:   {},
      condition: {'manufacturing hub': 0.0002, 'agricultural': 0.0004, 'environmental disaster': 0.001},
    },
  },
};
