import { describe, it, expect } from 'vitest';
import { isBody, isLaGrange } from '../../src/system/data/body';

describe('body type guards', () => {
  describe('isBody', () => {
    it('returns true when type is present', () => expect(isBody({ type: 'planet' })).toBe(true));
    it('returns false when type is absent', () => expect(isBody({ offset: 1 })).toBe(false));
  });

  describe('isLaGrange', () => {
    it('returns true when offset is present', () => expect(isLaGrange({ offset: 1 })).toBe(true));
    it('returns false when offset is absent', () => expect(isLaGrange({ type: 'planet' })).toBe(false));
  });
});
