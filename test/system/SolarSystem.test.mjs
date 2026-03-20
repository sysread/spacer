import { describe, it, expect } from 'vitest';
import { createLoader } from '../helpers/amd.mjs';

const loader = createLoader();
const SolarSystem = loader.load('www/js/system/SolarSystem.js');

// SolarSystem is a singleton in production but we construct fresh instances here
// so tests are isolated from each other.
describe('SolarSystem', () => {
  let system;

  system = new SolarSystem();

  describe('construction', () => {
    it('creates a bodies dictionary', () => {
      expect(system.bodies).toBeDefined();
      expect(typeof system.bodies).toBe('object');
    });

    it('loads the expected top-level bodies', () => {
      for (const name of ['sun', 'mercury', 'earth', 'mars', 'jupiter', 'saturn']) {
        expect(system.bodies[name]).toBeDefined();
      }
    });

    it('loads satellites as nested bodies', () => {
      expect(system.bodies['moon']).toBeDefined();
    });
  });

  describe('body properties', () => {
    it('earth has a central body (sun)', () => {
      expect(system.bodies['earth'].central).toBe(system.bodies['sun']);
    });

    it('moon has a central body (earth)', () => {
      expect(system.bodies['moon'].central).toBe(system.bodies['earth']);
    });

    it('sun has no central body', () => {
      expect(system.bodies['sun'].central).toBeUndefined();
    });

    it('earth is registered as a satellite of the sun', () => {
      expect(system.bodies['sun'].satellites['earth']).toBe(system.bodies['earth']);
    });
  });
});
