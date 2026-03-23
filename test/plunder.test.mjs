// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { executePlunder } from '../src/component/transit-controller';
import Ship from '../src/ship';

function makeShip(type, cargoItems = {}) {
  const ship = new Ship({ type });
  for (const [item, amt] of Object.entries(cargoItems)) {
    ship.loadCargo(item, amt);
  }
  return ship;
}

describe('executePlunder', () => {
  it('pirate takes cargo up to their hold capacity', () => {
    const player = makeShip('schooner', { ore: 8, metal: 6 }); // 14 cu total
    const pirate = makeShip('guardian'); // 10 cargo capacity, empty hold

    expect(player.cargoUsed).toBe(14);
    expect(pirate.cargoUsed).toBe(0);

    const result = executePlunder(player, pirate);

    // Pirate should be full (10 cu taken)
    expect(pirate.cargoUsed).toBe(10);
    // Player should have 4 cu remaining
    expect(player.cargoUsed).toBe(4);
    expect(result.took.count).toBe(10);
  });

  it('player retains correct cargo after plunder', () => {
    const player = makeShip('schooner', { ore: 8, metal: 6 }); // 14 cu
    const pirate = makeShip('guardian'); // 10 capacity

    executePlunder(player, pirate);

    // The remaining 4 cu should be verifiable via count()
    let remaining = 0;
    for (const item of player.cargo.keys()) {
      remaining += player.cargo.count(item);
    }
    expect(remaining).toBe(4);
  });

  it('pirate with existing cargo takes less', () => {
    const player = makeShip('schooner', { ore: 10 });
    const pirate = makeShip('guardian', { water: 5 }); // 5 of 10 slots used

    const result = executePlunder(player, pirate);

    // Pirate can only take 5 more
    expect(pirate.cargoUsed).toBe(10);
    expect(player.cargoUsed).toBe(5);
    expect(result.took.count).toBeGreaterThanOrEqual(5);
  });

  it('pirate swaps low-value cargo for high-value when full', () => {
    // Pirate has 10 cargo, already full of water (value 1)
    const player = makeShip('schooner', { electronics: 5 }); // high value
    const pirate = makeShip('guardian', { water: 10 }); // full of cheap stuff

    const result = executePlunder(player, pirate);

    // Pirate should have swapped water for electronics
    expect(result.took.count).toBeGreaterThan(0);
    expect(result.gave.count).toBeGreaterThan(0);
    // Player should still have same total cargo count (swapped, not lost)
    expect(player.cargoUsed).toBe(5);
  });

  it('empty player hold means nothing is taken', () => {
    const player = makeShip('schooner');
    const pirate = makeShip('guardian');

    const result = executePlunder(player, pirate);

    expect(result.took.count).toBe(0);
    expect(result.gave.count).toBe(0);
    expect(player.cargoUsed).toBe(0);
  });

  it('cargo.count() matches cargo.get() for integer quantities', () => {
    const player = makeShip('schooner', { ore: 8, metal: 6 });
    const pirate = makeShip('guardian');

    executePlunder(player, pirate);

    // After plunder with integer operations, count() and get() should agree
    for (const item of player.cargo.keys()) {
      const raw = player.cargo.get(item);
      const truncated = player.cargo.count(item);
      expect(truncated).toBe(Math.floor(raw));
      // No fractional residue from integer operations
      expect(raw % 1).toBe(0);
    }
  });

  it('cargo survives JSON round-trip after plunder', () => {
    const player = makeShip('schooner', { ore: 8, metal: 6 }); // 14 cu
    const pirate = makeShip('guardian');

    executePlunder(player, pirate);
    expect(player.cargoUsed).toBe(4);

    // Simulate save/restore cycle
    const json = JSON.stringify(player);
    const restored = new Ship(JSON.parse(json));

    expect(restored.cargoUsed).toBe(4);
    let remaining = 0;
    for (const item of restored.cargo.keys()) {
      remaining += restored.cargo.count(item);
    }
    expect(remaining).toBe(4);
  });

  it('plunder is idempotent - calling twice doubles the effect', () => {
    const player = makeShip('schooner', { ore: 14 });
    const pirate = makeShip('guardian');

    executePlunder(player, pirate);
    expect(player.cargoUsed).toBe(4);
    expect(pirate.cargoUsed).toBe(10);

    // Second plunder on same ships - pirate is full, player has 4 low-value
    // Since pirate is full of same item, no swap possible
    const result2 = executePlunder(player, pirate);
    // Pirate is already full of ore, player has ore - no swap (same value)
    expect(result2.took.count).toBe(0);
    expect(player.cargoUsed).toBe(4);
  });
});
