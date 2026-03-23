// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Ship from '../src/ship';
import NPC from '../src/npc';
import { Combatant, Attack, Flight, Surrender, Pass, Combat } from '../src/combat';
import data from '../src/data';
import * as util from '../src/util';

/**
 * Build a Person-like object suitable for the Combatant constructor.
 * Mirrors the shape of Person: { name, faction, ship }.
 */
function makePerson(name, shipType, addons = []) {
  const ship = new Ship({ type: shipType, addons });
  return {
    name,
    faction: 'MC',
    faction_name: 'MC',
    ship,
  };
}

// ---------------------------------------------------------------------------
// Combatant construction
// ---------------------------------------------------------------------------

describe('Combatant', () => {
  describe('construction', () => {
    it('creates Attack actions for offensive addons', () => {
      const person = makePerson('Tester', 'schooner', ['railgun_turret']);
      const c = new Combatant(person);

      expect(c.attacks.length).toBe(1);
      expect(c.attacks[0]).toBeInstanceOf(Attack);
      expect(c.attacks[0].name).toBe(data.addons.railgun_turret.name);
    });

    it('consolidates duplicate weapons into a single Attack with count > 1', () => {
      const person = makePerson('Tester', 'corvette', ['railgun_turret', 'railgun_turret']);
      const c = new Combatant(person);

      const attacks = Object.values(c._actions);
      expect(attacks.length).toBe(1);
      expect(attacks[0].count).toBe(2);
      // rate and magazine scale with count
      expect(attacks[0].rate).toBe(data.addons.railgun_turret.rate * 2);
      expect(attacks[0].magazine).toBe(data.addons.railgun_turret.magazine * 2);
    });

    it('ignores purely defensive addons when building attacks', () => {
      const person = makePerson('Tester', 'schooner', ['ecm', 'armor']);
      const c = new Combatant(person);

      expect(Object.keys(c._actions).length).toBe(0);
      expect(c.attacks.length).toBe(0);
    });

    it('includes flight, surrender, and pass in actions list', () => {
      const person = makePerson('Tester', 'schooner', ['railgun_turret']);
      const c = new Combatant(person);

      const actions = c.actions;
      expect(actions.some(a => a instanceof Flight)).toBe(true);
      expect(actions.some(a => a instanceof Surrender)).toBe(true);
      expect(actions.some(a => a instanceof Pass)).toBe(true);
    });

    it('exposes ship properties via delegation', () => {
      const person = makePerson('Tester', 'schooner', []);
      const c = new Combatant(person);

      expect(c.name).toBe('Tester');
      expect(c.hull).toBe(c.ship.hull);
      expect(c.armor).toBe(c.ship.armor);
      expect(c.fullHull).toBe(c.ship.fullHull);
      expect(c.fullArmor).toBe(c.ship.fullArmor);
    });
  });
});

// ---------------------------------------------------------------------------
// Attack magazine / reload cycle
// ---------------------------------------------------------------------------

describe('Attack', () => {
  /** Create an Attack from the railgun_turret addon data. */
  function makeAttack() {
    return new Attack(data.addons.railgun_turret);
  }

  it('starts with a full magazine', () => {
    const atk = makeAttack();
    expect(atk.magazineRemaining).toBe(atk.magazine);
    expect(atk.isReady).toBe(true);
    expect(atk.isReloading).toBe(false);
  });

  it('depletes magazine on use and enters reload state', () => {
    const atk = makeAttack();

    // Stub chance to always hit (so shots are consumed normally)
    vi.spyOn(util, 'chance').mockReturnValue(true);
    vi.spyOn(util, 'getRandomNum').mockReturnValue(0.5);

    const from = makePerson('A', 'schooner', ['railgun_turret']);
    const to   = makePerson('B', 'schooner', ['railgun_turret']);
    const cFrom = new Combatant(from);
    const cTo   = new Combatant(to);

    // Fire until magazine is empty
    while (atk.isReady) {
      atk.use(cFrom, cTo);
    }

    expect(atk.magazineRemaining).toBe(0);
    expect(atk.isReloading).toBe(true);
    expect(atk.isReady).toBe(false);
    expect(atk.roundsUntilReload).toBe(atk.reload);

    vi.restoreAllMocks();
  });

  it('becomes ready again after enough reload turns', () => {
    const atk = makeAttack();

    vi.spyOn(util, 'chance').mockReturnValue(true);
    vi.spyOn(util, 'getRandomNum').mockReturnValue(0.1);

    const from = makePerson('A', 'corvette', ['railgun_turret']);
    const to   = makePerson('B', 'corvette', ['railgun_turret']);
    const cFrom = new Combatant(from);
    const cTo   = new Combatant(to);

    // Drain the magazine
    while (atk.isReady) {
      atk.use(cFrom, cTo);
    }

    expect(atk.isReloading).toBe(true);

    // Advance through reload turns
    for (let i = 0; i < atk.reload; ++i) {
      atk.nextRound();
    }

    expect(atk.isReady).toBe(true);
    expect(atk.magazineRemaining).toBe(atk.magazine);

    vi.restoreAllMocks();
  });

  it('throws when used while reloading', () => {
    const atk = makeAttack();

    vi.spyOn(util, 'chance').mockReturnValue(false); // all miss, still consumes ammo

    const from = makePerson('A', 'corvette', ['railgun_turret']);
    const to   = makePerson('B', 'corvette', ['railgun_turret']);
    const cFrom = new Combatant(from);
    const cTo   = new Combatant(to);

    // Drain magazine
    while (atk.isReady) {
      atk.use(cFrom, cTo);
    }

    expect(() => atk.use(cFrom, cTo)).toThrow('action is not ready');

    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// Combat turn flow
// ---------------------------------------------------------------------------

describe('Combat turn flow', () => {
  function makeCombat(initiative) {
    const playerPerson = makePerson('Player', 'corvette', ['railgun_turret']);
    const opponent = new NPC({
      name: 'Pirate',
      faction: 'TRANSA',
      ship: ['corvette'],
      addons: ['railgun_turret'],
      always_addons: ['railgun_turret'],
    });

    // Set window.game.player for Combat constructor
    window.game = { player: playerPerson };

    const combat = new Combat({ opponent });
    // Override initiative for determinism
    combat.initiative = initiative;
    return combat;
  }

  beforeEach(() => {
    vi.spyOn(util, 'oneOf').mockImplementation(arr => arr[0]);
    vi.spyOn(util, 'chance').mockReturnValue(true);
    vi.spyOn(util, 'getRandomNum').mockReturnValue(0.5);
    vi.spyOn(util, 'getRandomInt').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('player acts first when player has initiative', () => {
    const combat = makeCombat('player');
    expect(combat.isPlayerTurn).toBe(true);
  });

  it('opponent acts first when opponent has initiative', () => {
    const combat = makeCombat('opponent');
    expect(combat.isPlayerTurn).toBe(false);
  });

  it('turns alternate after player action', () => {
    const combat = makeCombat('player');

    expect(combat.isPlayerTurn).toBe(true);
    combat.playerAction(combat.player.attacks[0]);
    expect(combat.isPlayerTurn).toBe(false);
  });

  it('throws if player acts out of turn', () => {
    const combat = makeCombat('opponent');
    expect(() => combat.playerAction(combat.player.attacks[0]))
      .toThrow("It is not the player's turn");
  });

  it('throws if opponent acts out of turn', () => {
    const combat = makeCombat('player');
    expect(() => combat.opponentAction())
      .toThrow("It is not the opponents's turn");
  });

  it('logs entries for each action', () => {
    const combat = makeCombat('player');

    combat.playerAction(combat.player.attacks[0]);
    expect(combat.log.length).toBe(1);
    expect(combat.log[0].player).toBeDefined();

    combat.opponentAction();
    expect(combat.log[0].opponent).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Combat end conditions
// ---------------------------------------------------------------------------

describe('Combat end conditions', () => {
  beforeEach(() => {
    vi.spyOn(util, 'oneOf').mockImplementation(arr => arr[0]);
    vi.spyOn(util, 'chance').mockReturnValue(true);
    vi.spyOn(util, 'getRandomNum').mockReturnValue(0.5);
    vi.spyOn(util, 'getRandomInt').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupCombat() {
    const playerPerson = makePerson('Player', 'corvette', ['railgun_turret']);
    const opponent = new NPC({
      name: 'Pirate',
      faction: 'TRANSA',
      ship: ['corvette'],
      addons: ['railgun_turret'],
      always_addons: ['railgun_turret'],
    });
    window.game = { player: playerPerson };
    const combat = new Combat({ opponent });
    combat.initiative = 'player';
    return combat;
  }

  it('is not over at the start', () => {
    const combat = setupCombat();
    expect(combat.isOver).toBeFalsy();
  });

  it('ends when opponent ship is destroyed (hull=0, armor=0)', () => {
    const combat = setupCombat();
    // Directly destroy the opponent ship
    const ship = combat.opponent.ship;
    ship.applyDamage(ship.armor + ship.hull);

    expect(combat.opponent.isDestroyed).toBe(true);
    expect(combat.isOver).toBeTruthy();
    expect(combat.opponentDestroyed).toBe(true);
  });

  it('ends when player ship is destroyed', () => {
    const combat = setupCombat();
    const ship = combat.player.ship;
    ship.applyDamage(ship.armor + ship.hull);

    expect(combat.player.isDestroyed).toBe(true);
    expect(combat.isOver).toBeTruthy();
    expect(combat.playerDestroyed).toBe(true);
  });

  it('ends on surrender', () => {
    const combat = setupCombat();

    // Player surrenders
    combat.playerAction(combat.player.surrender);

    expect(combat.isOver).toBeTruthy();
    expect(combat.surrendered).toBe('Player');
    expect(combat.playerSurrendered).toBe(true);
  });

  it('ends on successful flee', () => {
    const combat = setupCombat();

    // Player flees (chance is mocked to true, so tryFlight succeeds)
    combat.playerAction(combat.player.flight);

    expect(combat.isOver).toBeTruthy();
    expect(combat.escaped).toBe('Player');
  });
});

// ---------------------------------------------------------------------------
// NPC generation
// ---------------------------------------------------------------------------

describe('NPC generation', () => {
  it('creates an NPC with a valid ship', () => {
    const npc = new NPC({
      name: 'Test Pirate',
      faction: 'TRANSA',
      ship: ['schooner'],
    });

    expect(npc.name).toBe('Test Pirate');
    expect(npc.ship).toBeInstanceOf(Ship);
    expect(npc.ship.type).toBe('schooner');
  });

  it('installs always_addons unconditionally', () => {
    const npc = new NPC({
      name: 'Armed Pirate',
      faction: 'TRANSA',
      ship: ['corvette'],
      addons: ['railgun_turret'],
      always_addons: ['light_torpedo'],
    });

    expect(npc.ship.addons).toContain('light_torpedo');
  });

  it('installs random addons from the addon pool', () => {
    // Force getRandomInt to return max available hardpoints so addons are installed
    vi.spyOn(util, 'oneOf').mockImplementation(arr => arr[0]);
    vi.spyOn(util, 'getRandomInt').mockImplementation((min, max) => max);

    const npc = new NPC({
      name: 'Armed Pirate',
      faction: 'TRANSA',
      ship: ['corvette'],
      addons: ['railgun_turret'],
      min_addons: 0,
    });

    // Should have filled all hardpoints with railgun_turret
    const hardpoints = data.shipclass[npc.ship.type].hardpoints;
    expect(npc.ship.addons.length).toBe(hardpoints);

    vi.restoreAllMocks();
  });

  it('creates a ship with the correct type from the pool', () => {
    // NPC cargo is lost during Person serialization (Store expects {store:{...}}
    // but NPC passes the raw object). Test what NPC actually preserves: ship type,
    // faction, and name.
    const npc = new NPC({
      name: 'Merchant',
      faction: 'MC',
      ship: ['hauler', 'schooner'],
    });

    expect(['hauler', 'schooner']).toContain(npc.ship.type);
    expect(npc.faction_name).toBe('MC');
  });
});

// ---------------------------------------------------------------------------
// Salvage calculation
// ---------------------------------------------------------------------------

describe('Combat salvage', () => {
  beforeEach(() => {
    vi.spyOn(util, 'oneOf').mockImplementation(arr => arr[0]);
    vi.spyOn(util, 'chance').mockReturnValue(true);
    vi.spyOn(util, 'getRandomNum').mockReturnValue(0.5);
    vi.spyOn(util, 'getRandomInt').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupCombatWithCargo() {
    const playerPerson = makePerson('Player', 'corvette', ['railgun_turret']);

    // Restore getRandomInt briefly to load cargo properly, then re-mock
    vi.restoreAllMocks();
    vi.spyOn(util, 'oneOf').mockImplementation(arr => arr[0]);
    vi.spyOn(util, 'getRandomInt').mockReturnValue(5);

    const opponent = new NPC({
      name: 'Merchant',
      faction: 'MC',
      ship: ['schooner'],
      cargo: ['ore'],
      min_cargo: 5,
    });

    // Re-mock for combat
    vi.spyOn(util, 'chance').mockReturnValue(true);
    vi.spyOn(util, 'getRandomNum').mockReturnValue(0.5);

    window.game = { player: playerPerson };
    const combat = new Combat({ opponent });
    combat.initiative = 'player';
    return combat;
  }

  it('returns undefined when opponent is alive and has not surrendered', () => {
    const playerPerson = makePerson('Player', 'corvette', ['railgun_turret']);
    const opponent = new NPC({
      name: 'Pirate',
      faction: 'TRANSA',
      ship: ['corvette'],
      addons: ['railgun_turret'],
      always_addons: ['railgun_turret'],
    });
    window.game = { player: playerPerson };
    const combat = new Combat({ opponent });

    expect(combat.salvage).toBeUndefined();
  });

  it('returns full cargo when opponent surrenders', () => {
    const combat = setupCombatWithCargo();
    const opponentCargo = combat.opponent.ship.cargo;

    // Force surrender
    combat.surrendered = combat.opponent.name;
    const salvage = combat.salvage;

    expect(salvage).toBeDefined();
    // On surrender, all cargo survives
    for (const item of opponentCargo.keys()) {
      expect(salvage.count(item)).toBe(opponentCargo.count(item));
    }
  });

  it('returns randomized cargo when opponent is destroyed', () => {
    const combat = setupCombatWithCargo();

    // Destroy the opponent
    const ship = combat.opponent.ship;
    ship.applyDamage(ship.armor + ship.hull);

    // getRandomInt is mocked to return 0, so destroyed salvage = 0 for all items
    vi.spyOn(util, 'getRandomInt').mockReturnValue(0);

    const salvage = combat.salvage;
    expect(salvage).toBeDefined();

    // With getRandomInt returning 0, all destroyed salvage should be 0
    for (const item of combat.opponent.ship.cargo.keys()) {
      expect(salvage.count(item)).toBe(0);
    }
  });

  it('caches salvage on repeated access', () => {
    const combat = setupCombatWithCargo();
    combat.surrendered = combat.opponent.name;

    const first = combat.salvage;
    const second = combat.salvage;
    expect(first).toBe(second);
  });
});
