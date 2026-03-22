export default {
  'o2 rich atmosphere': {produces: {atmospherics: 1}, consumes: {}},

  'mineral rich':       {produces: {ore: 1.5, minerals: 1}, consumes: {}, price: {minerals: 0.75, ore: 0.75}},
  'mineral poor':       {produces: {ore: -2, minerals: -1}, consumes: {}},

  'water rich':         {produces: {water: 2}, consumes: {}},
  'water poor':         {produces: {water: -1}, consumes: {}, price: {water: 2}},

  'hydrocarbon rich':   {produces: {hydrocarbons: 2}, consumes: {}},
  'hydrocarbon poor':   {produces: {hydrocarbons: -2}, consumes: {hydrocarbons: 2}},

  'rocky':              {produces: {ore: 2, minerals: 1} , consumes: {}, price: {minerals: 0.75, ore: 0.75}},
  'icy':                {produces: {water: 3, minerals: 1, hydrocarbons: 1}, consumes: {}},

  'asteroids':          {produces: {ore: 4, minerals: 4}, consumes: {fuel: 1.5, electronics: 0.3, machines: 1, cybernetics: 0.3}, price: {ore: 0.75, minerals: 0.75}},
  'ringed system':      {produces: {water: 4, minerals: 1, hydrocarbons: 1}, consumes: {fuel: 1.5, electronics: 0.3, machines: 0.5, cybernetics: 0.3}},

  'agricultural':       {produces: {food: 3, hydrocarbons: 1}, consumes: {atmospherics: -0.25, machines: 0.5, fuel: 0.5, water: 2, hydrocarbons: 2}, price: {food: 0.75, hydrocarbons: 1.5, water: 1.25}},
  'habitable':          {produces: {atmospherics: 3, food: 8, hydrocarbons: 3}, consumes: {atmospherics: -0.5, food: 4, narcotics: 0.25, weapons: 0.5}, price: {food: 0.5, hydrocarbons: 0.5, water: 1.25}},
  'domed':              {produces: {food: 0.5, hydrocarbons: 0.25}, consumes: {metal: 0.6, fuel: 0.6, electronics: 0.5, machines: 0.5, water: 0.75, hydrocarbons: 0.75, weapons: 0.5}},
  'subterranean':       {produces: {food: 0.25, hydrocarbons: 0.25}, consumes: {metal: 0.6, fuel: 0.3, electronics: 0.5, machines: 0.5, water: 0.3, hydrocarbons: 0.75, weapons: 0.35}},
  'orbital':            {produces: {food: 0.1, hydrocarbons: 0.1}, consumes: {metal: 1, fuel: 1.5, electronics: 0.75, machines: 0.75, water: 0.15, hydrocarbons: 0.25, weapons: 0.2}},

  'black market':       {produces: {narcotics: 2, weapons: 1}, price: {narcotics: 0.35, weapons: 0.5}},
  'tech hub':           {produces: {electronics: 2, luxuries: 0.5}, price: {machines: 0.5, electronics: 0.3, cybernetics: 0.4, addons: 0.9}},
  'manufacturing hub':  {produces: {machines: 2, luxuries: 0.5}, price: {machines: 0.3, cybernetics: 0.25, addons: 0.8}},
  'capital':            {produces: {medicine: 0.5}, consumes: {weapons: 0.1, luxuries: 0.25}, price: {addons: 0.9}},
  'military':           {produces: {weapons: 2}, consumes: {weapons: 0.5, machines: 0.5, electronics: 0.5, medicine: 0.5}, price: {addons: 0.75}},
};
