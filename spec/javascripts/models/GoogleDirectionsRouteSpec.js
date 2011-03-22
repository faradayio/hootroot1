describe('GoogleDirectionsRoute', function() {
  it('creates a google.maps.DirectionsRoute-like object from Hopstop directions', function() {
    var route = new GoogleDirectionsRoute(HopStopResult.realSubway);
    expect(route.bounds).toBeInstanceOf(google.maps.LatLngBounds)
    expect(route.copyrights).toContain('HopStop');
    expect(route.overview_path.length).toBe(4);
    expect(route.legs.length).toBe(1);
    expect(route.legs[0].steps.length).toBe(5);
    expect(route.warnings.length).toBe(0);
    // expect(route.waypoint_order).toBe([0,1,2,3]);
  });

  describe('.generateOverviewPath', function() {
    it('converts steps into an array of LatLngs', function() {
      var path = GoogleDirectionsRoute.generateOverviewPath(HopStopResult.realSubway.steps);
      expect(path[0].lat()).toBeClose(40.6819, 0.000001);
      expect(path[0].lng()).toBeClose(-73.90871, 0.000001);
      expect(path[1].lat()).toBeClose(40.68265, 0.000001);
      expect(path[1].lng()).toBeClose(-73.91002, 0.000001);
      expect(path[2].lat()).toBeClose(40.74577, 0.000001);
      expect(path[2].lng()).toBeClose(-73.98222, 0.000001);
      expect(path[3].lat()).toBeClose(40.746824, 0.000001);
      expect(path[3].lng()).toBeClose(-73.983644, 0.000001);
    });
  });

  describe('.generateBounds', function() {
    it('gets a southWest corner and a northEast corner', function() {
      var bounds = GoogleDirectionsRoute.generateBounds(HopStopResult.realSubway.steps);
      expect(bounds.getNorthEast().lat()).toBeClose(40.746824, 0.000001);
      expect(bounds.getNorthEast().lng()).toBeClose(-73.90871, 0.000001);
      expect(bounds.getSouthWest().lat()).toBeClose(40.6819, 0.000001);
      expect(bounds.getSouthWest().lng()).toBeClose(-73.983644, 0.000001);
    });
  });

  describe('.generateSteps', function() {
    it('returns an array of DirectionSteps', function() {
      var steps = GoogleDirectionsRoute.generateSteps(HopStopResult.realSubway.steps);
      expect(steps.length).toBe(5);
      expect(steps[0].duration.value).toBe(32400);
      expect(steps[0].start_location.lat()).toBeClose(40.6819, 0.0001);
      expect(steps[0].start_location.lng()).toBeClose(-73.90871, 0.00001);
      expect(steps[0].end_location.lat()).toBeClose(40.68265, 0.00001);
      expect(steps[0].end_location.lng()).toBeClose(-73.91002, 0.00001);
      expect(steps[0].instructions).toMatch('Start out');
      expect(steps[0].travel_mode).toMatch('WALKING');
      expect(steps[0].path[0].lat()).toBeClose(40.6819, 0.0001);
      expect(steps[0].path[0].lng()).toBeClose(-73.90871, 0.00001);
      expect(steps[0].path[1].lat()).toBeClose(40.68265, 0.00001);
      expect(steps[0].path[1].lng()).toBeClose(-73.91002, 0.00001);
    });
  });
});
