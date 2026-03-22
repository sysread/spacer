export const scales = {
  tiny:   0.6,
  small:  0.8,
  normal: 1,
  large:  1.2,
  huge:   1.4
};

export const resources = {
  water:        {mass:  80, mine: {tics: 1, value: 21}},
  atmospherics: {mass:  20, mine: {tics: 1, value: 34}},
  ore:          {mass: 140, mine: {tics: 2, value: 26}},
  minerals:     {mass: 120, mine: {tics: 2, value: 33}},
  hydrocarbons: {mass:  40, mine: {tics: 2, value: 45}},
  food:         {mass:  40, mine: {tics: 2, value: 100}, recipe: {tics: 3, materials: {atmospherics: 1, water: 1, hydrocarbons: 1}}},
  fuel:         {mass:  30, recipe: {tics: 1, materials: {ore: 1, water: 1}}},
  luxuries:     {mass:  40, recipe: {tics: 5, materials: {water: 2, ore: 1, minerals: 1, hydrocarbons: 2}}},
  metal:        {mass: 160, recipe: {tics: 2, materials: {ore: 3}}},
  ceramics:     {mass: 100, recipe: {tics: 2, materials: {minerals: 3}}},
  medicine:     {mass:  20, recipe: {tics: 3, materials: {food: 1, hydrocarbons: 2}}},
  machines:     {mass: 140, recipe: {tics: 3, materials: {metal: 2}}},
  electronics:  {mass:  80, recipe: {tics: 3, materials: {ceramics: 5}}},
  cybernetics:  {mass: 240, recipe: {tics: 4, materials: {machines: 2, electronics: 2}}},
  narcotics:    {mass:  20, recipe: {tics: 2, materials: {medicine: 1, hydrocarbons: 1, water: 1}}, contraband: 5},
  weapons:      {mass:  60, recipe: {tics: 4, materials: {metal: 4, ceramics: 1}}, contraband: 7},
};

export const market = {
  fabricators: 10,
  minability:  0.1,
  produces:    {},
  consumes:    {atmospherics: 0.75, water: 4, food: 3, medicine: 0.5, narcotics: 0.1, weapons: 0.2},
};
