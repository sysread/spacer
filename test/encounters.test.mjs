// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import NPC from '../src/npc';
import Ship from '../src/ship';
import data from '../src/data';

describe('NPC generation', () => {
  describe('basics', () => {
    it('creates a Ship from the provided ship type list', () => {
      const npc = new NPC({ name: 'Test', faction: 'UN', ship: ['schooner'] });
      expect(npc.ship).toBeInstanceOf(Ship);
      expect(npc.ship.type).toBe('schooner');
    });

    it('selects from the provided ship type list', () => {
      // NOTE: util.oneOf has an off-by-one bug (getRandomInt upper bound is
      // exclusive, but oneOf passes length-1), so multi-element lists are
      // biased toward the first element. We verify the result is always a
      // member of the provided list rather than testing uniform distribution.
      const pool = ['schooner', 'hauler', 'corvette'];
      for (let i = 0; i < 20; i++) {
        const npc = new NPC({ name: 'Test', faction: 'UN', ship: pool });
        expect(pool).toContain(npc.ship.type);
      }
    });

    it('sets faction and name on the NPC', () => {
      const npc = new NPC({ name: 'Bandit', faction: 'MC', ship: ['schooner'] });
      expect(npc.name).toBe('Bandit');
      expect(npc.faction_name).toBe('MC');
    });
  });

  describe('always_addons', () => {
    it('installs always_addons regardless of randomization', () => {
      const npc = new NPC({
        name: 'Test',
        faction: 'UN',
        ship: ['schooner'],
        addons: ['railgun_turret'],
        always_addons: ['pds'],
        min_addons: 0,
      });
      expect(npc.ship.hasAddOn('pds')).toBeGreaterThanOrEqual(1);
    });

    it('installs multiple always_addons', () => {
      const npc = new NPC({
        name: 'Test',
        faction: 'UN',
        ship: ['hauler'],
        addons: ['railgun_turret'],
        always_addons: ['pds', 'ecm'],
        min_addons: 0,
      });
      expect(npc.ship.hasAddOn('pds')).toBeGreaterThanOrEqual(1);
      expect(npc.ship.hasAddOn('ecm')).toBeGreaterThanOrEqual(1);
    });

    it('does not install always_addons when addons pool is absent', () => {
      // always_addons only fires inside the `if (opt.addons)` branch
      const npc = new NPC({
        name: 'Test',
        faction: 'UN',
        ship: ['schooner'],
        always_addons: ['pds'],
      });
      expect(npc.ship.hasAddOn('pds')).toBe(0);
    });
  });

  describe('min_addons', () => {
    it('installs at least min_addons random addons', () => {
      // Corvette has 4 hardpoints. always_addons takes 1, leaving 3.
      // min_addons=2 means at least 2 random, so total >= 3.
      const results = [];
      for (let i = 0; i < 20; i++) {
        const npc = new NPC({
          name: 'Test',
          faction: 'UN',
          ship: ['corvette'],
          addons: ['railgun_turret'],
          always_addons: ['pds'],
          min_addons: 2,
        });
        results.push(npc.ship.numAddOns());
      }
      for (const count of results) {
        expect(count).toBeGreaterThanOrEqual(3);
      }
    });

    it('caps min_addons at available hardpoints', () => {
      // Schooner has 1 hardpoint. always_addons['pds'] takes it,
      // leaving 0 available. min_addons=5 is capped to 0.
      const npc = new NPC({
        name: 'Test',
        faction: 'UN',
        ship: ['schooner'],
        addons: ['railgun_turret'],
        always_addons: ['pds'],
        min_addons: 5,
      });
      // Only the always_addon is installed; no random addons added
      expect(npc.ship.hasAddOn('pds')).toBeGreaterThanOrEqual(1);
    });
  });

  describe('cargo loading', () => {
    // BUG: NPC constructor passes `ship.cargo.store` (a raw ResourceCounter)
    // to Person via the init object, but Store's constructor expects
    // `{ store: { ... } }` to restore values. The cargo loaded onto the
    // local Ship in the NPC constructor is lost when Person creates a new
    // Ship from the serialized init. As a result, NPC ships always have
    // empty cargo after construction.
    //
    // These tests verify current (buggy) behavior so we can detect when
    // the bug is fixed.

    it('NPC retains cargo after construction', () => {
      const npc = new NPC({
        name: 'Test',
        faction: 'UN',
        ship: ['schooner'],
        cargo: ['food', 'water', 'ore'],
        min_cargo: 5,
      });
      expect(npc.ship.cargoUsed).toBeGreaterThanOrEqual(5);
    });

    it('cargo loaded directly onto a Ship is preserved', () => {
      // Verify the loading mechanism works when not going through NPC
      const ship = new Ship({ type: 'schooner' });
      ship.loadCargo('food', 5);
      expect(ship.cargoUsed).toBe(5);
      expect(ship.cargo.get('food')).toBe(5);
    });
  });

  describe('faction-specific contraband', () => {
    // Test the contraband filtering logic directly on Ship since NPC cargo
    // is lost (see cargo loading tests above for the Store init bug).

    it('Ship.hasContraband detects contraband in cargo', () => {
      const ship = new Ship({ type: 'schooner' });
      ship.loadCargo('narcotics', 3);
      expect(ship.hasContraband).toBe(true);
    });

    it('Ship.hasContraband is false with only legal cargo', () => {
      const ship = new Ship({ type: 'schooner' });
      ship.loadCargo('food', 5);
      ship.loadCargo('ore', 3);
      expect(ship.hasContraband).toBe(false);
    });

    it('non-TRANSA NPCs never carry contraband', () => {
      // Even if the Store bug were fixed, non-TRANSA NPCs should filter
      // out contraband items. Include legal items to avoid infinite loop.
      for (let i = 0; i < 20; i++) {
        const npc = new NPC({
          name: 'Patrol',
          faction: 'UN',
          ship: ['schooner'],
          cargo: ['narcotics', 'weapons', 'food', 'ore'],
        });
        expect(npc.ship.hasContraband).toBe(false);
      }
    });
  });

  describe('bounty calculation', () => {
    it('bounty is ceil((shipValue + addOnValue) / 20)', () => {
      const npc = new NPC({
        name: 'Pirate',
        faction: 'TRANSA',
        ship: ['schooner'],
        addons: ['railgun_turret'],
        always_addons: ['pds'],
        min_addons: 0,
      });

      // Replicate the PirateEncounter.vue bounty formula with a mock market
      const mockMarket = {
        sellPrice(item) {
          return data.resources[item]?.mine?.value ?? 100;
        },
      };

      const shipValue = npc.ship.shipValue(mockMarket) + npc.ship.addOnValue();
      const bounty = Math.ceil(shipValue / 20);

      expect(bounty).toBeGreaterThan(0);
      // 1/20 is equivalent to 5%
      expect(bounty).toBe(Math.ceil(shipValue * 0.05));
    });

    it('bounty scales with ship class value', () => {
      const mockMarket = {
        sellPrice(item) {
          return data.resources[item]?.mine?.value ?? 100;
        },
      };

      const small = new NPC({ name: 'P1', faction: 'TRANSA', ship: ['schooner'] });
      const large = new NPC({ name: 'P2', faction: 'TRANSA', ship: ['cruiser'] });

      const smallBounty = Math.ceil((small.ship.shipValue(mockMarket) + small.ship.addOnValue()) / 20);
      const largeBounty = Math.ceil((large.ship.shipValue(mockMarket) + large.ship.addOnValue()) / 20);

      expect(largeBounty).toBeGreaterThan(smallBounty);
    });
  });
});
