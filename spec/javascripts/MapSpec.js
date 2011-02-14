describe("Map", function() {
  var map

  beforeEach(function() {
    google = { maps: { Map: function() {},
                       LatLng: function() {},
                       MapTypeId: { ROADMAP: 'roadmap' } } }
    loadFixtures('map.html');
    map = new Map('#mapdiv')
  });

  describe('#canvas', function() {
    it('returns the map div', function() {
      expect(map.canvas()).toBe('div#mapdiv')
    })
  })
})
