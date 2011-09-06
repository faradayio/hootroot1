var $ = require('jquery'),
    IndexController = require('./controllers/index-controller');

require('jquery-placeholdize')($);

$(document).ready( function() {
  $(document).ready(function() {
    mc = new IndexController('#map_canvas');
    mc.init();
    $( 'input[placeholder], textarea[placeholder]' ).placeHoldize();
  });
});
