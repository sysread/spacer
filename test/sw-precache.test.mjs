import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const swPath = resolve('www/public/sw.js');
const imgDir = resolve('www/public/img');

/* Extract the PRECACHE_URLS array from sw.js by matching the array literal. */
function parsePrecacheUrls() {
  const src = readFileSync(swPath, 'utf-8');
  const match = src.match(/PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/);
  if (!match) throw new Error('Could not find PRECACHE_URLS in sw.js');

  return match[1]
    .split('\n')
    .map(line => line.trim().replace(/[',]/g, ''))
    .filter(line => line.length > 0 && !line.startsWith('//'));
}

/* List all files in a directory (non-recursive). */
function listFiles(dir) {
  return readdirSync(dir).filter(f => !f.startsWith('.'));
}

describe('service worker precache list', () => {
  const urls = parsePrecacheUrls();

  describe('every image in www/public/img/ is precached', () => {
    const images = listFiles(imgDir);

    for (const file of images) {
      it(`img/${file} is in PRECACHE_URLS`, () => {
        expect(urls).toContain(`./img/${file}`);
      });
    }
  });

  describe('every precached path resolves to a real file', () => {
    for (const url of urls) {
      if (url === './') continue;

      it(`${url} exists on disk`, () => {
        const filePath = resolve('www/public', url.replace('./', ''));
        expect(() => readFileSync(filePath)).not.toThrow();
      });
    }
  });
});
