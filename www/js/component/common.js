define(function(require, exports, module) {
  const Vue  = require('vendor/vue');
  const util = require('util');

  Vue.filter('csn', function (value) {
    return util.csn((value || 0).toString());
  });

  Vue.filter('R', function (value, places) {
    return util.R((value || 0).toString(), places);
  });

  Vue.filter('unit', function (value, unit) {
    return (value || 0).toString() + ' ' + unit;
  });
});
