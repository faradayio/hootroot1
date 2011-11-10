jsdom = require('jsdom');
vows = require('vows');
assert = require('assert');
jsdom = require('jsdom');
sinon = require('sinon');

window = jsdom.jsdom("<html><head></head><body></body></html>").createWindow();
global.navigator = {
  userAgent: 'vows'
};
global.window = window;
global.document = window.document;
global.location = { href: "http://localhost" };
global.document.location = global.location;

require('./helpers/google-maps');

vows = require('vows');
sinon = require('sinon');
