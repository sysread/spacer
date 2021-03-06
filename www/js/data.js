define(["require", "exports"], function (require, exports) {
    "use strict";
    /*
     * Masses in metric tonnes (t)
     * Thrust in kiloNewtons
     * Production/consumption are *daily* rates
     */
    const hoursPerTurn = 8;
    const turnsPerDay = 24 / hoursPerTurn;
    const data = {
        start_date: new Date(2242, 0, 1, 1),
        hours_per_turn: hoursPerTurn,
        turns_per_day: turnsPerDay,
        initial_days: 365,
        resource_scale: 5.0,
        initial_stock: 100,
        market_history: 10 * turnsPerDay,
        scarcity_markup: 0.25,
        min_stock_count: 50,
        avg_stock_count: 250,
        max_imports: 6,
        max_crafts: 10,
        max_agents: 6,
        max_agent_money: 5000,
        min_agent_profit: 100,
        necessity: { water: true, atmospherics: true, food: true, medicine: true, fuel: true },
        craft_fee_nofab: 0.20,
        craft_fee: 0.05,
        fabricators: 5,
        fab_health: 5,
        grav_deltav_factor: 1.75,
        initial_ship: 'schooner',
        initial_money: 500,
        max_abs_standing: 100,
        jurisdiction: 0.28,
        piracy_max_velocity: 500,
        passenger_mission_count: 4,
        smuggler_mission_count: 2,
        scales: {
            tiny: 0.6,
            small: 0.8,
            normal: 1,
            large: 1.2,
            huge: 1.4
        },
        resources: {
            water: { mass: 80, mine: { tics: 1, value: 21 } },
            atmospherics: { mass: 20, mine: { tics: 1, value: 34 } },
            ore: { mass: 140, mine: { tics: 2, value: 26 } },
            minerals: { mass: 120, mine: { tics: 2, value: 33 } },
            hydrocarbons: { mass: 40, mine: { tics: 2, value: 45 } },
            food: { mass: 40, mine: { tics: 2, value: 100 }, recipe: { tics: 3, materials: { atmospherics: 1, water: 1, hydrocarbons: 1 } } },
            fuel: { mass: 30, recipe: { tics: 1, materials: { ore: 1, water: 1 } } },
            luxuries: { mass: 40, recipe: { tics: 5, materials: { water: 2, ore: 1, minerals: 1, hydrocarbons: 2 } } },
            metal: { mass: 160, recipe: { tics: 2, materials: { ore: 3 } } },
            ceramics: { mass: 100, recipe: { tics: 2, materials: { minerals: 3 } } },
            medicine: { mass: 20, recipe: { tics: 3, materials: { food: 1, hydrocarbons: 2 } } },
            machines: { mass: 140, recipe: { tics: 3, materials: { metal: 2 } } },
            electronics: { mass: 80, recipe: { tics: 3, materials: { ceramics: 5 } } },
            cybernetics: { mass: 240, recipe: { tics: 4, materials: { machines: 2, electronics: 2 } } },
            narcotics: { mass: 20, recipe: { tics: 2, materials: { medicine: 1, hydrocarbons: 1, water: 1 } }, contraband: 5 },
            weapons: { mass: 60, recipe: { tics: 4, materials: { metal: 4, ceramics: 1 } }, contraband: 7 },
        },
        market: {
            fabricators: 10,
            minability: 0.1,
            produces: {},
            consumes: { atmospherics: 0.75, water: 4, food: 3, medicine: 0.5, narcotics: 0.1, weapons: 0.2 },
        },
        traits: {
            'o2 rich atmosphere': { produces: { atmospherics: 1 }, consumes: {} },
            'mineral rich': { produces: { ore: 1.5, minerals: 1 }, consumes: {}, price: { minerals: 0.75, ore: 0.75 } },
            'mineral poor': { produces: { ore: -2, minerals: -1 }, consumes: {} },
            'water rich': { produces: { water: 2 }, consumes: {} },
            'water poor': { produces: { water: -1 }, consumes: {}, price: { water: 2 } },
            'hydrocarbon rich': { produces: { hydrocarbons: 2 }, consumes: {} },
            'hydrocarbon poor': { produces: { hydrocarbons: -2 }, consumes: { hydrocarbons: 2 } },
            'rocky': { produces: { ore: 2, minerals: 1 }, consumes: {}, price: { minerals: 0.75, ore: 0.75 } },
            'icy': { produces: { water: 3, minerals: 1, hydrocarbons: 1 }, consumes: {} },
            'asteroids': { produces: { ore: 4, minerals: 4 }, consumes: { fuel: 1.5, electronics: 0.3, machines: 1, cybernetics: 0.3 }, price: { ore: 0.75, minerals: 0.75 } },
            'ringed system': { produces: { water: 4, minerals: 1, hydrocarbons: 1 }, consumes: { fuel: 1.5, electronics: 0.3, machines: 0.5, cybernetics: 0.3 } },
            'agricultural': { produces: { food: 3, hydrocarbons: 1 }, consumes: { atmospherics: -0.25, machines: 0.5, fuel: 0.5, water: 2, hydrocarbons: 2 }, price: { food: 0.75, hydrocarbons: 1.5, water: 1.25 } },
            'habitable': { produces: { atmospherics: 3, food: 8, hydrocarbons: 3 }, consumes: { atmospherics: -0.5, food: 4, narcotics: 0.25, weapons: 0.5 }, price: { food: 0.5, hydrocarbons: 0.5, water: 1.25 } },
            'domed': { produces: { food: 0.5, hydrocarbons: 0.25 }, consumes: { metal: 0.6, fuel: 0.6, electronics: 0.5, machines: 0.5, water: 0.75, hydrocarbons: 0.75, weapons: 0.5 } },
            'subterranean': { produces: { food: 0.25, hydrocarbons: 0.25 }, consumes: { metal: 0.6, fuel: 0.3, electronics: 0.5, machines: 0.5, water: 0.3, hydrocarbons: 0.75, weapons: 0.35 } },
            'orbital': { produces: { food: 0.1, hydrocarbons: 0.1 }, consumes: { metal: 1, fuel: 1.5, electronics: 0.75, machines: 0.75, water: 0.15, hydrocarbons: 0.25, weapons: 0.2 } },
            'black market': { produces: { narcotics: 2, weapons: 1 }, price: { narcotics: 0.35, weapons: 0.5 } },
            'tech hub': { produces: { electronics: 2, luxuries: 0.5 }, price: { machines: 0.5, electronics: 0.3, cybernetics: 0.4, addons: 0.9 } },
            'manufacturing hub': { produces: { machines: 2, luxuries: 0.5 }, price: { machines: 0.3, cybernetics: 0.25, addons: 0.8 } },
            'capital': { produces: { medicine: 0.5 }, consumes: { weapons: 0.1, luxuries: 0.25 }, price: { addons: 0.9 } },
            'military': { produces: { weapons: 2 }, consumes: { weapons: 0.5, machines: 0.5, electronics: 0.5, medicine: 0.5 }, price: { addons: 0.75 } },
        },
        conditions: {
            'plague': {
                days: [15, 90],
                consumes: { medicine: 2 },
                produces: {},
                triggers: {
                    shortage: { 'water': 0.0005, 'food': 0.0003 },
                    surplus: { 'narcotics': 0.001 },
                    condition: {},
                },
            },
            'environmental disaster': {
                days: [15, 90],
                consumes: { medicine: 2, machines: 1, electronics: 1 },
                produces: { water: -1, food: -2 },
                triggers: {
                    shortage: {},
                    surplus: {},
                    condition: { 'agricultural': 0.0003, 'habitable': 0.0006, 'manufacturing hub': 0.0009, 'military': 0.0008, 'black market': 0.0010 },
                },
            },
            "workers' strike": {
                days: [7, 30],
                consumes: {},
                produces: { water: -2, ore: -2, minerals: -1, food: -1 },
                triggers: {
                    shortage: { 'food': 0.002, 'fuel': 0.0004, 'cybernetics': 0.0002 },
                    surplus: {},
                    condition: { 'manufacturing hub': 0.0002, 'agricultural': 0.0004, 'environmental disaster': 0.001 },
                },
            },
        },
        work: [
            {
                name: "Food production",
                avail: ["mineral rich", "rocky", "subterranean"],
                rewards: ["food"],
                pay: 3,
                desc: `
        Whether harvesting produce in an open field on Earth, tending an
        acrid fungal orchard orbiting Enceladus, or producing prepackaged,
        processed foods in a factory on Ceres, the task of producing of enough
        food to feed the entire human population is always in need of day
        laborers.
      `,
            },
            {
                name: "Mine ore",
                avail: ["mineral rich", "rocky", "subterranean"],
                rewards: ["ore", "minerals"],
                pay: 4,
                desc: `
        Automated heavy excavating equipment deep underground carries tonnes
        of material to the surface. The arduous task of breaking and sorting
        the product is left to humans.
      `,
            },
            {
                name: "Harvest water ice",
                avail: ["icy", "water rich"],
                rewards: ["water", "minerals"],
                pay: 6,
                desc: `
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
                name: "Asteroid mining",
                avail: ["asteroids"],
                rewards: ["ore", "minerals"],
                pay: 8,
                desc: `
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
                name: "Harvest ring ice",
                avail: ["ringed system"],
                rewards: ["water", "hydrocarbons", "minerals"],
                pay: 10,
                desc: `
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
                capital: 'earth',
                sales_tax: 0.105,
                patrol: 0.5,
                piracy: 0.05,
                inspection: 0.075,
                produces: { electronics: 0.3, cybernetics: 0.1, medicine: 0.5 },
                consumes: {},
                standing: { UN: 15, MC: -10, CERES: 5, TRANSA: -15, JFT: 5 },
                desc: '',
            },
            'MC': {
                full_name: 'Martian Commonwealth',
                capital: 'mars',
                sales_tax: 0.085,
                patrol: 0.7,
                piracy: 0.03,
                inspection: 0.1,
                produces: { machines: 0.2, electronics: 0.2, weapons: 0.2, metal: 0.2 },
                consumes: {},
                standing: { UN: -10, MC: 15, CERES: 5, TRANSA: -15, JFT: 5 },
                desc: '',
            },
            'CERES': {
                full_name: 'The Most Serene Republic of Ceres',
                capital: 'ceres',
                sales_tax: 0.04,
                patrol: 0.3,
                piracy: 0.08,
                inspection: 0.05,
                produces: { fuel: 0.3, machines: 0.2 },
                consumes: {},
                standing: { UN: 5, MC: 5, CERES: 15, TRANSA: 0, JFT: 10 },
                desc: '',
            },
            'JFT': {
                full_name: 'Jovian Free Traders',
                capital: 'ganymede',
                sales_tax: 0.065,
                patrol: 0.4,
                piracy: 0.06,
                inspection: 0.025,
                produces: { fuel: 0.5, food: 0.25, metal: 0.1, ceramics: 0.1 },
                consumes: {},
                standing: { UN: 5, MC: 5, CERES: 10, TRANSA: 10, JFT: 15 },
                desc: '',
            },
            'TRANSA': {
                full_name: 'Trans-Neptunian Authority',
                capital: 'pluto',
                sales_tax: 0.0175,
                patrol: 0.2,
                piracy: 0.1,
                inspection: 0.005,
                produces: { fuel: 0.5, narcotics: 0.5, weapons: 0.5 },
                consumes: {},
                standing: { UN: -15, MC: -15, CERES: 0, TRANSA: 15, JFT: 5 },
                desc: '',
            },
        },
        bodies: {
            mercury: {
                name: 'Mercury',
                size: 'small',
                traits: ['subterranean', 'rocky', 'mineral rich', 'water poor', 'hydrocarbon poor', 'manufacturing hub'],
                faction: 'UN',
                desc: '',
            },
            earth: {
                name: 'Earth',
                size: 'huge',
                traits: ['habitable', 'orbital', 'rocky', 'mineral poor', 'water rich', 'o2 rich atmosphere', 'capital'],
                faction: 'UN',
                desc: '',
            },
            moon: {
                name: 'Luna',
                size: 'large',
                traits: ['domed', 'subterranean', 'rocky', 'water poor', 'hydrocarbon poor'],
                faction: 'UN',
                desc: '',
            },
            mars: {
                name: 'Mars',
                size: 'large',
                traits: ['domed', 'subterranean', 'orbital', 'rocky', 'water poor', 'mineral rich', 'hydrocarbon poor', 'tech hub', 'manufacturing hub', 'capital'],
                faction: 'MC',
                desc: '',
            },
            phobos: {
                name: 'Phobos Command',
                size: 'tiny',
                traits: ['rocky', 'water poor', 'hydrocarbon poor', 'military'],
                faction: 'MC',
                gravity: 0.7,
                desc: '',
            },
            ceres: {
                name: 'Ceres',
                size: 'large',
                traits: ['subterranean', 'rocky', 'asteroids', 'black market', 'manufacturing hub', 'capital'],
                faction: 'CERES',
                gravity: 0.3,
                desc: '',
            },
            europa: {
                name: 'Europa',
                size: 'small',
                traits: ['subterranean', 'icy', 'mineral rich', 'o2 rich atmosphere', 'water rich'],
                faction: 'JFT',
                desc: '',
            },
            callisto: {
                name: 'Callisto',
                size: 'normal',
                traits: ['domed', 'subterranean', 'orbital', 'rocky', 'agricultural'],
                faction: 'MC',
                desc: '',
            },
            ganymede: {
                name: 'Ganymede',
                size: 'large',
                traits: ['domed', 'subterranean', 'orbital', 'rocky', 'mineral poor', 'o2 rich atmosphere', 'agricultural', 'capital'],
                faction: 'JFT',
                desc: '',
            },
            trojans: {
                name: 'Trojan Atoll',
                size: 'large',
                traits: ['subterranean', 'asteroids', 'mineral rich', 'water poor', 'black market', 'tech hub'],
                faction: 'CERES',
                gravity: 0.2,
                desc: '',
            },
            enceladus: {
                name: 'Enceladus Depot',
                size: 'small',
                traits: ['orbital', 'ringed system', 'icy', 'water rich', 'mineral poor', 'hydrocarbon rich', 'military'],
                faction: 'TRANSA',
                gravity: 0.35,
                desc: '',
            },
            rhea: {
                name: 'Rhea Orbital Lab',
                size: 'small',
                traits: ['orbital', 'ringed system', 'icy', 'water rich', 'mineral poor', 'o2 rich atmosphere', 'tech hub'],
                faction: 'JFT',
                gravity: 0.28,
                desc: '',
            },
            titan: {
                name: 'Titan',
                size: 'normal',
                traits: ['domed', 'ringed system', 'icy', 'hydrocarbon rich', 'black market'],
                faction: 'TRANSA',
                desc: '',
            },
            titania: {
                name: 'Titania Outpost',
                size: 'normal',
                traits: ['subterranean', 'ringed system', 'icy', 'rocky', 'hydrocarbon rich', 'black market', 'manufacturing hub'],
                faction: 'TRANSA',
                gravity: 0.15,
                desc: '',
            },
            triton: {
                name: 'Triton Command',
                size: 'small',
                traits: ['orbital', 'icy', 'water rich', 'mineral poor', 'black market', 'military'],
                faction: 'TRANSA',
                gravity: 0.4,
                desc: '',
            },
            pluto: {
                name: 'Pluto',
                size: 'normal',
                traits: ['subterranean', 'hydrocarbon rich', 'icy', 'black market', 'capital'],
                faction: 'TRANSA',
                desc: '',
            }
        },
        drives: {
            ion: {
                name: 'Ion',
                thrust: 200,
                mass: 20,
                desc: 'Ion thrusters are commodity, inexpensive, and efficient. Bolted on by the dozen, they are the work horse of the cargo fleet.',
                burn_rate: 0.0025,
                value: 1200,
            },
            fusion: {
                name: 'Fusion',
                thrust: 2100,
                mass: 80,
                desc: 'Condensed pellets of fuel, ignited by a laser or maser, produce vast amouts of plasma which is then directed by magnetic fields to produce thrust. Expensive enough to maintain and keep fueled to make it impractical for most hauler operations, it is the favored drive for military vessels.',
                burn_rate: .05,
                value: 30000,
            }
        },
        shipclass: {
            /* Civilian */
            shuttle: { hull: 2, armor: 1, cargo: 6, hardpoints: 1, mass: 6000, tank: 10, drives: 6, drive: 'ion', restricted: false, desc: '' },
            schooner: { hull: 4, armor: 2, cargo: 14, hardpoints: 1, mass: 16000, tank: 30, drives: 14, drive: 'ion', restricted: false, desc: '' },
            cutter: { hull: 6, armor: 3, cargo: 20, hardpoints: 2, mass: 24000, tank: 50, drives: 20, drive: 'ion', restricted: false, desc: '' },
            /* Merchant */
            hauler: { hull: 6, armor: 2, cargo: 30, hardpoints: 2, mass: 30000, tank: 40, drives: 20, drive: 'ion', restricted: false, desc: '' },
            merchantman: { hull: 8, armor: 4, cargo: 40, hardpoints: 3, mass: 44000, tank: 60, drives: 30, drive: 'ion', restricted: false, desc: '' },
            freighter: { hull: 12, armor: 6, cargo: 50, hardpoints: 3, mass: 60000, tank: 80, drives: 60, drive: 'ion', restricted: false, desc: '' },
            /* Military */
            guardian: { hull: 8, armor: 6, cargo: 10, hardpoints: 3, mass: 36000, tank: 40, drives: 40, drive: 'ion', restricted: 'Friendly', markets: ['capital', 'military'], desc: '' },
            corvette: { hull: 10, armor: 10, cargo: 10, hardpoints: 4, mass: 24000, tank: 40, drives: 10, drive: 'fusion', restricted: 'Trusted', markets: ['capital', 'military'], desc: '' },
            cruiser: { hull: 20, armor: 15, cargo: 15, hardpoints: 8, mass: 56000, tank: 120, drives: 30, drive: 'fusion', restricted: 'Admired', markets: ['capital', 'military'], desc: '' },
            battleship: { hull: 30, armor: 20, cargo: 20, hardpoints: 10, mass: 85000, tank: 140, drives: 40, drive: 'fusion', restricted: 'Admired', markets: ['capital', 'military'], desc: '' },
            /* Faction ships */
            fortuna: { hull: 8, armor: 6, cargo: 60, hardpoints: 2, mass: 72000, tank: 80, drives: 70, drive: 'ion', restricted: 'Friendly', faction: 'JFT', desc: '' },
            neptune: { hull: 14, armor: 10, cargo: 40, hardpoints: 4, mass: 42000, tank: 100, drives: 50, drive: 'ion', restricted: 'Trusted', faction: 'TRANSA', markets: ['capital', 'military'], stealth: 0.05, desc: '' },
            barsoom: { hull: 20, armor: 20, cargo: 25, hardpoints: 5, mass: 21000, tank: 80, drives: 10, drive: 'fusion', restricted: 'Admired', faction: 'MC', markets: ['capital', 'military'], desc: '' },
            rockhopper: { hull: 6, armor: 4, cargo: 35, hardpoints: 3, mass: 32000, tank: 40, drives: 8, drive: 'fusion', restricted: 'Respected', faction: 'CERES', burn_rate: -0.015, desc: '' },
        },
        ship: {
            hull: { repair: 50 },
            armor: { repair: 200 },
        },
        addons: {
            cargo_pod: {
                is_misc: true,
                is_defensive: true,
                name: 'External cargo pod',
                desc: 'Welds additional cargo units onto the outer hull, increasing total cargo space but reducing the effectiveness of armor.',
                mass: 5,
                cargo: 10,
                armor: -1,
                dodge: -0.25,
                stealth: -0.05,
                price: 12500,
            },
            fuel_tank: {
                is_misc: true,
                name: 'Auxiliary fuel tank',
                desc: 'Installs a supplementary fuel tank in the cargo bay, trading storage for range.',
                mass: 1,
                tank: 40,
                cargo: -4,
                price: 8500,
            },
            heat_reclaimer: {
                is_misc: true,
                is_defensive: true,
                name: 'Waste heat reclaimation system',
                desc: "Boosts drive efficiency by 10% by recycling waste heat from the drive and internal electrical systems. A fortunate side benefit is a reduction in visibility to infrared systems, making this a popular and relatively inexpensive way to mask a civilian ship's signature from pirates... and inspectors.",
                mass: 1,
                stealth: 0.08,
                burn_rate_pct: 0.10,
                price: 18500,
            },
            ion: {
                is_misc: true,
                name: 'Ion drive',
                desc: 'Adds an additional pair of ion drives to the hull, increasing thrust. Care must be taken not to unbalance the ship, however.',
                mass: 40,
                thrust: 400,
                burn_rate: 0.005,
                price: 8000,
            },
            fusion: {
                is_misc: true,
                name: 'Fusion drive',
                desc: 'Somewhat reduced in efficiency when installed as a set of external pods, adding a fusion drive to an existing craft can drastically increase thrust and manuevering.',
                mass: 80,
                thrust: 1650,
                burn_rate: 0.03,
                price: 25000,
                restricted: 'Trusted',
            },
            armor: {
                is_defensive: true,
                name: 'Armor plating',
                desc: 'Welds plates of ceramic carbon-steel armor to the hull, protecting it from damage, but adding greatly to the mass of the ship.',
                mass: 100,
                armor: 5,
                price: 30000,
                restricted: 'Friendly',
                markets: ['military', 'capital'],
            },
            advanced_armor: {
                is_defensive: true,
                name: 'Milspec armor plating',
                desc: 'More expensive and much more highly restricted than carbon-steel, military grade armor achieves a higher level of protection per tonne using advanced materials science.',
                mass: 150,
                armor: 10,
                price: 50000,
                restricted: 'Trusted',
                markets: ['military', 'capital'],
            },
            railgun_turret: {
                is_offensive: true,
                name: 'Rail gun turret',
                desc: 'A military-grade rail gun turret, magnetically accelerating 100kg rounds at an appreciable fraction of the speed of light.',
                mass: 15,
                damage: 1,
                reload: 1,
                rate: 3,
                magazine: 6,
                accuracy: 0.8,
                price: 85000,
                restricted: 'Trusted',
                markets: ['military', 'capital'],
            },
            railgun_cannon: {
                is_offensive: true,
                name: 'Rail gun cannon',
                desc: "More powerful than it's smaller cousin, a rail gun cannon fires heavier slugs of denser material, resulting in more energy released on impact.",
                mass: 30,
                damage: 5,
                reload: 2,
                rate: 1,
                magazine: 1,
                accuracy: 0.7,
                price: 105000,
                restricted: 'Admired',
                markets: ['military', 'capital'],
            },
            light_torpedo: {
                is_offensive: true,
                name: 'Light torpedo launcher',
                desc: 'Adds a torpedo launcher tube suitable for low yield, self-guided payloads.',
                mass: 20,
                damage: 3,
                reload: 2,
                rate: 1,
                magazine: 2,
                accuracy: 1,
                interceptable: true,
                price: 25000,
                restricted: 'Friendly',
            },
            medium_torpedo: {
                is_offensive: true,
                name: 'Medium torpedo launcher',
                desc: 'Adds a torpedo launcher tube suitable for moderate yield, self-guided payloads.',
                mass: 40,
                damage: 5,
                reload: 2,
                rate: 1,
                magazine: 1,
                accuracy: 1,
                interceptable: true,
                price: 37500,
                restricted: 'Trusted',
                markets: ['military', 'capital'],
            },
            heavy_torpedo: {
                is_offensive: true,
                name: 'Heavy torpedo launcher',
                desc: 'Adds a torpedo launcher tube suitable for high yield, self-guided payloads.',
                mass: 60,
                damage: 7,
                reload: 2,
                rate: 1,
                magazine: 1,
                accuracy: 1,
                interceptable: true,
                price: 50000,
                restricted: 'Admired',
                markets: ['military', 'capital'],
            },
            pds: {
                is_offensive: true,
                is_defensive: true,
                name: 'PDS',
                desc: 'Mounts a computer-controlled network of small, magnetically propelled, point defense turrets around the ship to stop incoming torpedos at a safe range.',
                mass: 5,
                damage: 0.05,
                intercept: 0.25,
                reload: 1,
                rate: 10,
                magazine: 40,
                accuracy: 0.9,
                price: 25500,
                restricted: 'Friendly',
            },
            ecm: {
                is_defensive: true,
                name: 'ECM',
                desc: "Electronic counter-measures generate randomized, electromagnetic interference and false signals to confuse an enemy's targeting systems.",
                mass: 1,
                intercept: 0.1,
                dodge: 0.2,
                stealth: 0.075,
                price: 45000,
                restricted: 'Admired',
                markets: ['military', 'capital'],
            },
            stealthPlating: {
                is_defensive: true,
                name: "Adaptive hull plating",
                desc: "This Martian technology, originally designed as part of an adaptive camouflage system for ground forces' power armor, alters the absorbtive range of the ships' outer hull to absorb EM radiation, making it effectively invisible except at very close range.",
                mass: 100,
                dodge: 0.05,
                stealth: 0.2,
                armor: -1,
                price: 125000,
                restricted: 'Admired',
                markets: ['military', 'capital'],
            },
        }
    };
    /*
     * Descriptions
     */
    data.factions.UN.desc = "After the outbreak of hostilities with Mars more than 80 years ago and the treaties that followed, the UN assumed the role of the unified sovereign government over the Earth, Moon, and Mercury. Known for its glacial bureaucracy and stodgy leaders, Earth remains an economic powerhouse, largely as a result of remaining the sole inhabitable body in the system. Unfortunately, after centuries of industrialization, most of the easy to reach minerals and valuable ores have been depleted, leaving Earth uncomfortably reliant on the mineral wealth of unionized Mercury and the belt, the UN member nations continue to see Mars as selfish and ungrateful.";
    data.factions.MC.desc = "Nearly 50 years after its founding as a science outpost in the early 22nd century, Mars declared independence from an Earth that it increasingly viewed as a distant, intrusive micromanager. In the 84 years since its founding, Mars has grown into a military power rivaling Earth, with a thriving economy and highly educated populace. Since its independence, Mars has focused its significant resources toward the scientific and technological achievements necessary to realize its population's dream of a \"Green Mars\".|The Martian Commonwealth controls Mars and its moons as well as several of the Jovian moons, providing the infrastructure and resource to maintain and grow their subterranean and domed habitats, whose proximity to the radiant gas giant make them the bread basket of the outer planets.";
    data.factions.TRANSA.desc = "Those who live in the outer planets are exquisitely aware of the fragile existence they lead, completely dependent on shipments of food, water, medicine, and technology in order to survive.|When Mars broke from Earth, deliveries to the furthest installations in the outer system ceased in the face of privateering and the realities of a war economy. Those who survived the food riots shortly found themselves under the unforgiving magnetic boot of the corporate security forces originally contracted to protect and police the scientific mission stationed on Pluto.|Collectively calling themselves the Trans-Neptunian Authority, they quickly restored order and set to work building a strict, tightly controlled, society with the ultimate goal of achieving self-sufficiency.|With resources stretched and hungry mouths to feed, TRANSA offers the lowest tax rate in the system, promising a hefty margin to any traders willing to make the \"Long Haul\", as it is popularly known. Given the size of TRANSA's tiny fleet and the vast volume of space it patrols, the Long Haul can as be perilous as it is profitable.";
    data.factions.CERES.desc = "Holding a favorable position orbiting within the asteroid belt, the independent planetoid Ceres has long served as a trade hub between the inner and outer planets. Its location also serves to make it a launching point for mining operations within the asteroid belt.|A number of shipyards have grown up around Ceres, taking advantage of the central location and ease of access to materials to make Ceres the primary ship-bulding center in the system.";
    data.factions.JFT.desc = "Faced with the same economic constraints and pressures as the outer planets during the war but with much closer and more powerful corporate interests at hand, the Saturnian moons controlling interests joined to form the Jovian Free Traders collective. Funded by some of the richest corporations on Earth, the JFT has become a force unto itself, patrolling the outer planets' trade routes with its corporate fleet.|Life in the domes of Saturn is difficult, and the harvesting of ice and ore in the outer system is dangerous work, but citizen employees can rest assured that the Board of Directors has their best interests at heart, or at least their compound interest at heart, as many are bound by contract or debt to their Syndicate.";
    data.bodies.mercury.desc = "Too close to the sun to permit domed habitations, Mercury's single city, Quicksilver, lies deep underground, providing it with a modicum of protection against the intense solar radiation bathing the surface.|Known for its rich mineral deposits and hard-nosed populace, the knowledge gained during the process of excavating and settling Mercury was a major factor in the success of later colonies. Although nominally a member of the UN, Mercury is widely known to be effectively run by the unions, who work to ensure that Mercury is not unfairly exploited by Earth. Nobody messes with the local 127.";
    data.bodies.earth.desc = "Under the unified governance of the UN, Earth has been at peace for decades. As the sole habital body in the system, Earth remains the largest population, economy, and military force in the system.";
    data.bodies.moon.desc = "A natural target for the first extension of humanity into space, the Moon's domed cities and vast, subterranean passages hold the second largest population in the system as well as some of its best shipyards.|With its lower gravity, excellent amenities, and close proximity to Earth, Luna hosts the official embassies of both the Martian Commonwealth and TRANSA.";
    data.bodies.mars.desc = "Rising from the ashes of the Earth fleet's systematic bombardment during the war for independence, the Martian capital of Barsoom is home to the most widely respected universities and scientific institutions in the system.|The memories of those scars still fresh, Mars continues to sink a sizable portion of its resources into its fleet and planetary defenses. Although smaller than the UN fleet, the Martian navy's vessels are newer and have a small but not inconsiderable tech advantage on Earth's aging ships.";
    data.bodies.phobos.desc = "Phobos Command hosts the orbital command center of the Martian navy, coordinating the planet's orbital defense network, as well as its most prestigious officer training school. Having been spun up close to Earth gravity, it is also home to the Martian Marines, allowing them to train under the conditions they would face during an invasion of Earth.";
    data.bodies.ceres.desc = "Large enough to be given a comfortable spin gravity of more than a third of Earth, the hollowed out planetoid Ceres is a major shipping and commercial hub between the inner and outer planets.";
    data.bodies.trojans.desc = "Stretching across nearly half an AU of Jupiter's L5 Lagrange point, Trojan Atoll collectively represents the second largest population in the system. As well as being a source of incredible mineral wealth, it also boasts some of the most exotic and highly adapted habitats humanity has ever designed. A cluster of hollowed out and spun up asteroids, the \"Isles\" are connected by a flotilla of small transports linking the dozens of habitats, each boasting their own unique culture.|After the war, with shipments of necessities scarce, the government of Ceres stepped up to aid their fellow spacers, later formalizing the Isles' status as a protectorate with full voting rights in the Serene Council.|Descended from an eclectic community of asteroid miners and scientists, Islanders, as they are commonly known, have a reputation for cleverness and technological know-how.";
    data.bodies.europa.desc = "One of the two Jovian moons claimed by the JFT during the war, Europa's mines provide the backbone of the JFT's trade from ice and disolved minerals from its subsurface oceans.";
    data.bodies.callisto.desc = "Callisto's vast domed farms produce tons of food that are shipped across the system, supporting many of the outer colonies that cannot produce enough food to be self sufficient. It also hosts the regional Martian command orbital and dock yards.";
    data.bodies.ganymede.desc = "The official headquarters of the JFT, Ganymede also hosts excellent agricultural facilities and shipyards, making it a commercial hub of the outer system.";
    data.bodies.enceladus.desc = "The supply station orbiting Enceladus boasts the best views in the system and is the nexus for the harvesting and shipping of water from Saturn's rings.";
    data.bodies.rhea.desc = "The Rhea Orbital Lab is the primary research and development platform of the JFT and maintains a small population serving the needs of the research community there.";
    data.bodies.titan.desc = "With an actual atmosphere, albeit a poisonous one, Titan is home to TRANSA's largest and most prosperous settlement. Nestled in close proximity to JFT's orbital around Saturn, Titan has become a minor trade hub between the two factions.";
    data.bodies.triton.desc = "In retrograde orbit of Neptune, the Triton orbital hosts the meager Plutonian Widdershins Naval Command, providing anchorage on the far side of the system and minimal support for the TRANSA facilities around Saturn. It's remote location makes it a secure, if not convenient, location for TRANSA's limited number of secret research projects.";
    data.bodies.titania.desc = "Rich in heavy organic compounds, Titania is the primary source of raw materials and shipping for TRANSA. When the war began, the process of spinning up Titania was nearly halfway complete. With nearly a quarter of Earth's gravity and supported by a growing commercial mining industry, it is also one of the few TRANSA settlements with a growing population.";
    data.bodies.pluto.desc = "The furthest outpost of humanity, Pluto is home to the TRANSA high command. It's deeply excavated chambers support a surprisingly robust population, many descended from the original scientific mission team stationed on the dwarf planet at the outset of the Martian rebellion.";
    data.shipclass.fortuna.desc = "Named for the daughter of Jupiter, the Fortuna is a container ship optimized to carry larger loads at higher efficiency than a typical freighter.";
    data.shipclass.barsoom.desc = "The Barsoomian class frigate adopts the latest advances in Martian technology resulting in a frigate class ship with more range, speed, and enough firepower to act as its own escort.";
    data.shipclass.neptune.desc = "Designed and built in TRANSA's own shipyards, the Neptune class cargo hauler has the longest range of any vessel while retaining low mass and reasonable cargo space. A favorite of traders and smugglers on the Long Haul alike due to its low albedo design, it has the armor and hard points to defend itself in the unguarded outer oribts.";
    data.shipclass.rockhopper.desc = "In the true spirit of the belt, the Rock Hopper is a rebuilt schooner class, retrofitted with upgraded armor, increased thrust, and after market hacks to boost fuel efficiency, making it great for hauling moderate sized loads of the heavy materials for which it is named.";
    return data;
});
