require('../helper');
var Directions = require('cm1-route').Directions,
    IndexController = require('controllers/index-controller'),
    RouteView = require('views/route-view');

describe('RouteView', function() {
  var routeView;

  beforeEach(function() {
    setFixtures('<div id="ok"></div>');
    var controller = {
      directions: {
        driving: {
          eachSegment: function(callback) { callback({ instructions: 'Go there', index: 0 }); }
        }
      }
    };
    routeView = new RouteView(controller, 'DRIVING');
  });

  describe('#updateDirections', function() {
    it('updates the #route div with directions', function() {
      setFixtures('<div id="routing"><div class="driving"></div></div>');
      routeView.updateDirections();
      expect($('#routing .driving').html()).toContain('Go there');
    });
  });

  describe('#updateSegmentEmissions', function() {
    it('updates the emissions of a segment', function() {
      setFixtures('<div id="routing"><div class="driving"></div></div>');
      routeView.updateDirections();
      var emissionEstimate = {
        emitter: { index: 0, distance: 1.0,  travel_mode: 'DRIVING' },
        methodology: function() { },
        toString: function() { return 123.5 },
        value: function() { return 123.5 }
      };
      routeView.updateSegmentEmissions(emissionEstimate);
      expect($('#driving_segment_0').html()).toContain('272.27');
    });
  });
});
