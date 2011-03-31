describe('RouteView', function() {
  var routeView;

  beforeEach(function() {
    setFixtures('<div id="ok"></div>');
    var controller = new IndexController('ok');
    var directions = Directions.create('Lansing, MI', 'Ann Arbor, MI', 'DRIVING');
    directions.directionsResult = GoogleResult.driving;
    controller.directions.driving = directions;
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
        methodology: function() { },
        toString: function() { return 123.5 },
        value: function() { return 123.5 }
      };
      var segment = Segment.create(0, { distance: 1.0,  travel_mode: 'DRIVING' });
      routeView.updateSegmentEmissions(segment, emissionEstimate);
      expect($('#driving_segment_0').html()).toContain('272.27');
    });
  });
});
