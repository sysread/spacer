/**
 * Minimal AMD shim for loading legacy define() modules in a Node/Vitest context.
 *
 * Usage:
 *   const exports = loadAMD('./path/to/module.js');
 *
 * Only handles modules with no external dependencies (deps array contains only
 * "require" and "exports"). Modules with real deps need those resolved first;
 * pass them as the second argument in dep order.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

export function loadAMD(filePath, injectedDeps = {}) {
  const absPath = resolve(filePath);
  const src = readFileSync(absPath, 'utf8');

  let moduleExports = null;

  // Stub define() that captures the factory's output.
  const define = (deps, factory) => {
    const exports = {};
    const require = (id) => {
      if (injectedDeps[id]) return injectedDeps[id];
      throw new Error(`loadAMD: unresolved dep '${id}' in ${filePath} - pass it via injectedDeps`);
    };

    // Map the dep list to [require, exports, ...injectedDeps].
    const args = deps.map(dep => {
      if (dep === 'require') return require;
      if (dep === 'exports') return exports;
      return require(dep);
    });

    // Some modules return their export directly; others assign to the exports object.
    const result = factory(...args);
    moduleExports = result !== undefined ? result : exports;
  };

  // AMD spec: define.amd marks a compliant loader.
  define.amd = {};

  // window stub absorbs legacy global assignments (e.g. window.Physics = Physics)
  // without throwing in a Node context. Remove once those assignments are cleaned up.
  const window = new Proxy({}, { set: () => true });

  vm.runInNewContext(src, { define, Object, window });

  return moduleExports;
}
