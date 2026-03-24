// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installGameMock, removeGameMock } from './helpers/game-mock.mjs';
import system from '../src/system';
import Physics from '../src/physics';

/**
 * Verify that orbital distances between parent bodies and their satellites
 * are in physically reasonable ranges. These are the distances that the
 * transit FOV calculation depends on for final approach zooming.
 */
describe('satellite orbital distances from parent bodies', () => {
  beforeEach(() => installGameMock());
  afterEach(() => removeGameMock());

  // Expected approximate distances in AU (from real solar system data,
  // but with some slack since game bodies may not match exactly)
  const satellites = {
    moon:     { parent: 'earth',   minAU: 0.001, maxAU: 0.005 },
    phobos:   { parent: 'mars',    minAU: 0.00001, maxAU: 0.001 },
    europa:   { parent: 'jupiter', minAU: 0.002, maxAU: 0.008 },
    ganymede: { parent: 'jupiter', minAU: 0.004, maxAU: 0.012 },
    callisto: { parent: 'jupiter', minAU: 0.008, maxAU: 0.020 },
  };

  for (const [moon, expected] of Object.entries(satellites)) {
    it(`${moon} is ${expected.minAU}-${expected.maxAU} AU from ${expected.parent}`, () => {
      const central = system.central(moon);
      expect(central).toBe(expected.parent);

      const moonPos = system.position(moon);
      const parentPos = system.position(expected.parent);
      const dist = Physics.distance(moonPos, parentPos) / Physics.AU;

      console.log(`${moon}-${expected.parent} distance: ${dist.toFixed(6)} AU`);
      expect(dist).toBeGreaterThan(expected.minAU);
      expect(dist).toBeLessThan(expected.maxAU);
    });
  }

  it('orbit cache position matches live position at turn 0', () => {
    const orbits = system.orbit_by_turns('moon');
    const livePos = system.position('moon');
    const dist = Physics.distance(orbits[0], livePos) / Physics.AU;
    console.log('orbit cache vs live drift at turn 0:', dist.toFixed(6), 'AU');
    expect(dist).toBeLessThan(0.001);
  });

  it('Earth-Moon distance is consistent between cache and live', () => {
    const moonOrbit = system.orbit_by_turns('moon');
    const earthOrbit = system.orbit_by_turns('earth');

    const cachedDist = Physics.distance(moonOrbit[0], earthOrbit[0]) / Physics.AU;
    const liveDist = Physics.distance(system.position('moon'), system.position('earth')) / Physics.AU;

    console.log('cached Earth-Moon:', cachedDist.toFixed(6), 'live:', liveDist.toFixed(6));
    // Both should be in the same ballpark
    expect(Math.abs(cachedDist - liveDist)).toBeLessThan(0.001);
  });
});
