import { describe, it, expect } from 'vitest';
import { createLoader } from '../helpers/amd.js';

// Each test file gets its own loader so module state doesn't leak between suites.
const loader = createLoader();
const { CelestialBody, LaGrangePoint, SpaceThing, isCelestialBody, isLaGrangePoint } =
  loader.load('www/js/system/CelestialBody.js');

// Minimal sun data: static body with no orbital elements.
const sunData = {
  name: 'Sun',
  type: 'star',
  radius: 695700,
  mass: 1.989e30,
};

// Earth data from the real data file, used for orbital mechanics tests.
const earthData = {
  name: 'Earth',
  type: 'planet',
  radius: 6371.01,
  mass: 5.97219e24,
  tilt: 23.45,
  elements: {
    format: 'jpl-3000-3000',
    base: { a: 1.00000018, e: 0.01673163, i: -0.00054346, L: 100.46691572, lp: 102.93005885, node: -5.11260389 },
    cy:   { a: -0.00000003, e: -0.00003661, i: -0.01337178, L: 35999.37306329, lp: 0.31795260, node: -0.24123856 },
  },
};

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

describe('SpaceThing', () => {
  it('stores key, name, and type', () => {
    const s = new SpaceThing('sun', 'Sun', 'star', 695700);
    expect(s.key).toBe('sun');
    expect(s.name).toBe('Sun');
    expect(s.type).toBe('star');
  });

  it('converts radius from km to meters', () => {
    const s = new SpaceThing('sun', 'Sun', 'star', 1);
    expect(s.radius).toBe(1000);
  });
});

describe('CelestialBody', () => {
  describe('construction', () => {
    it('creates a static body (sun) with no central', () => {
      const sun = new CelestialBody('sun', sunData, undefined);
      expect(sun.name).toBe('Sun');
      expect(sun.central).toBeUndefined();
    });

    it('creates an orbiting body with a central reference', () => {
      const sun = new CelestialBody('sun', sunData, undefined);
      const earth = new CelestialBody('earth', earthData, sun);
      expect(earth.name).toBe('Earth');
      expect(earth.central).toBe(sun);
    });

    it('computes mu from mass and G', () => {
      const sun = new CelestialBody('sun', sunData, undefined);
      const G = 6.67408e-11;
      expect(sun.mu).toBeCloseTo(sunData.mass * G, 0);
    });
  });

  describe('adaptData', () => {
    it('converts AU semi-major axis to meters for jpl-3000-3000 format', () => {
      const adapted = CelestialBody.adaptData(earthData);
      const AU = 149597870700;
      expect(adapted.elements.base.a).toBeCloseTo(earthData.elements.base.a * AU, 0);
    });

    it('does not mutate the original data object', () => {
      const original = earthData.elements.base.a;
      CelestialBody.adaptData(earthData);
      expect(earthData.elements.base.a).toBe(original);
    });
  });

  describe('orbital mechanics', () => {
    let sun, earth;
    sun = new CelestialBody('sun', sunData, undefined);
    earth = new CelestialBody('earth', earthData, sun);

    it('period() returns a positive number in seconds', () => {
      const p = earth.period(J2000);
      expect(p).toBeGreaterThan(0);
    });

    it('orbital period of Earth is approximately 1 year in seconds', () => {
      const p = earth.period(J2000);
      const oneYear = 365.25 * 24 * 3600;
      // Within 2% of a sidereal year
      expect(Math.abs(p - oneYear) / oneYear).toBeLessThan(0.02);
    });

    it('getElementsAtTime returns all six Keplerian elements', () => {
      const el = earth.getElementsAtTime(J2000);
      for (const key of ['a', 'e', 'i', 'L', 'lp', 'node']) {
        expect(el[key]).toBeDefined();
      }
    });

    it('getPositionAtTime returns a Frame with a 3-element position', () => {
      const frame = earth.getPositionAtTime(J2000);
      expect(frame.position).toHaveLength(3);
    });

    it('Earth position at J2000 is roughly 1 AU from the Sun', () => {
      const frame = earth.getPositionAtTime(J2000);
      const AU = 149597870700;
      const dist = Math.hypot(...frame.position);
      // Within 5% of 1 AU
      expect(Math.abs(dist - AU) / AU).toBeLessThan(0.05);
    });

    it('static body (sun) getPositionAtTime returns origin', () => {
      const frame = sun.getPositionAtTime(J2000);
      expect(frame.position).toEqual([0, 0, 0]);
    });
  });
});

describe('LaGrangePoint', () => {
  const sun = new CelestialBody('sun', sunData, undefined);
  const earth = new CelestialBody('earth', earthData, sun);
  const lgData = { name: 'Earth L4', radius: 0, offset: Math.PI / 3 };
  const l4 = new LaGrangePoint('earth_l4', lgData, earth);

  it('shares its parent body period', () => {
    expect(l4.period(J2000)).toBe(earth.period(J2000));
  });

  it('getPositionAtTime returns a 3-element position', () => {
    const frame = l4.getPositionAtTime(J2000);
    expect(frame.position).toHaveLength(3);
  });

  it('is at the same distance from origin as its parent', () => {
    const parentFrame = earth.getPositionAtTime(J2000);
    const lgFrame = l4.getPositionAtTime(J2000);
    const parentDist = Math.hypot(...parentFrame.position);
    const lgDist = Math.hypot(...lgFrame.position);
    expect(lgDist).toBeCloseTo(parentDist, -3); // within ~1000m
  });
});

describe('type guards', () => {
  const sun = new CelestialBody('sun', sunData, undefined);
  const earth = new CelestialBody('earth', earthData, sun);
  const lgData = { name: 'Earth L4', radius: 0, offset: Math.PI / 3 };
  const l4 = new LaGrangePoint('earth_l4', lgData, earth);

  it('isCelestialBody returns true for CelestialBody', () => expect(isCelestialBody(earth)).toBe(true));
  it('isLaGrangePoint returns true for LaGrangePoint', () => expect(isLaGrangePoint(l4)).toBe(true));
  // isCelestialBody checks for body.type, and LaGrangePoint also has a type field ('lagrange'),
  // so it returns true for both. isLaGrangePoint is the correct discriminator for LaGrange points.
  it('isCelestialBody returns true for LaGrangePoint (type field is present on both)', () => expect(isCelestialBody(l4)).toBe(true));
});
