import { describe, it, expect } from 'vitest';
import {
  transitDisplayDistance, formatDistance, isSubSystemTransit,
  factionColorClass,
} from '../../src/component/navcomp-controller';
import Physics from '../../src/physics';

describe('navcomp-controller', () => {
  describe('transitDisplayDistance', () => {
    it('returns undefined for null transit', () => {
      expect(transitDisplayDistance(null)).toBeUndefined();
    });

    it('returns AU for large distances', () => {
      expect(transitDisplayDistance({ au: 1.5, km: 224396806 })).toBe('1.5 AU');
    });

    it('returns km for small distances', () => {
      expect(transitDisplayDistance({ au: 0, km: 50000 })).toContain('km');
    });
  });

  describe('formatDistance', () => {
    it('formats large distances as AU', () => {
      const result = formatDistance(Physics.AU * 2);
      expect(result).toContain('AU');
    });

    it('formats small distances as km', () => {
      const result = formatDistance(1000000);
      expect(result).toContain('km');
    });

    it('threshold is 0.01 AU', () => {
      const justUnder = Physics.AU * 0.009;
      const justOver = Physics.AU * 0.011;
      expect(formatDistance(justUnder)).toContain('km');
      expect(formatDistance(justOver)).toContain('AU');
    });
  });

  describe('isSubSystemTransit', () => {
    const central = (body) => {
      const map = {
        'earth': 'sun', 'moon': 'earth', 'mars': 'sun',
        'phobos': 'mars', 'ceres': 'sun', 'sun': 'sun',
      };
      return map[body] || 'sun';
    };

    it('returns false with no destination', () => {
      expect(isSubSystemTransit(null, 'earth', central)).toBe(false);
    });

    it('returns true for moon-to-moon in same system', () => {
      // phobos orbits mars, mars is central for both
      // but we only have one mars moon in this mock, so test earth-moon
      expect(isSubSystemTransit('moon', 'earth', central)).toBe(true);
    });

    it('returns true for planet to its own moon', () => {
      expect(isSubSystemTransit('moon', 'earth', central)).toBe(true);
    });

    it('returns false for cross-system transit', () => {
      expect(isSubSystemTransit('mars', 'earth', central)).toBe(false);
    });
  });

  describe('factionColorClass', () => {
    it('returns text-success for UN', () => {
      expect(factionColorClass('UN')).toBe('text-success');
    });

    it('returns text-danger for MC', () => {
      expect(factionColorClass('MC')).toBe('text-danger');
    });

    it('returns text-warning for JFT', () => {
      expect(factionColorClass('JFT')).toBe('text-warning');
    });

    it('returns text-secondary for TRANSA', () => {
      expect(factionColorClass('TRANSA')).toBe('text-secondary');
    });

    it('returns text-info for CERES', () => {
      expect(factionColorClass('CERES')).toBe('text-info');
    });

    it('returns empty for unknown', () => {
      expect(factionColorClass('UNKNOWN')).toBe('');
    });
  });
});
