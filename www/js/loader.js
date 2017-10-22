requirejs.config({
  baseUrl: 'js',
});

requirejs(['game'], function(game) {
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
  }

  document.addEventListener("deviceready", onDeviceReady, false);
});
