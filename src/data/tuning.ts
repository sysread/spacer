/*
 * Masses in metric tonnes (t)
 * Thrust in kiloNewtons
 * Production/consumption are *daily* rates
 */
const hoursPerTurn = 6;
const turnsPerDay  = 24 / hoursPerTurn;

export default {
  start_date:              new Date(2242, 0, 1, 1),
  hours_per_turn:          hoursPerTurn,
  turns_per_day:           turnsPerDay,
  initial_days:            365,
  resource_scale:          5.0, // when scaling production and consumption of resources below, multiply by this value
  initial_stock:           100,
  market_history:          10 * turnsPerDay,
  scarcity_markup:         0.25,
  min_stock_count:         50,
  avg_stock_count:         250,
  max_imports:             6, // per market
  max_crafts:              10, // per market
  max_agents:              6, // total
  max_agent_money:         5000, // after which they buy luxuries
  min_agent_profit:        100, // min credits net profit before a route is attractive
  necessity:               {water: true, atmospherics: true, food: true, medicine: true, fuel: true},
  craft_fee_nofab:         0.20, // percentage of sell price when crafted without fabricators
  craft_fee:               0.05, // percentage of sell price when crafted with fabricators
  fabricators:             5, // number of fabricators, each equates to 1 unit of cybernetics
  fab_health:              5, // number of tics each fabricator can handle before needing to be replaced. be sure to make this higher than the total tics needed to craft a cybernetics unit.
  grav_deltav_factor:      1.75, // factor by which native gravity is multiplied to get player's sustained deltav tolerance
  initial_ship:            'schooner',
  initial_money:           500,
  max_abs_standing:        100,
  jurisdiction:            0.28, // au from body
  piracy_max_velocity:     500,
  passenger_mission_count: 4,
  smuggler_mission_count:  2,
};
