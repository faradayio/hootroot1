var domready = require('domready'),
    IndexController = require('./controllers/index-controller');

domready(function() {
  mc = new IndexController('#map_canvas');
  mc.init();
});
