import { describe, it, expect } from 'vitest';
import { createLoader } from '../helpers/amd.mjs';

const loader = createLoader();
const { Frame, Path, Orbit } = loader.load('www/js/system/orbit.js');
const { CelestialBody } = loader.load('www/js/system/CelestialBody.js');

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

const sunData  = { name: 'Sun',   type: 'star',   radius: 695700,   mass: 1.989e30 };
const earthData = {
  name: 'Earth', type: 'planet', radius: 6371.01, mass: 5.97219e24, tilt: 23.45,
  elements: {
    format: 'jpl-3000-3000',
    base: { a: 1.00000018, e: 0.01673163, i: -0.00054346, L: 100.46691572, lp: 102.93005885, node: -5.11260389 },
    cy:   { a: -0.00000003, e: -0.00003661, i: -0.01337178, L: 35999.37306329, lp: 0.31795260, node: -0.24123856 },
  },
};

const sun   = new CelestialBody('sun',   sunData,   undefined);
const earth = new CelestialBody('earth', earthData, sun);

describe('Frame', () => {
  describe('static body (no central)', () => {
    const frame = new Frame([1, 2, 3], undefined, J2000);

    it('relative returns the stored position', () => {
      expect(frame.relative).toEqual([1, 2, 3]);
    });

    it('absolute equals relative when there is no central', () => {
      expect(frame.absolute).toEqual([1, 2, 3]);
    });
  });

  describe('orbiting body', () => {
    // Earth frame at J2000: position relative to sun.
    const earthFrame = earth.getPositionAtTime(J2000);

    it('absolute adds the central body position', () => {
      // Sun is at origin, so earth absolute should equal earth relative.
      const abs = earthFrame.absolute;
      const rel = earthFrame.relative;
      expect(abs[0]).toBeCloseTo(rel[0], 0);
      expect(abs[1]).toBeCloseTo(rel[1], 0);
    });
  });

  describe('relativeToTime', () => {
    const frame = new Frame([1, 2, 3], undefined, J2000);
    const later = J2000 + 1000;
    const moved = frame.relativeToTime(later);

    it('returns a new Frame with the updated time', () => {
      expect(moved.time).toBe(later);
    });

    it('preserves position', () => {
      expect(moved.position).toEqual([1, 2, 3]);
    });

    it('is a new Frame instance', () => {
      expect(moved).not.toBe(frame);
    });
  });
});

describe('Path', () => {
  const f1 = new Frame([1, 0, 0], undefined, J2000);
  const f2 = new Frame([2, 0, 0], undefined, J2000);
  const path = new Path([f1, f2]);

  it('relative returns an array of positions', () => {
    expect(path.relative).toEqual([[1, 0, 0], [2, 0, 0]]);
  });

  it('absolute returns an array of absolute positions', () => {
    expect(path.absolute).toEqual([[1, 0, 0], [2, 0, 0]]);
  });

  it('relativeToTime returns a new Path with updated frame times', () => {
    const later = J2000 + 5000;
    const moved = path.relativeToTime(later);
    expect(moved.frames[0].time).toBe(later);
    expect(moved.frames[1].time).toBe(later);
  });
});

describe('Orbit', () => {
  const orbit = new Orbit(earth, J2000);

  it('stores the body and start time', () => {
    expect(orbit.body).toBe(earth);
    expect(orbit.start).toBe(J2000);
  });

  it('period matches the body period', () => {
    expect(orbit.period).toBe(earth.period(J2000));
  });

  it('central returns the central body', () => {
    expect(orbit.central).toBe(sun);
  });

  it('frames contains 360 entries (359 steps + closing frame)', () => {
    expect(orbit.frames).toHaveLength(360);
  });

  it('frames are cached on second access', () => {
    const first  = orbit.frames;
    const second = orbit.frames;
    expect(first).toBe(second);
  });

  it('path.relative contains 360 position vectors', () => {
    const rel = orbit.relative;
    expect(rel).toHaveLength(360);
    expect(rel[0]).toHaveLength(3);
  });

  it('first and last frame are at the same position (closed orbit)', () => {
    const rel = orbit.relative;
    expect(rel[0][0]).toBeCloseTo(rel[359][0], 0);
    expect(rel[0][1]).toBeCloseTo(rel[359][1], 0);
  });
});
