requirejs.config({baseUrl: 'js'});

requirejs(
  function() {
    function onDeviceReady() {
      if (StatusBar.isVisible) {
        StatusBar.hide();
      }

      $(window).on('click', (e) => {
        if (!$('#spacer-nav').hasClass('collapsed')) {
          $('#spacer-nav').collapse('hide');
        }
      });

      FastClick.attach(document.body);
    }

    document.addEventListener("deviceready", onDeviceReady, false);

    document.addEventListener("backbutton", (e) => {
      if (confirm('Are you sure you want to quit?')) {
        return navigator.app.exitApp();
      }

      e.preventDefault();
    }, false);
  }
);
