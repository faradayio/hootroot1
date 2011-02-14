describe('SegmentFactory', function() {
  describe('.from_google', function() {
    it('reutrns a DrivingSegment object', function() {
      step = { distance: 1, travel_mode: 'DRIVING' }
      segment = SegmentFactory.from_google(0, step)
      expect(segment.__proto__['emissions']).
        toEqual(DrivingSegment.prototype.emissions)
      expect(segment.emissions()).toEqual(0.0)
    })
  })
})
