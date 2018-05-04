requirejs.config({baseUrl: 'js'});

requirejs(['game'], function(Game) {
  function onDeviceReady() {
    if (StatusBar.isVisible) {
      StatusBar.hide();
    }

    $('#spacer-navbar').on('click', 'a', function(e) {
      e.preventDefault();
      e.stopPropagation();

      if ($(e.target).hasClass('nav-link')) {
        $('#spacer-nav a').removeClass('active');
        $(e.target).addClass('active');
        game.open($(e.target).data('name'));
      }
    });

    $(window).on('click', (e) => {
      if (!$('#spacer-nav').hasClass('collapsed')) {
        $('#spacer-nav').collapse('hide');
      }
    });

    FastClick.attach(document.body);

    console.log('starting game');
    window.game = new Game;
  }

  document.addEventListener("deviceready", onDeviceReady, false);

  document.addEventListener("backbutton", function (e) {
    if (confirm('Are you sure you want to quit?')) {
      return navigator.app.exitApp();
    }

    e.preventDefault();
  }, false);
});
