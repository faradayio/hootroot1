(function() {
  if(typeof window == 'undefined') {
    var jsdom = require('jsdom');
    window = jsdom.jsdom("<html><head></head><body></body></html>").createWindow();
    global.navigator = {
      userAgent: 'jasmine'
    };
    global.window = window;
    global.document = window.document;
    global.location = { href: "http://localhost" };
    global.document.location = global.location;
  //} else {
    //// Make modules requirable in jasmine
    //var modules = Object.keys(require.modules);
    //for(var i = 0; i < modules.length; i++) {
      //var module = modules[i];
      //if(module.match(/^\//)) {
        //var stripped = module.replace(/^\//, '');
        //require.modules[stripped] = require.modules[module];
      //}
    //}
  }
})();

$ = jQuery = require('jquery');
require('jasmine-jquery');

require('./helpers/google-maps');
