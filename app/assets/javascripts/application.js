var $ = require('jquery-browserify'),
    IndexController = require('./controllers/index-controller');

$(document).ready( function() {
  $(document).ready(function() {
    mc = new IndexController('map_canvas');
    mc.init();
    $( 'input[placeholder], textarea[placeholder]' ).placeHoldize();
  });
})
