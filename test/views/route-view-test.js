var helper = require('../helper'),
    vows = helper.vows,
    assert = helper.assert,
    jsdom = helper.jsdom;
var Directions = require('cm1-route').Directions,
    IndexController = require('../../app/assets/javascripts/controllers/index-controller'),
    RouteView = require('../../app/assets/javascripts/views/route-view');

var bonzo = require('bonzo');

var controller = {
  directions: {
    driving: {
      eachSegment: function(callback) { callback({ instructions: 'Go there', index: 0 }); }
    }
  }
};

vows.describe('RouteView').addBatch({
  '#updateDirections': {
    'updates the #route div with directions': function(routeView) {
      bonzo(document.body).html('<div id="routing"><div class="driving"></div></div>');
      routeView = new RouteView(controller, 'DRIVING');
      routeView.updateDirections();
      assert.include(document.getElementsByClassName('driving')[0].innerHTML, 'Go there');
    }
  },

  '#updateSegmentEmissions': {
    topic: new RouteView(controller, 'DRIVING'),

    'updates the emissions of a segment': function(routeView) {
      bonzo(document.body).html('<div id="routing"><div class="driving"></div></div>');
      routeView.updateDirections();
      var emissionEstimate = {
        emitter: { index: 0, distance: 1.0,  travel_mode: 'DRIVING' },
        methodology: function() { },
        toString: function() { return 123.5 },
        value: function() { return 123.5 }
      };
      routeView.updateSegmentEmissions(emissionEstimate);
      assert.include(
        document.getElementById('driving_segment_0').innerHtml,
        '272.27');
    }
  }
}).export(module);
