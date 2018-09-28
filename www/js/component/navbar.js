define(function(require, exports, module) {
  const Vue = require('vendor/vue');

  require('component/global');

  Vue.component('NavBar', {
    'methods': {
      open(page) { this.game.open(page) },
    },

    'template': `
      <nav id="spacer-navbar"
           data-toggle="collapse"
           data-target="#spacer-nav"
           class="fixed-bottom navbar navbar-dark navbar-expand-md border-danger border border-left-0 border-right-0 border-bottom-0">

        <span class="navbar-brand">Spacer</span>

        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#spacer-nav">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="spacer-nav">
          <ul class="navbar-nav mr-auto">
            <li class="nav-item"><a href="#" data-name="summary"  @click="open('summary')"     class="nav-link active">Summary</a></li>
            <li class="nav-item"><a href="#" data-name="work"     @click="open('work')"        class="nav-link">Work</a></li>
            <li class="nav-item"><a href="#" data-name="docks"    @click="open('commerce')"    class="nav-link">Commerce</a></li>
            <li class="nav-item"><a href="#" data-name="fabs"     @click="open('fabricators')" class="nav-link">Fabricators</a></li>
            <li class="nav-item"><a href="#" data-name="shipyard" @click="open('shipyard')"    class="nav-link">Shipyard</a></li>
            <li class="nav-item"><a href="#" data-name="nav"      @click="open('navigation')"  class="nav-link">Navigation</a></li>
            <li class="nav-item"><a href="#" data-name="status"   @click="open('status')"      class="nav-link">Status</a></li>
            <li class="nav-item"><a href="#" data-name="test"     @click="open('test')"        class="nav-link">Testing</a></li>
          </ul>
        </div>
      </nav>
    `,
  });
});
