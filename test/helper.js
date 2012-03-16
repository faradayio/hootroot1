var helper;

module.exports = helper = {
  jsdom: require('jsdom').jsdom,
  vows: require('vows'),
  assert: require('assert'),
  sinon: require('sinon')
};

window = helper.jsdom("<html><head></head><body></body></html>").createWindow();
global.navigator = {
  userAgent: 'vows'
};
global.window = window;
global.document = window.document;
global.location = { href: "http://localhost" };
global.document.location = global.location;
