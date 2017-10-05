/*
 * Masses in metric tonnes (t)
 * Thrust in kiloNewtons
 */
const data = {
  start_date      : new Date(2242, 0, 1, 1),
  hours_per_turn  : 4,
  initial_turns   : 600,
  market_history  : 45,
  base_unit_price : 100,
  scarcity_markup : 0.3,
  necessity       : {water: true, food: true, medicine: true, fuel: true},
  craft_fee       : 0.05,
  fabricators     : 40,
  fab_health      : 20,
  base_pay        : 80, // credits/day
  grav_deltav_factor : 2.5, // factor by which native gravity is multiplied to get player's sustained deltav tolerance

  scales: {
    tiny   : 0.6,
    small  : 0.8,
    normal : 1,
    large  : 1.2,
    huge   : 1.4
  },

  resources: {
    water        : {mass: 10, mine: {tics: 2}},
    ore          : {mass: 60, mine: {tics: 3}},
    minerals     : {mass: 50, mine: {tics: 3}},
    hydrocarbons : {mass: 8,  mine: {tics: 4}},
    food         : {mass: 30, mine: {tics: 5}, recipe: {tics: 3, materials: {water: 1, minerals: 1, hydrocarbons: 2}}},
    fuel         : {mass: 4,  recipe: {tics: 2, materials: {minerals: 1}}},
    metal        : {mass: 90, recipe: {tics: 2, materials: {ore: 4}}},
    ceramics     : {mass: 30, recipe: {tics: 3, materials: {minerals: 1, water: 1}}},
    medicine     : {mass: 10, recipe: {tics: 4, materials: {food: 1, hydrocarbons: 1}}},
    machines     : {mass: 75, recipe: {tics: 4, materials: {metal: 2, ceramics: 1}}},
    electronics  : {mass: 20, recipe: {tics: 5, materials: {ceramics: 2, minerals: 1}}},
    cybernetics  : {mass: 80, recipe: {tics: 6, materials: {metal: 1, ceramics: 1, machines: 1, electronics: 1}}}
  },

  market: {
    agents      : 2,
    fabricators : 2,
    minability  : 0.25,
    produces    : {},
    consumes    : {water: 1, food: 1}
  },

  traits: {
    'mineral rich'     : {produces: {ore:    0.5, minerals:  0.5}, consumes: {}},
    'mineral poor'     : {produces: {ore:   -0.5, minerals: -0.25}, consumes: {}},
    'water rich'       : {produces: {water:  0.5}, consumes: {}},
    'water poor'       : {produces: {water: -0.5}, consumes: {}},
    'hydrocarbon rich' : {produces: {hydrocarbons: 0.5, minerals: 0.2}, consumes: {}},
    'hydrocarbon poor' : {produces: {hydrocarbons: -0.5, minerals: -0.2}, consumes: {}},

    'asteroids'        : {produces: {ore:   1.0, minerals: 0.75}, consumes: {}},
    'rocky'            : {produces: {ore:   0.6, minerals: 0.5} , consumes: {}},
    'icy'              : {produces: {water: 0.8, minerals: 0.35, hydrocarbons: 0.2}, consumes: {}},

    'agricultural'     : {produces: {food: 0.3, hydrocarbons: 0.1}, consumes: {machines: 0.2, fuel: 0.025, water: 0.2, hydrocarbons: 0.4}},
    'habitable'        : {produces: {food: 0.7, hydrocarbons: 0.3}, consumes: {}},
    'domed'            : {produces: {food: 0.1, hydrocarbons: 0.05}, consumes: {fuel: 0.2, electronics: 0.05, machines: 0.05, water: 0.1, hydrocarbons: 0.2}},
    'subterranean'     : {produces: {}, consumes: {fuel: 0.1, electronics: 0.05, machines: 0.05}},
    'orbital'          : {produces: {}, consumes: {fuel: 0.3, electronics: 0.1, machines: 0.1}}
  },

  conditions: {
    drought : {produces: {}, consumes: {}},
    famine  : {produces: {}, consumes: {}},
    plague  : {produces: {}, consumes: {}},
    war     : {produces: {}, consumes: {}},
  },

  factions: {
    'UN': {
      full_name : 'United Nations',
      capital   : 'Earth',
      sales_tax : 0.1135,
      patrol    : 0.07,
      ship      : 'trader'
    },
    'MC': {
      full_name : 'Martian Commonwealth',
      capital   : 'Mars',
      sales_tax : 0.0925,
      patrol    : 0.99,
      ship      : 'barsoom'
    },
    'CC': {
      full_name : 'Ceres Corporation',
      capital   : 'Ceres',
      sales_tax : 0.065,
      patrol    : 0.05,
      ship      : 'trader'
    },
    'UTC': {
      full_name : 'United Trade Collective',
      capital   : 'Ganymede',
      sales_tax : 0.0822,
      patrol    : 0.05,
      ship      : 'trader'
    },
    'TRANSA': {
      full_name : 'Trans-Neptunian Authority',
      capital   : 'Pluto',
      sales_tax : 0.025,
      patrol    : 0.02,
      ship      : 'neptune'
    },
  },

  bodies: {
    mercury: {
      name     : 'Mercury',
      size     : 'small',
      traits   : ['subterranean', 'rocky', 'mineral rich', 'water poor'],
      faction  : 'UN',
      gravity  : 0.377
    },
    earth: {
      name     : 'Earth',
      size     : 'huge',
      traits   : ['habitable', 'orbital', 'rocky', 'water rich'],
      faction  : 'UN',
      gravity  : 1.0
    },
    moon: {
      name     : 'Luna',
      size     : 'large',
      traits   : ['domed', 'subterranean', 'rocky', 'water poor'],
      faction  : 'UN',
      gravity  : 0.165
    },
    mars: {
      name     : 'Mars',
      size     : 'large',
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'water poor', 'mineral rich'],
      faction  : 'MC',
      gravity  : 0.378
    },
    phobos: {
      name     : 'Phobos Science Station',
      size     : 'small',
      traits   : ['subterranean', 'rocky', 'water poor'],
      faction  : 'MC',
      gravity  : 0.7
    },
    deimos: {
      name     : 'Deimos Command',
      size     : 'tiny',
      traits   : ['subterranean', 'rocky', 'water poor'],
      faction  : 'MC',
      gravity  : 1.05
    },
    ceres: {
      name     : 'Ceres',
      size     : 'large',
      traits   : ['subterranean', 'rocky', 'asteroids'],
      faction  : 'CC',
      gravity  : 0.75
    },
    europa: {
      name     : 'Europa',
      size     : 'small',
      traits   : ['subterranean', 'rocky'],
      faction  : 'MC',
      gravity  : 0.134
    },
    callisto: {
      name     : 'Callisto',
      size     : 'normal',
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'agricultural'],
      faction  : 'MC',
      gravity  : 0.126
    },
    ganymede: {
      name     : 'Ganymede',
      size     : 'large',
      traits   : ['domed', 'subterranean', 'orbital', 'rocky', 'mineral poor', 'agricultural'],
      faction  : 'UTC',
      gravity  : 0.146
    },
    enceladus: {
      name     : 'Enceladus Depot',
      size     : 'small',
      traits   : ['orbital', 'icy', 'water rich', 'mineral poor', 'hydrocarbon rich'],
      faction  : 'UTC',
      gravity  : 0.7
    },
    rhea: {
      name     : 'Rhea Orbital Lab',
      size     : 'small',
      traits   : ['orbital', 'icy', 'water rich', 'mineral poor'],
      faction  : 'UTC',
      gravity  : 0.7
    },
    titan: {
      name     : 'Titan',
      size     : 'normal',
      traits   : ['domed', 'icy', 'water rich', 'hydrocarbon rich'],
      faction  : 'TRANSA',
      gravity  : 0.14
    },
    triton: {
      name     : 'Triton Command',
      size     : 'small',
      traits   : ['orbital', 'icy', 'water rich', 'mineral poor'],
      faction  : 'TRANSA',
      gravity  : 0.7
    },
    titania: {
      name     : 'Titania Outpost',
      size     : 'small',
      traits   : ['subterranean', 'icy', 'rocky', 'hydrocarbon rich'],
      faction  : 'TRANSA',
      gravity  : 0.39
    },
    pluto: {
      name     : 'Pluto',
      size     : 'small',
      traits   : ['domed', 'subterranean', 'rocky', 'water rich'],
      faction  : 'TRANSA',
      gravity  : 0.063
    }
  },

  drives: {
    ion: {
      name      : 'Ion',
      thrust    : 1200,
      mass      : 10,
      desc      : 'Ion thrusters are commodity, inexpensive, and efficient. Bolted on by the dozen, they are the work horse of the cargo fleet.',
      burn_rate : 0.002,
    },
    fusion: {
      name      : 'Fusion',
      thrust    : 5000,
      mass      : 40,
      desc      : 'Condensed pellets of fuel, ignited by a laser or maser, produce vast amouts of plasma which is then directed by magnetic fields to produce thrust. Expensive enough to maintain and keep fueled to make it impractical for most hauler operations, it is the favored drive for military vessels.',
      burn_rate : 0.05,
    }
  },

  shipclass: {
    /* Civilian */
    shuttle     : {hull: 3,  armor: 1,  cargo: 2,   hardpoints: 0,  mass: 200,   tank: 2,   drives: 1,   drive: 'ion',    restricted: false},
    cutter      : {hull: 4,  armor: 2,  cargo: 6,   hardpoints: 1,  mass: 250,   tank: 2,   drives: 2,   drive: 'ion',    restricted: false},
    yacht       : {hull: 6,  armor: 2,  cargo: 6,   hardpoints: 2,  mass: 300,   tank: 4,   drives: 3,   drive: 'ion',    restricted: false},
    schooner    : {hull: 8,  armor: 4,  cargo: 10,  hardpoints: 2,  mass: 450,   tank: 6,   drives: 4,   drive: 'ion',    restricted: false},

    /* Merchant */
    trader      : {hull: 4,  armor: 1,  cargo: 25,  hardpoints: 2,  mass: 2500,  tank: 30,  drives: 30,  drive: 'ion',    restricted: false},
    merchantman : {hull: 7,  armor: 2,  cargo: 30,  hardpoints: 3,  mass: 4000,  tank: 60,  drives: 50,  drive: 'ion',    restricted: false},
    freighter   : {hull: 10, armor: 3,  cargo: 50,  hardpoints: 3,  mass: 6800,  tank: 110, drives: 80,  drive: 'ion',    restricted: false},
    hauler      : {hull: 20, armor: 5,  cargo: 100, hardpoints: 5,  mass: 10000, tank: 150, drives: 100, drive: 'ion',    restricted: false},

    /* Military */
    transport   : {hull: 40, armor: 10, cargo: 50,  hardpoints: 6,  mass: 8000,  tank: 180, drives: 220, drive: 'ion',    restricted: true},
    corvette    : {hull: 25, armor: 5,  cargo: 10,  hardpoints: 4,  mass: 550,   tank: 25,  drives: 2,   drive: 'fusion', restricted: true},
    frigate     : {hull: 30, armor: 5,  cargo: 30,  hardpoints: 6,  mass: 800,   tank: 30,  drives: 4,   drive: 'fusion', restricted: true},
    destroyer   : {hull: 45, armor: 12, cargo: 12,  hardpoints: 8,  mass: 1100,  tank: 40,  drives: 8,   drive: 'fusion', restricted: true},
    cruiser     : {hull: 60, armor: 15, cargo: 15,  hardpoints: 10, mass: 1850,  tank: 100, drives: 16,  drive: 'fusion', restricted: true},
    battleship  : {hull: 85, armor: 25, cargo: 20,  hardpoints: 16, mass: 2300,  tank: 140, drives: 20,  drive: 'fusion', restricted: true},

    /* Faction ships */
    neptune     : {hull: 10, armor: 4,  cargo: 40,  hardpoints: 3,  mass: 3200,  tank: 40,  drives: 30,  drive: 'ion',    restricted: true, faction: 'TRANSA'},
    barsoom     : {hull: 35, armor: 6,  cargo: 30,  hardpoints: 4,  mass: 600,   tank: 30,  drives: 4,   drive: 'fusion', restricted: true, faction: 'MC'}
  },

  /*
   * keys:
   *    reload    : combat turns between use
   *    rate      : rate of fire (uses per turn after reload)
   *    damage    : max damage against enemy vessel
   *    intercept : chance of intercepting and disabling a missile
   */
  shipAddOns: {
    cargoPod: {
      name      : 'External cargo pod',
      desc      : 'Welds an additional cargo hold onto the outer hull, increasing total cargo space but reducing armor.',
      hdpts     : 1,
      mass      : 10,
      cargo     : 20,
      armor     : -2
    },
    pds: {
      name      : 'Point defense system',
      desc      : 'Mounts a computer-controlled network of small, magnetically propelled, point defense turrets around the ship to stop incoming torpedos at a safe range.',
      hdpts     : 1,
      mass      : 5,
      damage    : 1,
      intercept : 0.75,
      reload    : 1,
      rate      : 2
    },
    railgun: {
      name      : 'Rail gun',
      desc      : 'A military-grade rail gun turret, magnetically accelerating 100kg rounds at an appreciable fraction of the speed of light.',
      hdpts     : 1,
      mass      : 15,
      damage    : 10,
      reload    : 1,
      rate      : 1
    },
    torpedo: {
      name      : 'Torpedo tube',
      desc      : 'Adds a self-guided torpedo launcher. torpedos sold separately.',
      hdpts     : 1,
      mass      : 20,
      damage    : 10,
      reload    : 4,
      rate      : 1
    },
    ecm: {
      name      : 'Electronic counter-measures',
      desc      : 'Generates electromagnetic interference and false signals to confuse an enemy\'s targeting systems.',
      hdpts     : 1,
      mass      : 1,
      intercept : 0.15,
      dodge     : 0.45,
      reload    : 1,
      rate      : 2
    }
  }
};

/*
 * Descriptions
 */
data.factions.UN.desc     = "After the outbreak of hostilities with Mars more than 80 years ago and the treaties that followed, the UN assumed the role of the unified sovereign government over the Earth, Moon, and Mercury. Known for its glacial bureaucracy and stodgy leaders, Earth remains an economic powerhouse, largly as a result of remaining the sole inhabitable body in the system.| Despite the fragile treaty after the War of Martian Independence, the UN member nations continue to see Mars as selfish and ungrateful.";
data.factions.MC.desc     = "Nearly 50 years after its founding as a science outpost in the early 22nd century, Mars declared independence from an Earth that it increasingly viewed as a distant, intrusive micromanager. In the 84 years since its founding, Mars has grown into a military power rivaling Earth, with a thriving economy and highly educated populace. Since its independence, Mars has focused its significant resources toward the scientific and technological achievements necessary to realize its population's dream of a \"Green Mars\".|The Martian Commonwealth controls Mars and its moons as well as several of the Jovian moons, providing the infrastructure and resource to maintain and grow their subterranean and domed habitats, whose proximity to the radiant gas giant make them the bread basket of the outer planets.";
data.factions.TRANSA.desc = "Those who live in the outer planets are exquisitely aware of the fragile existence they lead, completely dependent on shipments of food, water, medicine, and technology in order to survive.|When Mars broke from Earth, deliveries to the furthest installations in the outer system ceased in the face of privateering and the realities of a war economy. Those who survived the food riots shortly found themselves under the unforgiving magnetic boot of the corporate security forces originally contracted to protect and police the scientific mission stationed on Pluto.|Collectively calling themselves the Trans-Neptunian Authority, they quickly restored order and set to work building a strict, tightly controlled, society with the ultimate goal of achieving self-sufficiency.|With resources stretched and hungry mouths to feed, TRANSA offers the lowest tax rate in the system, promising a hefty margin to any traders willing to make the \"Long Haul\", as it is popularly known. Given the size of TRANSA's tiny fleet and the vast volume of space it patrols, the Long Haul can as be perilous as it is profitable.";
data.factions.CC.desc     = "Holding a favorable position orbiting within the asteroid belt, the independent planetoid Ceres has long served as a trade hub between the inner and outer planets. Its location also serves to make it a launching point for mining operations within the asteroid belt.|A number of shipyards have grown up around Ceres, taking advantage of the central location and ease of access to materials to make Ceres the primary ship-bulding center in the system."
data.factions.UTC.desc    = "Faced with the same economic constraints and pressures as the outer planets during the war but with much closer and more powerful corporate interests at hand, the Saturnian moons controlling interests joined to form the United Trade Collective. Funded by some of the richest corporations on Earth, the UTC has become a force unto itself, patrolling the outer planets' trade routes with its corporate fleet.|Life in the domes of Saturn is difficult, and the harvesting of ice and ore in the outer system is dangerous work, but citizen employees can rest assured that the Board of Directors has their best interests at heart, or at least their compound interest at heart, as many are bound by contract or debt to their Syndicate.";

data.bodies.mercury.desc   = "Too close to the sun to permit domed habitations, Mercury's single city, Quicksilver, lies deep underground, providing it with a modicum of protection against the intense solar radiation bathing the surface.|Known for its rich mineral deposits and hard-nosed populace, the knowledge gained during the process of excavating and settling Mercury was a major factor in the success of later colonies. Although nominally a member of the UN, Mercury is widely known to be effectively run by the unions, who work to ensure that Mercury is not unfairly exploited by Earth. <i>Nobody</i> messes with the local 127.";
data.bodies.earth.desc     = "Under the unified governance of the UN, Earth has been at peace for decades. As the sole habital body in the system, Earth remains the largest population, economy, and military force in the system.";
data.bodies.moon.desc      = "A natural target for the first extension of humanity into space, the Moon's domed cities and vast, subterranean passages hold the second largest population in the system as well as some of its best shipyards.|With its lower gravity, excellent amenities, and close proximity to Earth, Luna hosts the official embassies of both the Martian Commonwealth and TRANSA.";
data.bodies.mars.desc      = "Rising from the ashes of the Earth fleet's systematic bombardment during the war for independence, the Martian capitol of Barsoom is home to the most widely respected universities and scientific institutions in the system.|The memories of those scars still fresh, Mars continues to sink a sizable proportion of its resources into its fleet and planetary defenses. Although smaller than the UN fleet, the Martian navy's vessels are newer and have a small but not inconsiderable tech advantage on Earth's aging ships.";
data.bodies.phobos.desc    = "More akin to a captured asteroid than a moon, Phobos was hollowed out, its spin increased, and made home to the largest research facility in the solar system.";
data.bodies.deimos.desc    = "Home to the Martian Commonwealth Navy, Deimos Command Station is well defended and hosts the primary Martian naval shipyard and officer's academy. With its much increased spin gravity, Deimos provides a sometimes uncomfortable but useful resource for training Martians under high gravity... not that they'd ever need that, since we are all friends now.";
data.bodies.ceres.desc     = "Large enough to be given a comfortable spin gravity of 0.75G, the hollowed out planetoid Ceres is a major shipping and commercial hub between the inner and outer planets.";
data.bodies.europa.desc    = "One of the two Jovian moons claimed by Mars during the war, Europa is the source of much mineral wealth to the Commonwealth and is patrolled by the Martian fleet.";
data.bodies.callisto.desc  = "Callisto's vast domed farms produce tons of food that are shipped across the system, supporting many of the outer colonies that cannot produce enough food to be self sufficient. It also hosts the regional Martian command orbital and dock yards.";
data.bodies.ganymede.desc  = "The official headquarters of the UTC, Ganymede also hosts excellent agricultural facilities and shipyards, making it a commercial hub of the outer system.";
data.bodies.enceladus.desc = "The supply station orbiting Enceladus boasts the best views in the system and is the nexus for the harvesting and shipping of water from Saturn's rings.";
data.bodies.rhea.desc      = "The Rhea Orbital Lab is the primary research and development platform of the UTC and maintains a small population serving the needs of the research community there.";
data.bodies.titan.desc     = "With an actual atmosphere, albeit a poisonous one, Titan is home to TRANSA's largest and most prosperous settlement. Nestled in close proximity to two UTC orbitals around Saturn, Titan has become something  of a trade hub between the two factions.";
data.bodies.triton.desc    = "In retrograde orbit of Neptune, the Triton orbital hosts the meager Plutonian Naval Command and acts as their primary supply station.";
data.bodies.titania.desc   = "Rich in heavy organic compounds, Titania is the primary source of raw materials and shipping for TRANSA. With nearly a third of Earth's gravity and supported by a growing commercial mining industry, it is also one of the few TRANSA properties with a growing population.";
data.bodies.pluto.desc     = "The furthest outpost of humanity, Pluto is home to the TRANSA high command. It's deeply excavated chambers support a surprisingly robust population, many descended from the original scientific mission team stationed on the dwarf planet at the outset of the Martian rebellion.";

data.shipclass.neptune.desc = "Designed and built in TRANSA's own shipyards, the Neptune class cargo hauler has the longest range of any vessel while retaining low mass and reasonable cargo space. A favorite of traders and smugglers on the Long Haul alike, it has the armor and hard points to defend itself in the unguarded outer oribts.";
data.shipclass.barsoom.desc = "The Barsoomian class frigate adopts the latest advances in Martian technology resulting in a frigate class ship with more range, speed, and enough firepower to act as its own escort.";
