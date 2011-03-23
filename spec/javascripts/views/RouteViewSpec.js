describe('RouteView', function() {
  var routeView;

  beforeEach(function() {
    var directions = Directions.create('Lansing, MI', 'Ann Arbor, MI', 'DRIVING');
    directions.directionsResult = GoogleResult.driving;
    routeView = new RouteView(directions);
  });

  describe('#update', function() {
    it('updates the #route div with directions', function() {
      setFixtures('<div id="routing"><div class="driving"></div></div>');
      routeView.update();
      expect($('#routing .driving').html()).toContain('Go there');
    });
  });

  describe('#updateSegmentEmissions', function() {
    it('updates the emissions of a segment', function() {
      setFixtures('<div id="routing"><div class="driving"></div></div>');
      routeView.update();
      var emissionEstimate = {
        methodology: function() { },
        toString: function() { return 'BINGO' }
      };
      var segment = Segment.create(0, { distance: 1.0,  travel_mode: 'DRIVING' });
      routeView.updateSegmentEmissions(segment, emissionEstimate);
      expect($('#driving_segment_0').html()).toContain('BINGO');
    });
  });
});
