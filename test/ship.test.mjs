// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import Ship from '../src/ship';

/* Construct a ship with known properties for testing. Shuttle is the
 * simplest class with predictable values. */
function makeShip(type = 'shuttle', opts = {}) {
  return new Ship({ type, ...opts });
}

describe('Ship', () => {
  describe('construction', () => {
    it('creates a ship from a type', () => {
      const s = makeShip();
      expect(s.type).toBe('shuttle');
    });

    it('starts with full fuel', () => {
      const s = makeShip();
      expect(s.fuel).toBe(s.tank);
    });

    it('starts with no damage', () => {
      const s = makeShip();
      expect(s.damage.hull).toBe(0);
      expect(s.damage.armor).toBe(0);
    });

    it('starts with empty cargo', () => {
      const s = makeShip();
      expect(s.cargoUsed).toBe(0);
    });

    it('throws on unknown ship type', () => {
      expect(() => new Ship({ type: 'nonexistent' })).toThrow();
    });

    it('restores saved addons', () => {
      const s = makeShip('shuttle', { addons: ['armor'] });
      expect(s.addons).toContain('armor');
    });
  });

  describe('mass accounting', () => {
    it('mass includes base class + drive', () => {
      const s = makeShip();
      expect(s.mass).toBeGreaterThan(0);
      expect(s.mass).toBe(s.shipclass.mass + s.driveMass);
    });

    it('nominalMass equals base mass without full_tank', () => {
      const s = makeShip();
      expect(s.nominalMass()).toBe(s.mass);
    });

    it('nominalMass with full_tank adds tank capacity', () => {
      const s = makeShip();
      expect(s.nominalMass(true)).toBe(s.mass + s.tank);
    });

    it('currentMass includes fuel', () => {
      const s = makeShip();
      expect(s.currentMass()).toBeGreaterThan(s.mass);
    });

    it('cargoMass is 0 when hold is empty', () => {
      expect(makeShip().cargoMass()).toBe(0);
    });

    it('cargoMass increases after loading cargo', () => {
      const s = makeShip();
      s.loadCargo('fuel', 1);
      expect(s.cargoMass()).toBeGreaterThan(0);
    });

    it('addOnMass is 0 with no addons', () => {
      expect(makeShip().addOnMass()).toBe(0);
    });

    it('addOnMass increases with addons', () => {
      const s = makeShip('shuttle', { addons: ['armor'] });
      expect(s.addOnMass()).toBeGreaterThan(0);
    });
  });

  describe('acceleration and thrust', () => {
    it('thrust is positive', () => {
      expect(makeShip().thrust).toBeGreaterThan(0);
    });

    it('acceleration is thrust / mass', () => {
      const s = makeShip();
      expect(s.acceleration).toBeCloseTo(s.thrust / s.mass, 5);
    });

    it('currentAcceleration accounts for fuel and cargo', () => {
      const s = makeShip();
      expect(s.currentAcceleration()).toBeCloseTo(s.thrust / s.currentMass(), 5);
    });

    it('extra_mass reduces currentAcceleration', () => {
      const s = makeShip();
      const a_base = s.currentAcceleration();
      const a_loaded = s.currentAcceleration(1000);
      expect(a_loaded).toBeLessThan(a_base);
    });
  });

  describe('fuel', () => {
    it('thrustRatio of full thrust is 1', () => {
      const s = makeShip();
      const full_accel = s.thrust / s.currentMass();
      expect(s.thrustRatio(full_accel)).toBeCloseTo(1, 5);
    });

    it('thrustRatio of half thrust is ~0.5', () => {
      const s = makeShip();
      const half_accel = s.thrust / s.currentMass() / 2;
      expect(s.thrustRatio(half_accel)).toBeCloseTo(0.5, 5);
    });

    it('burnRate is positive', () => {
      expect(makeShip().burnRate(1)).toBeGreaterThan(0);
    });

    it('higher acceleration means higher burn rate', () => {
      const s = makeShip();
      expect(s.burnRate(10)).toBeGreaterThan(s.burnRate(1));
    });

    it('maxBurnTime is positive at current acceleration', () => {
      const s = makeShip();
      expect(s.maxBurnTime(s.currentAcceleration())).toBeGreaterThan(0);
    });

    it('burn reduces fuel', () => {
      const s = makeShip();
      const before = s.fuel;
      s.burn(1);
      expect(s.fuel).toBeLessThan(before);
    });

    it('refuel increases fuel up to tank', () => {
      const s = makeShip();
      s.fuel = 0;
      s.refuel(s.tank + 100);
      expect(s.fuel).toBe(s.tank);
    });

    it('needsFuel is false at full tank', () => {
      expect(makeShip().needsFuel()).toBe(false);
    });

    it('needsFuel is true after burning', () => {
      const s = makeShip();
      s.burn(1);
      expect(s.needsFuel()).toBe(true);
    });
  });

  describe('cargo', () => {
    it('cargoSpace is positive', () => {
      expect(makeShip().cargoSpace).toBeGreaterThan(0);
    });

    it('loadCargo increases cargoUsed', () => {
      const s = makeShip();
      s.loadCargo('fuel', 1);
      expect(s.cargoUsed).toBe(1);
    });

    it('unloadCargo decreases cargoUsed', () => {
      const s = makeShip();
      s.loadCargo('fuel', 2);
      s.unloadCargo('fuel', 1);
      expect(s.cargoUsed).toBe(1);
    });

    it('loadCargo throws when hold is full', () => {
      const s = makeShip();
      expect(() => s.loadCargo('fuel', s.cargoSpace + 1)).toThrow('no room');
    });

    it('holdIsFull is true at capacity', () => {
      const s = makeShip();
      s.loadCargo('fuel', s.cargoSpace);
      expect(s.holdIsFull).toBe(true);
    });

    it('holdIsEmpty is true initially', () => {
      expect(makeShip().holdIsEmpty).toBe(true);
    });
  });

  describe('damage model', () => {
    it('applyDamage depletes armor first', () => {
      const s = makeShip();
      const armor = s.armor;
      s.applyDamage(1);
      expect(s.armor).toBe(armor - 1);
      expect(s.hull).toBe(s.fullHull); // hull untouched
    });

    it('applyDamage overflows to hull after armor is gone', () => {
      const s = makeShip();
      const total = s.armor + 1;
      s.applyDamage(total);
      expect(s.armor).toBe(0);
      expect(s.hull).toBe(s.fullHull - 1);
    });

    it('applyDamage returns true when destroyed', () => {
      const s = makeShip();
      const total = s.fullArmor + s.fullHull;
      expect(s.applyDamage(total)).toBe(true);
      expect(s.isDestroyed).toBe(true);
    });

    it('applyDamage returns false when alive', () => {
      const s = makeShip();
      expect(s.applyDamage(1)).toBe(false);
    });

    it('damageMalus is 0 when undamaged', () => {
      expect(makeShip().damageMalus()).toBe(0);
    });

    it('damageMalus increases with hull damage', () => {
      const s = makeShip();
      s.applyDamage(s.fullArmor + 1); // 1 point hull damage
      expect(s.damageMalus()).toBeGreaterThan(0);
    });

    it('repairDamage reduces damage', () => {
      const s = makeShip('cruiser'); // hull=20, armor=15
      s.applyDamage(s.fullArmor + 5); // 5 hull damage
      s.repairDamage(3, 0);
      expect(s.damage.hull).toBe(2);
    });

    it('hasDamage is false when undamaged', () => {
      expect(makeShip().hasDamage()).toBe(false);
    });
  });

  describe('addons', () => {
    it('installAddOn adds to the list', () => {
      const s = makeShip();
      s.installAddOn('armor');
      expect(s.hasAddOn('armor')).toBe(1);
    });

    it('removeAddOn removes from the list', () => {
      const s = makeShip('shuttle', { addons: ['armor'] });
      s.removeAddOn('armor');
      expect(s.hasAddOn('armor')).toBe(0);
    });

    it('availableHardPoints decreases with addons', () => {
      const s = makeShip();
      const before = s.availableHardPoints();
      s.installAddOn('armor');
      expect(s.availableHardPoints()).toBe(before - 1);
    });

    it('addons affect attr values', () => {
      const base = makeShip();
      const upgraded = makeShip('shuttle', { addons: ['armor'] });
      expect(upgraded.fullArmor).toBeGreaterThan(base.fullArmor);
    });
  });

  describe('valuation', () => {
    const mockMarket = {
      sellPrice: (item) => 10,
    };

    it('shipValue is positive', () => {
      expect(makeShip().shipValue(mockMarket)).toBeGreaterThan(0);
    });

    it('addOnValue is 0 with no addons', () => {
      expect(makeShip().addOnValue()).toBe(0);
    });

    it('addOnValue is positive with addons', () => {
      const s = makeShip('shuttle', { addons: ['armor'] });
      expect(s.addOnValue()).toBeGreaterThan(0);
    });

    it('cargoValue is 0 when empty', () => {
      expect(makeShip().cargoValue(mockMarket)).toBe(0);
    });

    it('damageValue is 0 when undamaged', () => {
      expect(makeShip().damageValue()).toBe(0);
    });

    it('damageValue is negative when damaged', () => {
      const s = makeShip();
      s.applyDamage(1);
      expect(s.damageValue()).toBeLessThan(0);
    });

    it('trade-in price is less than full price', () => {
      const s = makeShip();
      const full = s.price(false, mockMarket);
      const tradein = s.price(true, mockMarket);
      expect(tradein).toBeLessThan(full);
    });
  });
});
