"use strict"

requirejs.config({baseUrl: 'js'});

requirejs([],
  function() {
    /*
     * Initialize system-level integrations on deviceready.
     * StatusBar and FastClick are Cordova plugins; guard against their
     * absence when running under a plain dev server.
     */
    document.addEventListener("deviceready", (e) => {
      if (typeof StatusBar !== 'undefined' && StatusBar.isVisible) {
        StatusBar.hide();
      }

      if (typeof FastClick !== 'undefined') {
        FastClick.attach(document.body);
      }
    }, false);

    /*
     * Add confirmation before exiting app via back button
     */
    document.addEventListener("backbutton", (e) => {
      if (confirm('Are you sure you want to quit?')) {
        return navigator.app.exitApp();
      }

      e.preventDefault();
    }, false);

    /*
     * Set some convenient globals
     */
    document.addEventListener("deviceready", (e) => {
      window.DEV = window.device.platform == 'browser' || window.device.isVirtual;

      let vue = 'vendor/vue.prod';
      if (window.DEV) {
        vue = 'vendor/vue.dev';
      }

      requirejs.config({
        paths: {
          'vendor/vue': vue
        }
      });
    });

    /*
     * When running outside Cordova (e.g. Vite dev server), the deviceready
     * event never fires because cordova.js is absent. Detect this and
     * synthesize the event so the app can bootstrap normally.
     */
    setTimeout(() => {
      if (window.device) return;

      window.DEV = true;
      window.device = { platform: 'browser', isVirtual: true };

      requirejs.config({
        paths: { 'vendor/vue': 'vendor/vue.dev' }
      });

      document.dispatchEvent(new Event('deviceready'));
    }, 500);
  }
);
