describe('Segment', function() {
  describe('.create', function() {
    it('reutrns a DrivingSegment object', function() {
      var step = { distance: 1, travel_mode: 'DRIVING' }
      var segment = Segment.create(0, step)
      expect(segment).toBeInstanceOf(DrivingSegment)
    })
    it('returns a WalkingSegment object', function() {
      var step = { distance: 1, travel_mode: 'WALKING' }
      var segment = Segment.create(0, step)
      expect(segment).toBeInstanceOf(WalkingSegment)
    })
    it('returns a BicyclingSegment object', function() {
      var step = { distance: 1, travel_mode: 'BICYCLING' }
      var segment = Segment.create(0, step)
      expect(segment).toBeInstanceOf(BicyclingSegment)
    })
    it('returns a SubwayingSegment object', function() {
      var step = { distance: 1, travel_mode: 'SUBWAYING' }
      var segment = Segment.create(0, step)
      expect(segment).toBeInstanceOf(SubwayingSegment)
    })
    it('returns a BussingSegment object', function() {
      var step = { distance: 1, travel_mode: 'BUSSING' }
      var segment = Segment.create(0, step)
      expect(segment).toBeInstanceOf(BussingSegment)
    })
  })
})
