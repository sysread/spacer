/*

Loader is a fast and simple way of dynamically resolving dependencies
between classes and loading them at runtime.

  // Define module Foo which depends on Bar
  // File: lib/foo.js
  Loader.module('Foo', ['Bar'], function() {
    return class Foo extends Bar {
      ...
    };
  });

  // File: lib/bar.js
  Loader.module('Bar', ['Baz'], function() {
    function Bar() {
      ...
    }

    Bar.prototype.callsToBaz = function() {
      ...
    };

    return Bar;
  });

  // File: lib/baz.js
  Loader.module('Baz', function() {
    const Baz = {
      asdf   : function(){},
      qwerty : function(){},
      ...
    };
  });

Namespacing with dotted notation is supported in terms of library paths;
however, it is up to you to decide how to address the lack of support in named
class expressions.

  // File: lib/foo/bar/baz.js
  Loader.module('Foo.Bar.Baz', function() {
    return class Foo_Bar_Baz {};

    // ...or maybe:
    return class FooBarBaz {};

    // ...perhaps more sensibly:
    return class Baz {};
  });

 */
const Loader = {
  libpath : 'lib/', // library path
  depends : {},     // dependency tree
  loaded  : {},     // [module]=true after completely loaded
  loading : {},     // [module]=Promise while loading
  builder : {},     // [module]=Function while loading

  /*
   * Public getter for the libraryPath, which is the base path prepended to a
   * class name to create a path to the class' javascript file. By default, the
   * libraryPath is set to "lib/".
   */
  get libraryPath() {
    return Loader.libpath;
  },

  /*
   * Public setter for the libraryPath.
   */
  set libraryPath(value) {
    if (!value.endsWith('/')) {
      value += '/';
    }

    Loader.libpath = value;
  },

  /*
   * Builds the relative URI to the module's js file.
   */
  modulePath: function(module) {
    if (Loader.isModule(module)) {
      return Loader.libpath + module.toLowerCase().split('.').join('/') + '.js';
    }
    else {
      return Loader.libpath + module;
    }
  },

  /*
   * Returns true if the identifier _looks_ like a module path (e.g. foo.bar),
   * rather than a normal javascript package (e.g. foo/bar.js).
   */
  isModule: function(name) {
    return name.indexOf('/') === -1;
  },

  /*
   * Loads a module. Returns a Promise that is fullfilled when all module
   * arguments are loaded.
   */
  require: function(...modules) {
    return Promise.all(modules.map(Loader.inject));
  },

  /*
   * Defines a module. Accepts 2 or 3 arguments, either the module name and a
   * function that returns the class definition or the module name, array of
   * dependencies (other classes to load first), and then a builder function.
   * The builder, regardless of what it builds, must return the object to be
   * resolved to the module name in the global namespace.
   *
   *   Loader.module('Foo', ['Bar'], function() {
   *     return class Foo extends Bar {};
   *   });
   *
   *   Loader.module('Bar', function() {
   *     return class Bar {};
   *   });
   *
   *   Loader.module('Baz', function() {
   *     const Baz = {};
   *     return Baz;
   *   });
   *
   *   Loader.module('Bat', function() {
   *     function Bat() {}
   *     Bat.prototype.something = function(){};
   *     return Bat;
   *   });
   */
  module: function(name, ...args) {
    let requires, build;

    if (args.length === 1) {
      requires = [];
      build = args[0];
    }
    else {
      requires = args[0];
      build = args[1];
    }

    Loader.depends[name] = {};
    Loader.builder[name] = build;

    if (Loader.isLoading(name)) {
      for (const dep of requires) {
        if (Loader.dependsOn(dep, name)) {
          throw new Error(`Circular dependency detected between ${dep} and ${name}`);
        }
      }
    }

    for (const dep of requires) {
      Loader.depends[name][dep] = true;
    }

    return Loader.require(...requires);
  },

  /*
   * Returns true if the module has been completely loaded.
   */
  isLoaded: function(module) {
    return Loader.loaded.hasOwnProperty(module);
  },

  /*
   * Returns true if the module or one of its dependencies is in the process of
   * being loaded.
   */
  isLoading: function(module) {
    return Loader.loading.hasOwnProperty(module);
  },

  /*
   * Returns true if the first module name argument depends on the second.
   */
  dependsOn: function(a, b) {
    for (const dep of Loader.dependencies(a)) {
      if (dep === b) {
        return true;
      }
    }

    return false;
  },

  /*
   * Returns a list of unique dependencies for the provided module name.
   */
  dependencies: function(module) {
    const deps  = {};
    const queue = Object.keys(Loader.depends[module] || {});

    while (queue.length > 0) {
      const node = queue.shift();

      if (!deps.hasOwnProperty(node)) {
        deps[node] = true;

        if (Loader.depends.hasOwnProperty(node)) {
          for (const dep of Object.keys(Loader.depends[node])) {
            queue.push(dep);
          }
        }
      }
    }

    return Object.keys(deps);
  },

  /*
   * Returns a list of unique dependencies for the provided module name which
   * have not yet been loaded.
   */
  unmet: function(module) {
    return Loader.dependencies(module).filter(m => {
      return !Loader.loaded.hasOwnProperty(m);
    });
  },

  /*
   * Injects a script element into the document head to load the provided
   * module name. Returns a Promise that resolves once the script has loaded.
   */
  inject: function(module) {
    if (Loader.loaded.hasOwnProperty(module)) {
      return Promise.resolve(module);
    }

    if (Loader.loading.hasOwnProperty(module)) {
      return Loader.loading[module];
    }

    const promise = new Promise((resolve, reject) => {
      const path   = Loader.modulePath(module);
      const head   = document.getElementsByTagName('head')[0];
      const script = document.createElement('script');

      script.setAttribute('src', path);

      script.addEventListener('load', ev => {
        resolve(module);
      });

      script.addEventListener('error', ev => {
        console.error('Error loading', module, 'from', ev.target.src);
        reject(module);
      });

      head.appendChild(script);
    });

    Loader.loading[module] = Loader.isModule(module)
      ? promise.then(Loader.defmod)
      : promise.then(Loader.complete);

    return Loader.loading[module];
  },

  /*
   * Callback triggered when the module's script tag has resolved. If all
   * dependencies have been loaded, installs the module in the global
   * namespace. Otherwise, returns a Promise that does the same once all
   * dependencies are met.
   *
   * This is an internal function and not part of the public API.
   */
  defmod: function(name) {
    if (Loader.isLoaded(name)) {
      return;
    }
console.log('defmod', name);
    const pending = Loader.unmet(name);

    if (pending.length > 0) {
      return Promise.all(pending.map(m => { return Loader.loading[m] }))
        .then(loaded => { return Loader.defmod(name) });
    }
    else {
      const module = Loader.builder[name]();

      if (module) {
        let parts = name.split('.');
        const ident = parts.pop();
        let target = window;

        while (parts.length > 0) {
          let ns = parts.shift();

          if (!target.hasOwnProperty(ns)) {
            target[ns] = {};
          }

          target = target[ns];
        }

        Object.assign(module, target[ident]);
        target[ident] = module;
      }

      Loader.complete(name);
    }
  },

  complete: function(name) {
    delete Loader.builder[name];
    delete Loader.loading[name];
    Loader.loaded[name] = true;
    console.log('loaded:', name);
  }
};

Object.freeze(Loader);
