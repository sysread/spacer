const Resource = {
  water:        true,
  ore:          true,
  minerals:     true,
  hydrocarbons: true,
  food:         true,
  fuel:         true,
  metal:        true,
  ceramics:     true,
  medicine:     true,
  machines:     true,
  electronics:  true,
  cybernetics:  true,
  narcotics:    true,
  weapons:      true,
};

export type resource = keyof typeof Resource;
export const resources = Object.keys(Resource) as Array<resource>;
