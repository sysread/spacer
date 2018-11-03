requirejs.config({baseUrl: 'js'});

requirejs([],
  function() {
    /*
     * Initialize system-level integrations on deviceready
     */
    document.addEventListener("deviceready", (e) => {
      if (StatusBar.isVisible) {
        StatusBar.hide();

        if (typeof AndroidFullScreen !== 'undefined') {   // Fullscreen plugin exists ?
          function errorFunction(error) { console.error(error); }
          AndroidFullScreen.isSupported(AndroidFullScreen.immersiveMode, errorFunction);
        }
      }

      FastClick.attach(document.body);
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
  }
);
