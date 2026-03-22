// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Layout } from '../src/layout';

/* Create a Layout with manually set viewport dimensions (bypasses DOM). */
function makeLayout(width = 800, height = 600) {
  const layout = new Layout('test-id');
  layout.width_px  = width;
  layout.height_px = height;
  return layout;
}

describe('Layout', () => {
  describe('construction', () => {
    it('defaults fov to SCALE_DEFAULT_AU', () => {
      const l = new Layout('test');
      expect(l.fov_au).toBe(Layout.SCALE_DEFAULT_AU);
    });

    it('starts with zero dimensions', () => {
      const l = new Layout('test');
      expect(l.width_px).toBe(0);
      expect(l.height_px).toBe(0);
    });

    it('starts with zero offsets', () => {
      const l = new Layout('test');
      expect(l.offset_x).toBe(0);
      expect(l.offset_y).toBe(0);
    });
  });

  describe('scale_px', () => {
    it('returns the smaller dimension', () => {
      const l = makeLayout(800, 600);
      expect(l.scale_px).toBe(600);
    });

    it('handles square viewports', () => {
      const l = makeLayout(500, 500);
      expect(l.scale_px).toBe(500);
    });

    it('handles portrait orientation', () => {
      const l = makeLayout(400, 700);
      expect(l.scale_px).toBe(400);
    });
  });

  describe('zero_x / zero_y / zero', () => {
    it('zero_x is half width', () => {
      expect(makeLayout(800, 600).zero_x).toBe(400);
    });

    it('zero_y is half height', () => {
      expect(makeLayout(800, 600).zero_y).toBe(300);
    });

    it('zero is the smaller of zero_x and zero_y', () => {
      expect(makeLayout(800, 600).zero).toBe(300);
    });
  });

  describe('px_per_meter', () => {
    it('is positive for non-zero viewport', () => {
      expect(makeLayout().px_per_meter).toBeGreaterThan(0);
    });

    it('increases when fov_au decreases (zooming in)', () => {
      const l = makeLayout();
      const ppm_wide = l.px_per_meter;
      l._fov_au = 1;
      const ppm_narrow = l.px_per_meter;
      expect(ppm_narrow).toBeGreaterThan(ppm_wide);
    });
  });

  describe('fov_au', () => {
    it('clamps to SCALE_MIN_AU', () => {
      const l = makeLayout();
      l.fov_au = 0;
      expect(l.fov_au).toBeGreaterThanOrEqual(Layout.SCALE_MIN_AU);
    });

    it('clamps to SCALE_MAX_AU', () => {
      const l = makeLayout();
      l.fov_au = 1000;
      expect(l.fov_au).toBeLessThanOrEqual(Layout.SCALE_MAX_AU);
    });

    it('fires on_scale callback', () => {
      let called = false;
      const l = makeLayout();
      l.on_scale = () => { called = true; };
      l.fov_au = 5;
      expect(called).toBe(true);
    });
  });

  describe('scale', () => {
    it('returns 0 for 0 meters', () => {
      expect(makeLayout().scale(0)).toBe(0);
    });

    it('returns positive px for positive meters', () => {
      expect(makeLayout().scale(1e9)).toBeGreaterThan(0);
    });

    it('scales proportionally', () => {
      const l = makeLayout();
      const s1 = l.scale(1e9);
      const s2 = l.scale(2e9);
      expect(s2).toBeCloseTo(s1 * 2, 5);
    });
  });

  describe('scale_point', () => {
    it('maps [0,0,0] to viewport center when no offset', () => {
      const l = makeLayout(800, 600);
      const [x, y] = l.scale_point([0, 0, 0]);
      expect(x).toBe(400); // zero_x
      expect(y).toBe(300); // zero_y
    });

    it('Y axis is flipped (positive Y maps below center)', () => {
      const l = makeLayout(800, 600);
      const [, y_pos] = l.scale_point([0, 1e11, 0]);
      const [, y_neg] = l.scale_point([0, -1e11, 0]);
      expect(y_pos).toBeLessThan(300);    // positive Y moves UP on screen (lower y)
      expect(y_neg).toBeGreaterThan(300);  // negative Y moves DOWN
    });

    it('incorporates offset', () => {
      const l = makeLayout(800, 600);
      l.offset_x = 50;
      l.offset_y = -30;
      const [x, y] = l.scale_point([0, 0, 0]);
      expect(x).toBe(450); // zero_x + offset_x
      expect(y).toBe(270); // zero_y + offset_y
    });

    it('no_offset flag skips offset', () => {
      const l = makeLayout(800, 600);
      l.offset_x = 50;
      l.offset_y = -30;
      const [x, y] = l.scale_point([0, 0, 0], true);
      expect(x).toBe(400); // zero_x only
      expect(y).toBe(300); // zero_y only
    });
  });

  describe('is_visible', () => {
    it('origin is visible in a standard viewport', () => {
      expect(makeLayout().is_visible([0, 0, 0])).toBe(true);
    });

    it('a very distant point is not visible', () => {
      const l = makeLayout();
      expect(l.is_visible([1e15, 1e15, 0])).toBe(false);
    });
  });

  describe('scale_path', () => {
    it('scales all points', () => {
      const l = makeLayout();
      const points = [[0, 0, 0], [1e10, 0, 0], [0, 1e10, 0]];
      const result = l.scale_path(points);
      expect(result.length).toBe(3);
    });

    it('decimates to max points', () => {
      const l = makeLayout();
      const points = Array.from({ length: 100 }, (_, i) => [i * 1e9, 0, 0]);
      const result = l.scale_path(points, 10);
      expect(result.length).toBeLessThanOrEqual(11); // max + possible trailing point
    });
  });

  describe('clear_zero', () => {
    it('forces recalculation of center', () => {
      const l = makeLayout(800, 600);
      expect(l.zero_x).toBe(400);
      l.width_px = 1000;
      expect(l.zero_x).toBe(400); // still cached
      l.clear_zero();
      expect(l.zero_x).toBe(500); // recalculated
    });
  });
});
