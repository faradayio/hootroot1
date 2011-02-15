describe("MapView", function() {
  var map

  beforeEach(function() {
    google = { maps: { Map: function() {},
                       LatLng: function() {},
                       MapTypeId: { ROADMAP: 'roadmap' } } }
    setFixtures('<div id="mapdiv">hi</div>')
    mapView = new MapView('#mapdiv')
  });

  describe('#canvas', function() {
    it('returns the map div', function() {
      expect(mapView.canvas()).toBe('div#mapdiv')
    })
  })
})
