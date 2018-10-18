define(function() {
  /*
   * Masses in metric tonnes (t)
   * Thrust in kiloNewtons
   */
  const hoursPerTurn = 8;
  const turnsPerDay  = 24 / hoursPerTurn;

  const data = {
    start_date:             new Date(2242, 0, 1, 1),
    hours_per_turn:         hoursPerTurn,
    initial_days:           2 * 365,
    initial_stock:          20,
    market_history:         10 * turnsPerDay,
    update_prices:          10, // days between price updates
    scarcity_markup:        0.25,
    necessity:              {water: true, food: true, medicine: true, fuel: true},
    craft_fee:              0.2,
    fabricators:            10, // number of fabricators, each equates to 1 unit of cybernetics
    fab_health:             30, // number of tics each fabricator can handle before needing to be replaced. be sure to make this higher than the total tics needed to craft a cybernetics unit.
    grav_deltav_factor:     2,  // factor by which native gravity is multiplied to get player's sustained deltav tolerance
    initial_ship:           'schooner',
    initial_money:          1000,
    max_abs_standing:       100,
    jurisdiction:           0.25, // au from body
    max_encounter_velocity: 1000000, // m/s

    scales: {
      tiny:   0.6,
      small:  0.8,
      normal: 1,
      large:  1.2,
      huge:   1.4
    },

    resources: {
      water:        {mass:  20, mine: {tics: 1, value: 20}},
      ore:          {mass:  40, mine: {tics: 2, value: 10}},
      minerals:     {mass:  30, mine: {tics: 2, value: 25}},
      hydrocarbons: {mass:  10, mine: {tics: 2, value: 30}},
      food:         {mass:  10, mine: {tics: 2, value: 40}, recipe: {tics: 3, materials: {water: 2, hydrocarbons: 1}}},
      fuel:         {mass:   1, recipe: {tics: 1, materials: {ore: 1, water: 1}}},
      metal:        {mass:  60, recipe: {tics: 2, materials: {ore: 3}}},
      ceramics:     {mass:  30, recipe: {tics: 2, materials: {minerals: 3}}},
      medicine:     {mass:  10, recipe: {tics: 3, materials: {food: 2, hydrocarbons: 1}}},
      machines:     {mass:  80, recipe: {tics: 3, materials: {metal: 2}}},
      electronics:  {mass:  30, recipe: {tics: 3, materials: {ceramics: 2}}},
      cybernetics:  {mass: 120, recipe: {tics: 4, materials: {machines: 1, electronics: 1}}},
      narcotics:    {mass:  10, recipe: {tics: 2, materials: {medicine: 2}}, contraband: 5},
      weapons:      {mass:  20, recipe: {tics: 4, materials: {metal: 2, ceramics: 1}}, contraband: 7},
    },

    market: {
      agents:      4,
      fabricators: 10,
      minability:  0.1,
      produces:    {},
      consumes:    {water: 2, food: 1.5, medicine: 1.5, narcotics: 0.3, weapons: 0.6},
    },

    traits: {
      'mineral rich':      {produces: {ore: 5, minerals: 3}, consumes: {}},
      'mineral poor':      {produces: {ore: -3, minerals: -1}, consumes: {}},

      'water rich':        {produces: {water: 2}, consumes: {}},
      'water poor':        {produces: {water: -1}, consumes: {}},

      'hydrocarbon rich':  {produces: {hydrocarbons: 3}, consumes: {}},
      'hydrocarbon poor':  {produces: {hydrocarbons: -1}, consumes: {}},

      'rocky':             {produces: {ore: 6, minerals: 3} , consumes: {}},
      'icy':               {produces: {water: 4.5, minerals: 2, hydrocarbons: 2}, consumes: {}},

      'asteroids':         {produces: {ore: 12, minerals: 7}, consumes: {fuel: 1.5, electronics: 0.3, machines: 1, cybernetics: 0.3}},
      'ringed system':     {produces: {water: 7, minerals: 2, hydrocarbons: 2}, consumes: {fuel: 1.5, electronics: 0.3, machines: 0.5, cybernetics: 0.3}},

      'agricultural':      {produces: {food: 4, hydrocarbons: 1}, consumes: {machines: 0.5, fuel: 0.5, water: 2, hydrocarbons: 2}},
      'habitable':         {produces: {food: 8, hydrocarbons: 3}, consumes: {food: 4, narcotics: 0.25, weapons: 0.5}},
      'domed':             {produces: {food: 0.5, hydrocarbons: 0.25}, consumes: {metal: 0.6, fuel: 0.6, electronics: 0.5, machines: 0.5, water: 0.75, hydrocarbons: 0.75, weapons: 0.5}},
      'subterranean':      {produces: {food: 0.25, hydrocarbons: 0.25}, consumes: {metal: 0.6, fuel: 0.3, electronics: 0.5, machines: 0.5, water: 0.3, hydrocarbons: 0.75, weapons: 0.35}},
      'orbital':           {produces: {food: 0.1, hydrocarbons: 0.1}, consumes: {metal: 1, fuel: 1.5, electronics: 0.75, machines: 0.75, water: 0.15, hydrocarbons: 0.25, weapons: 0.2}},

      'black market':      {produces: {narcotics: 0.2, weapons: 0.2}, price: {narcotics: 0.5, weapons: 0.7}},
      'tech hub':          {produces: {electronics: 0.2}, price: {machines: 0.9, electronics: 0.65, cybernetics: 0.8, addons: 0.7}},
      'manufacturing hub': {produces: {machines: 0.2}, price: {machines: 0.7, cybernetics: 0.9, addons: 0.8}},
      'capitol':           {produces: {medicine: 0.1}, consumes: {weapons: 0.1}, price: {addons: 0.9}},
      'military':          {produces: {}, consumes: {weapons: 0.8, machines: 0.5, electronics: 0.25, medicine: 0.2}, price: {addons: 0.7}},
    },

    // TODO: risk of injury
    work: [
      {
        name:    "Food production",
        avail:   ["mineral rich", "rocky", "subterranean"],
        rewards: ["food"],
        pay:     3,
        desc:    `
          Whether harvesting produce in an open field on Earth, tending an
          acrid fungal orchard orbiting Enceladus, or producing prepackaged,
          processed foods in a factory on Ceres, the task of producing of enough
          food to feed the entire human population is always in need of day
          laborers.
        `,
      },
      {
        name:    "Mine ore",
        avail:   ["mineral rich", "rocky", "subterranean"],
        rewards: ["ore", "minerals"],
        pay:     4,
        desc:    `
          Automated heavy excavating equipment deep underground carries tonnes
          of material to the surface. The arduous task of breaking and sorting
          the product is left to humans.
        `,
      },
      {
        name:    "Harvest water ice",
        avail:   ["icy", "water rich"],
        rewards: ["water", "minerals"],
        pay:     6,
        desc:    `
          Water ice is available on the surface of many moons and planets
          throughout the system. It is occassionally found alongside valuable or
          useful mineral deposits. It is a back-breaking job that, by definition,
          is performed in freezing temperatures. Although automation helps some,
          the heat generated by excavators makes the product more difficult to
          contain and transport. The result is regular demand for able-bodied
          workers to break and process ice.
        `,
      },
      {
        name:    "Asteroid mining",
        avail:   ["asteroids"],
        rewards: ["ore", "minerals"],
        pay:     8,
        desc:    `
          Called the "Tiara of Ceres" (at least by the marketing departments of
          the various mining interests stationed there), the asteroid belt
          provides exquisitely easy access to enough raw material to supply all
          of human industry for millenia. Automated excavators tunnel down into
          the rock, fracturing large fragments in the hunt for a vein of
          something profitable. Smaller, human-piloted mechs can then process
          the floating fragment and haul the raw material back to the ship.
        `,
      },
      {
        name:    "Harvest ring ice",
        avail:   ["ringed system"],
        rewards: ["water", "hydrocarbons", "minerals"],
        pay:     10,
        desc:    `
          Water ice is available in plenty for the taking around the gas giants.
          While dangerous to harvest, water is the most commonly traded resource
          in the Solar System and is always in high demmand. The ring systems
          are also a valuable source of the hydrocarbons required to create
          fertile soil.
        `,
      },
    ],

    // TODO: faction production/consumption should probably be implemented as a
    // bonus/malus to weighting agent fabrication selection.
    factions: {
      'UN': {
        full_name: 'United Nations',
        capital:   'Earth',
        sales_tax: 0.105,
        patrol:    0.2,
        produces:  {electronics: 0.3, cybernetics: 0.1, medicine: 0.5},
        consumes:  {},
      },
      'MC': {
        full_name: 'Martian Commonwealth',
        capital:   'Mars',
        sales_tax: 0.085,
        patrol:    0.18,
        produces:  {machines: 0.2, electronics: 0.2, weapons: 0.2, metal: 0.2},
        consumes:  {},
      },
      'CERES': {
        full_name: 'The Most Serene Republic of Ceres',
        capital:   'Ceres',
        sales_tax: 0.04,
        patrol:    0.1,
        produces:  {fuel: 0.3, machines: 0.2},
        consumes:  {},
      },
      'JFT': {
        full_name: 'Jovian Free Traders',
        capital:   'Ganymede',
        sales_tax: 0.065,
        patrol:    0.12,
        produces:  {fuel: 0.5, food: 0.25, metal: 0.1, ceramics: 0.1},
        consumes:  {},
      },
      'TRANSA': {
        full_name: 'Trans-Neptunian Authority',
        capital:   'Pluto',
        sales_tax: 0.0175,
        patrol:    0.03,
        produces:  {fuel: 0.5, narcotics: 0.5, weapons: 0.5},
        consumes:  {},
      },
    },

    bodies: {
      mercury: {
        name:    'Mercury',
        size:    'small',
        traits:  ['subterranean', 'rocky', 'mineral rich', 'water poor', 'hydrocarbon poor', 'manufacturing hub'],
        faction: 'UN',
      },
      earth: {
        name:    'Earth',
        size:    'huge',
        traits:  ['habitable', 'orbital', 'rocky', 'water rich', 'capitol'],
        faction: 'UN',
      },
      moon: {
        name:    'Luna',
        size:    'large',
        traits:  ['domed', 'subterranean', 'rocky', 'water poor', 'hydrocarbon poor'],
        faction: 'UN',
      },
      mars: {
        name:    'Mars',
        size:    'large',
        traits:  ['domed', 'subterranean', 'orbital', 'rocky', 'water poor', 'mineral rich', 'hydrocarbon poor', 'tech hub', 'capitol'],
        faction: 'MC',
      },
      ceres: {
        name:    'Ceres',
        size:    'large',
        traits:  ['subterranean', 'rocky', 'asteroids', 'mineral rich', 'black market', 'capitol'],
        faction: 'CERES',
        gravity: 0.35,
      },
      europa: {
        name:    'Europa',
        size:    'small',
        traits:  ['subterranean', 'rocky', 'mineral rich'],
        faction: 'JFT',
      },
      callisto: {
        name:    'Callisto',
        size:    'normal',
        traits:  ['domed', 'subterranean', 'orbital', 'rocky', 'agricultural'],
        faction: 'MC',
      },
      ganymede: {
        name:    'Ganymede',
        size:    'large',
        traits:  ['domed', 'subterranean', 'orbital', 'rocky', 'mineral poor', 'agricultural', 'capitol'],
        faction: 'JFT',
      },
      enceladus: {
        name:    'Enceladus Depot',
        size:    'small',
        traits:  ['orbital', 'ringed system', 'icy', 'water rich', 'mineral poor', 'hydrocarbon rich', 'military'],
        faction: 'TRANSA',
        gravity: 0.5,
      },
      rhea: {
        name:    'Rhea Orbital Lab',
        size:    'small',
        traits:  ['orbital', 'ringed system', 'icy', 'water rich', 'mineral poor', 'tech hub'],
        faction: 'JFT',
        gravity: 0.5,
      },
      titan: {
        name:    'Titan',
        size:    'small',
        traits:  ['domed', 'ringed system', 'icy', 'hydrocarbon rich', 'black market'],
        faction: 'TRANSA',
      },
      triton: {
        name:    'Triton Command',
        size:    'small',
        traits:  ['orbital', 'icy', 'water rich', 'mineral poor', 'black market', 'military'],
        faction: 'TRANSA',
        gravity: 0.5,
      },
      titania: {
        name:    'Titania Outpost',
        size:    'normal',
        traits:  ['subterranean', 'ringed system', 'icy', 'rocky', 'mineral rich', 'black market', 'manufacturing hub'],
        faction: 'TRANSA',
        gravity: 0.235,
      },
      pluto: {
        name:    'Pluto',
        size:    'small',
        traits:  ['subterranean', 'rocky', 'icy', 'mineral rich', 'black market', 'capitol'],
        faction: 'TRANSA',
      }
    },

    drives: {
      ion: {
        name:      'Ion',
        thrust:    400,
        mass:      10,
        desc:      'Ion thrusters are commodity, inexpensive, and efficient. Bolted on by the dozen, they are the work horse of the cargo fleet.',
        burn_rate: 0.005,
        value:     900,
      },
      fusion: {
        name:      'Fusion',
        thrust:    5000,
        mass:      40,
        desc:      'Condensed pellets of fuel, ignited by a laser or maser, produce vast amouts of plasma which is then directed by magnetic fields to produce thrust. Expensive enough to maintain and keep fueled to make it impractical for most hauler operations, it is the favored drive for military vessels.',
        burn_rate: .073,
        value:     75000,
      }
    },

    shipclass: {
      /* Civilian */
      shuttle:     {hull: 2,  armor: 0,  cargo: 2,  hardpoints: 0,  mass: 100,   tank: 1,   drives: 1,  drive: 'ion',    restricted: false},
      schooner:    {hull: 4,  armor: 2,  cargo: 14, hardpoints: 1,  mass: 400,   tank: 3,   drives: 2,  drive: 'ion',    restricted: false},

      /* Merchant */
      hauler:      {hull: 4,  armor: 2,  cargo: 30, hardpoints: 2,  mass: 500,   tank: 4,   drives: 4,  drive: 'ion',    restricted: false},
      merchantman: {hull: 6,  armor: 4,  cargo: 40, hardpoints: 3,  mass: 700,   tank: 6,   drives: 6,  drive: 'ion',    restricted: false},
      freighter:   {hull: 8,  armor: 6,  cargo: 50, hardpoints: 3,  mass: 900,   tank: 8,   drives: 10, drive: 'ion',    restricted: false},

      /* Military */
      corvette:    {hull: 10, armor: 10, cargo: 10, hardpoints: 4,  mass: 450,   tank: 4,   drives: 1,  drive: 'fusion', restricted: 'Trusted', markets: ['capitol', 'military']},
      cruiser:     {hull: 20, armor: 15, cargo: 15, hardpoints: 8,  mass: 900,   tank: 12,  drives: 4,  drive: 'fusion', restricted: 'Admired', markets: ['capitol', 'military']},
      battleship:  {hull: 30, armor: 20, cargo: 20, hardpoints: 10, mass: 1200,  tank: 14,  drives: 6,  drive: 'fusion', restricted: 'Admired', markets: ['capitol', 'military']},

      /* Faction ships */
      fortuna:     {hull: 8,  armor: 6,  cargo: 50, hardpoints: 1,  mass: 1000,  tank: 8,   drives: 14, drive: 'ion',    restricted: 'Respected', faction: 'JFT'},
      neptune:     {hull: 14, armor: 10, cargo: 40, hardpoints: 4,  mass: 700,   tank: 10,  drives: 10, drive: 'ion',    restricted: 'Respected', faction: 'TRANSA', markets: ['capitol', 'military']},
      barsoom:     {hull: 20, armor: 20, cargo: 25, hardpoints: 6,  mass: 600,   tank: 8,   drives: 2,  drive: 'fusion', restricted: 'Admired',   faction: 'MC',     markets: ['capitol', 'military']},
    },

    ship: {
      hull:  {repair: 50},
      armor: {repair: 200},
    },

    /*
     * keys:
     *    armor, mass, cargo, etc: bonus or malus to existing ship attributes
     *    reload    : combat turns between use
     *    magazine  : number of uses per reload
     *    rate      : rate of fire (uses per turn after reload)
     *    damage    : max damage against enemy vessel
     *    intercept : chance of intercepting and disabling a missile
     *    dodge     : chance of dodging a projectile (or reducing its accuracy or range)
     */
    addons: {
      cargo_pod: {
        name:       'External cargo pod',
        desc:       'Welds additional cargo units onto the outer hull, increasing total cargo space but reducing the effectiveness of armor.',
        mass:       5,
        cargo:      10,
        armor:      -1,
        dodge:      -0.25,
        stealth:    -0.2,
        price:      12500,
      },
      fuel_tank: {
        name:       'Auxiliary fuel tank',
        desc:       'Installs a supplementary fuel tank in the cargo bay, trading storage for range.',
        mass:       1,
        tank:       4,
        cargo:      -4,
        price:      16000,
      },
      ion: {
        name:       'Ion drive',
        desc:       'Adds an additionl pair of ion drives to the hull, increasing thrust. Care must be taken not to unbalance the ship, however.',
        mass:       20,
        thrust:     1600,
        burn_rate:  0.01,
        price:      8000,
      },
      fusion: {
        name:       'Fusion drive',
        desc:       'Somewhat reduced in efficiency when installed as a set of external pods, adding a fusion drive to an existing craft can drastically increase thrust and manuevering.',
        mass:       80,
        thrust:     7200,
        burn_rate:  0.088,
        price:      70000,
        restricted: 'Trusted',
      },
      railgun_turret: {
        name:       'Rail gun turret',
        desc:       'A military-grade rail gun turret, magnetically accelerating 100kg rounds at an appreciable fraction of the speed of light.',
        mass:       15,
        damage:     1,
        reload:     1,
        rate:       3,
        magazine:   6,
        price:      85000,
        restricted: 'Trusted',
        markets:    ['military', 'capitol'],
      },
      railgun_cannon: {
        name:       'Rail gun cannon',
        desc:       "More powerful than it's smaller cousin, a rail gun cannon fires heavier slugs of denser material, resulting in more energy released on impact.",
        mass:       30,
        damage:     3,
        reload:     2,
        rate:       1,
        magazine:   1,
        price:      105000,
        restricted: 'Admired',
        markets:    ['military', 'capitol'],
      },
      light_torpedo: {
        name:          'Light torpedo launcher',
        desc:          'Adds a torpedo launcher tube suitable for low yield, self-guided payloads.',
        mass:          20,
        damage:        3,
        reload:        2,
        rate:          1,
        magazine:      2,
        interceptable: true,
        price:         25000,
        restricted:    'Friendly',
      },
      medium_torpedo: {
        name:          'Medium torpedo launcher',
        desc:          'Adds a torpedo launcher tube suitable for moderate yield, self-guided payloads.',
        mass:          40,
        damage:        5,
        reload:        2,
        rate:          1,
        magazine:      1,
        interceptable: true,
        price:         37500,
        restricted:    'Trusted',
        markets:       ['military', 'capitol'],
      },
      heavy_torpedo: {
        name:          'Heavy torpedo launcher',
        desc:          'Adds a torpedo launcher tube suitable for high yield, self-guided payloads.',
        mass:          60,
        damage:        7,
        reload:        2,
        rate:          1,
        magazine:      1,
        interceptable: true,
        price:         50000,
        restricted:    'Admired',
        markets:       ['military', 'capitol'],
      },
      pds: {
        name:       'PDS',
        desc:       'Mounts a computer-controlled network of small, magnetically propelled, point defense turrets around the ship to stop incoming torpedos at a safe range.',
        mass:       5,
        damage:     0.05,
        intercept:  0.25,
        reload:     1,
        rate:       10,
        magazine:   40,
        price:      25500,
        restricted: 'Friendly',
      },
      ecm: {
        name:       'ECM',
        desc:       "Electronic counter-measures generate randomized, electromagnetic interference and false signals to confuse an enemy's targeting systems.",
        mass:       1,
        intercept:  0.1,
        dodge:      0.2,
        stealth:    0.2,
        price:      45000,
        restricted: 'Admired',
        markets:    ['military', 'capitol'],
      },
      stealthPlating: {
        name:       "Adaptive hull plating",
        desc:       "This Martian technology, originally designed as part of an adaptive camouflage system for ground forces' power armor, alters the absorbtive range of the ships' outer hull to absorb EM radiation, making it effectively invisible except at very close range.",
        mass:       100,
        dodge:      0.05,
        stealth:    0.5,
        armor:      -1,
        price:      125000,
        restricted: 'Admired',
        markets:    ['military', 'capitol'],
      },
    }
  };

  /*
   * Descriptions
   */
  data.factions.UN.desc           = "After the outbreak of hostilities with Mars more than 80 years ago and the treaties that followed, the UN assumed the role of the unified sovereign government over the Earth, Moon, and Mercury. Known for its glacial bureaucracy and stodgy leaders, Earth remains an economic powerhouse, largly as a result of remaining the sole inhabitable body in the system.| Despite the fragile treaty after the War of Martian Independence, the UN member nations continue to see Mars as selfish and ungrateful.";
  data.factions.MC.desc           = "Nearly 50 years after its founding as a science outpost in the early 22nd century, Mars declared independence from an Earth that it increasingly viewed as a distant, intrusive micromanager. In the 84 years since its founding, Mars has grown into a military power rivaling Earth, with a thriving economy and highly educated populace. Since its independence, Mars has focused its significant resources toward the scientific and technological achievements necessary to realize its population's dream of a \"Green Mars\".|The Martian Commonwealth controls Mars and its moons as well as several of the Jovian moons, providing the infrastructure and resource to maintain and grow their subterranean and domed habitats, whose proximity to the radiant gas giant make them the bread basket of the outer planets.";
  data.factions.TRANSA.desc       = "Those who live in the outer planets are exquisitely aware of the fragile existence they lead, completely dependent on shipments of food, water, medicine, and technology in order to survive.|When Mars broke from Earth, deliveries to the furthest installations in the outer system ceased in the face of privateering and the realities of a war economy. Those who survived the food riots shortly found themselves under the unforgiving magnetic boot of the corporate security forces originally contracted to protect and police the scientific mission stationed on Pluto.|Collectively calling themselves the Trans-Neptunian Authority, they quickly restored order and set to work building a strict, tightly controlled, society with the ultimate goal of achieving self-sufficiency.|With resources stretched and hungry mouths to feed, TRANSA offers the lowest tax rate in the system, promising a hefty margin to any traders willing to make the \"Long Haul\", as it is popularly known. Given the size of TRANSA's tiny fleet and the vast volume of space it patrols, the Long Haul can as be perilous as it is profitable.";
  data.factions.CERES.desc        = "Holding a favorable position orbiting within the asteroid belt, the independent planetoid Ceres has long served as a trade hub between the inner and outer planets. Its location also serves to make it a launching point for mining operations within the asteroid belt.|A number of shipyards have grown up around Ceres, taking advantage of the central location and ease of access to materials to make Ceres the primary ship-bulding center in the system."
  data.factions.JFT.desc          = "Faced with the same economic constraints and pressures as the outer planets during the war but with much closer and more powerful corporate interests at hand, the Saturnian moons controlling interests joined to form the Jovian Free Traders collective. Funded by some of the richest corporations on Earth, the JFT has become a force unto itself, patrolling the outer planets' trade routes with its corporate fleet.|Life in the domes of Saturn is difficult, and the harvesting of ice and ore in the outer system is dangerous work, but citizen employees can rest assured that the Board of Directors has their best interests at heart, or at least their compound interest at heart, as many are bound by contract or debt to their Syndicate.";

  data.bodies.mercury.desc        = "Too close to the sun to permit domed habitations, Mercury's single city, Quicksilver, lies deep underground, providing it with a modicum of protection against the intense solar radiation bathing the surface.|Known for its rich mineral deposits and hard-nosed populace, the knowledge gained during the process of excavating and settling Mercury was a major factor in the success of later colonies. Although nominally a member of the UN, Mercury is widely known to be effectively run by the unions, who work to ensure that Mercury is not unfairly exploited by Earth. Nobody messes with the local 127.";
  data.bodies.earth.desc          = "Under the unified governance of the UN, Earth has been at peace for decades. As the sole habital body in the system, Earth remains the largest population, economy, and military force in the system.";
  data.bodies.moon.desc           = "A natural target for the first extension of humanity into space, the Moon's domed cities and vast, subterranean passages hold the second largest population in the system as well as some of its best shipyards.|With its lower gravity, excellent amenities, and close proximity to Earth, Luna hosts the official embassies of both the Martian Commonwealth and TRANSA.";
  data.bodies.mars.desc           = "Rising from the ashes of the Earth fleet's systematic bombardment during the war for independence, the Martian capitol of Barsoom is home to the most widely respected universities and scientific institutions in the system.|The memories of those scars still fresh, Mars continues to sink a sizable proportion of its resources into its fleet and planetary defenses. Although smaller than the UN fleet, the Martian navy's vessels are newer and have a small but not inconsiderable tech advantage on Earth's aging ships.";
  data.bodies.ceres.desc          = "Large enough to be given a comfortable spin gravity of more than a third of Earth, the hollowed out planetoid Ceres is a major shipping and commercial hub between the inner and outer planets.";
  data.bodies.europa.desc         = "One of the two Jovian moons claimed by the JFT during the war, Europa's mines provide the backbone of the JFT's trade in raw materials.";
  data.bodies.callisto.desc       = "Callisto's vast domed farms produce tons of food that are shipped across the system, supporting many of the outer colonies that cannot produce enough food to be self sufficient. It also hosts the regional Martian command orbital and dock yards.";
  data.bodies.ganymede.desc       = "The official headquarters of the JFT, Ganymede also hosts excellent agricultural facilities and shipyards, making it a commercial hub of the outer system.";
  data.bodies.enceladus.desc      = "The supply station orbiting Enceladus boasts the best views in the system and is the nexus for the harvesting and shipping of water from Saturn's rings.";
  data.bodies.rhea.desc           = "The Rhea Orbital Lab is the primary research and development platform of the JFT and maintains a small population serving the needs of the research community there.";
  data.bodies.titan.desc          = "With an actual atmosphere, albeit a poisonous one, Titan is home to TRANSA's largest and most prosperous settlement. Nestled in close proximity to JFT's orbital around Saturn, Titan has become a minor trade hub between the two factions.";
  data.bodies.triton.desc         = "In retrograde orbit of Neptune, the Triton orbital hosts the meager Plutonian Naval Command and acts as their primary supply station.";
  data.bodies.titania.desc        = "Rich in heavy organic compounds, Titania is the primary source of raw materials and shipping for TRANSA. When the war began, the process of spinning up Titania was nearly halfway complete. With nearly a quarter of Earth's gravity and supported by a growing commercial mining industry, it is also one of the few TRANSA settlements with a growing population.";
  data.bodies.pluto.desc          = "The furthest outpost of humanity, Pluto is home to the TRANSA high command. It's deeply excavated chambers support a surprisingly robust population, many descended from the original scientific mission team stationed on the dwarf planet at the outset of the Martian rebellion.";

  data.shipclass.fortuna.desc     = "Named for the daughter of Jupiter, the Fortuna is a container ship optimized to carry larger loads at higher efficiency than a typical freighter.";
  data.shipclass.barsoom.desc     = "The Barsoomian class frigate adopts the latest advances in Martian technology resulting in a frigate class ship with more range, speed, and enough firepower to act as its own escort.";
  data.shipclass.neptune.desc     = "Designed and built in TRANSA's own shipyards, the Neptune class cargo hauler has the longest range of any vessel while retaining low mass and reasonable cargo space. A favorite of traders and smugglers on the Long Haul alike, it has the armor and hard points to defend itself in the unguarded outer oribts.";

  return data;
});
