import { describe, it, expect } from 'vitest';
import { loadAMD } from './helpers/amd.mjs';

const { builder } = loadAMD('www/js/strbuf.js');

describe('strbuf', () => {
  it('returns empty string from a fresh builder', () => {
    expect(builder().getbuffer()).toBe('');
  });

  it('accepts an initial string', () => {
    expect(builder('hello').getbuffer()).toBe('hello');
  });

  it('appends strings and returns them concatenated', () => {
    const b = builder();
    b.append('foo');
    b.append('bar');
    expect(b.getbuffer()).toBe('foobar');
  });

  it('appends to an initial string', () => {
    const b = builder('hello ');
    b.append('world');
    expect(b.getbuffer()).toBe('hello world');
  });

  it('handles many small appends', () => {
    const b = builder();
    for (let i = 0; i < 100; i++) b.append('x');
    expect(b.getbuffer()).toBe('x'.repeat(100));
  });

  it('handles strings longer than the 12-byte alignment boundary', () => {
    const b = builder();
    b.append('hello world!!'); // 13 chars, over the 12-byte align
    expect(b.getbuffer()).toBe('hello world!!');
  });

  it('getbuffer is idempotent on repeated calls', () => {
    const b = builder('test');
    expect(b.getbuffer()).toBe('test');
    expect(b.getbuffer()).toBe('test');
  });
});
