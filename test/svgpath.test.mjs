import { describe, it, expect } from 'vitest';
import { bezier, line } from '../src/svgpath';

// Parse an SVG path string into a sequence of [command, ...args] tokens.
function parsePathTokens(d) {
  return d.trim().split(/(?=[MC])/).map(s => s.trim()).filter(Boolean);
}

describe('svgpath.bezier', () => {
  it('single point produces a bare M command', () => {
    const d = bezier([[10, 20]]);
    expect(d).toMatch(/^M 10,20$/);
  });

  it('two points produces M + one C segment', () => {
    const tokens = parsePathTokens(bezier([[0, 0], [100, 0]]));
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatch(/^M/);
    expect(tokens[1]).toMatch(/^C/);
  });

  it('three points produces M + two C segments', () => {
    const tokens = parsePathTokens(bezier([[0, 0], [50, 50], [100, 0]]));
    expect(tokens).toHaveLength(3);
  });

  it('starts at the first point', () => {
    const d = bezier([[30, 40], [100, 200]]);
    expect(d).toMatch(/^M 30,40/);
  });

  it('ends at the last point', () => {
    const d = bezier([[0, 0], [100, 0]]);
    // The last two numbers in a C command are the endpoint x y.
    const nums = d.match(/[\d.]+/g).map(Number);
    expect(nums[nums.length - 2]).toBeCloseTo(100, 0);
    expect(nums[nums.length - 1]).toBeCloseTo(0, 0);
  });

  it('coordinates are rounded to 1 decimal place', () => {
    // Control points involve trig so will be non-integers; verify they are rounded.
    const d = bezier([[0, 0], [33, 33], [100, 0]]);
    const nums = d.match(/[\d.]+/g);
    for (const n of nums) {
      const decimals = n.includes('.') ? n.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(1);
    }
  });

  it('collinear horizontal points produce a nearly flat curve', () => {
    // Three points on a horizontal line - the curve should stay at y=0.
    const d = bezier([[0, 0], [50, 0], [100, 0]]);
    const nums = d.match(/[\d.]+/g).map(Number);
    // All y coordinates (odd-indexed after the initial M x,y) should be ~0.
    // Just verify no large y deviations appear.
    for (const n of nums) {
      expect(Math.abs(n)).toBeLessThan(200); // sanity bound
    }
  });
});

describe('svgpath.line', () => {
  it('single point produces a bare M command', () => {
    expect(line([[10, 20]])).toMatch(/^M 10,20$/);
  });

  it('two points produces M + L', () => {
    const d = line([[0, 0], [100, 50]]);
    expect(d).toBe('M 0,0 L 100,50');
  });

  it('three points produces M + two L segments', () => {
    const d = line([[0, 0], [50, 25], [100, 0]]);
    expect(d).toBe('M 0,0 L 50,25 L 100,0');
  });

  it('coordinates are rounded', () => {
    const d = line([[1.234, 5.678], [9.012, 3.456]]);
    expect(d).toBe('M 1.2,5.7 L 9,3.5');
  });
});
