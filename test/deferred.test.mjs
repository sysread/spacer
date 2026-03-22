import { describe, it, expect } from 'vitest';
import Deferred from '../src/deferred';

describe('Deferred', () => {
  it('exposes a promise', () => {
    const d = new Deferred();
    expect(d.promise).toBeInstanceOf(Promise);
  });

  it('resolves the promise externally', async () => {
    const d = new Deferred();
    d.resolve('hello');
    await expect(d.promise).resolves.toBe('hello');
  });

  it('rejects the promise externally', async () => {
    const d = new Deferred();
    d.reject(new Error('fail'));
    await expect(d.promise).rejects.toThrow('fail');
  });

  it('can be settled after a delay', async () => {
    const d = new Deferred();
    setTimeout(() => d.resolve(42), 10);
    const result = await d.promise;
    expect(result).toBe(42);
  });
});
