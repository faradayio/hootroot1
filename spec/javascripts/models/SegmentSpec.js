describe('Segment', function() {
  describe('.from_google', function() {
    it('reutrns a DrivingSegment object', function() {
      step = { distance: 1, travel_mode: 'DRIVING' }
      segment = Segment.from_google(0, step)
      expect(segment.__proto__['emissions']).
        toEqual(DrivingSegment.prototype.emissions)
    })
    it('returns a WalkingSegment object', function() {
      step = { distance: 1, travel_mode: 'WALKING' }
      segment = Segment.from_google(0, step)
      expect(segment.__proto__['emissions']).
        toEqual(WalkingSegment.prototype.emissions)
    })
    it('returns a BicyclingSegment object', function() {
      step = { distance: 1, travel_mode: 'BICYCLING' }
      segment = Segment.from_google(0, step)
      expect(segment.__proto__['emissions']).
        toEqual(BicyclingSegment.prototype.emissions)
    })
  })
})
