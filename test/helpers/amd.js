/**
 * Minimal AMD loader for running legacy define() modules in a Node/Vitest context.
 *
 * Supports:
 * - Relative path resolution between modules
 * - Circular dependencies (pre-registers exports before running factory,
 *   so circular references work as long as they're only accessed at call time)
 * - Both export patterns: assign to exports object, or return value from factory
 *
 * Usage:
 *   import { createLoader } from './helpers/amd.js';
 *   const loader = createLoader();
 *   const { SomeExport } = loader.load('www/js/some/module.js');
 *
 * The loader caches modules by resolved path, so shared deps are only executed once.
 */

import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import vm from 'vm';

// window stub absorbs legacy global assignments (e.g. window.Physics = Physics)
// without throwing in a Node context. Remove once those assignments are cleaned up.
const window = new Proxy({}, { set: () => true });

export function createLoader() {
  const registry = new Map(); // resolvedPath -> exports

  function load(filePath) {
    const absPath = resolve(filePath);

    if (registry.has(absPath)) {
      return registry.get(absPath);
    }

    const src = readFileSync(absPath, 'utf8');
    const exports = {};

    // Pre-register before running the factory to handle circular deps.
    // If A requires B and B requires A, B will get A's (empty) exports object,
    // which will be populated by the time any method on A is actually called.
    registry.set(absPath, exports);

    const define = (deps, factory) => {
      const require = (id) => {
        // Resolve relative paths from the current module's directory.
        const depPath = id.startsWith('.')
          ? join(dirname(absPath), id) + '.js'
          : null;

        if (depPath) return load(depPath);
        throw new Error(`loadAMD: cannot resolve non-relative dep '${id}' in ${filePath}`);
      };

      const args = deps.map(dep => {
        if (dep === 'require') return require;
        if (dep === 'exports') return exports;
        return require(dep);
      });

      const result = factory(...args);

      // Some modules return their export directly rather than assigning to exports
      // (e.g. physics.js does `return Physics`). Replace the registry entry with
      // the returned value so callers get the actual class/object, not the empty
      // exports stub. This is safe because the circular-dep window has closed by
      // the time the factory returns.
      if (result !== undefined && result !== exports) {
        registry.set(absPath, result);
      }
    };

    define.amd = {};

    vm.runInNewContext(src, { define, Object, Math, Date, JSON, Error, Set, Map, Array, RegExp, parseInt, parseFloat, isNaN, isFinite, window });

    return registry.get(absPath);
  }

  return { load };
}

// Convenience wrapper for modules with no inter-module deps (original API).
export function loadAMD(filePath) {
  return createLoader().load(filePath);
}
