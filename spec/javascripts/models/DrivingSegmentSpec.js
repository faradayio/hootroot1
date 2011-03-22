describe('DrivingSegment', function() {
  it('converts distance to kilometers', function() {
    var ds = new DrivingSegment(0, { distance: { value: 3401 } });
    expect(ds.distance).toBeClose(3.401, 0.0001)
  });
  describe('#getEmissionEstimateWithSegment', function() {
    var emissions, segment;
    beforeEach(function() {
      fakeAjax({
        urls: { 'http://carbon.brighterplanet.com/automobile_trips.json?distance=0.0285':
          { successData: {emission: 6.8} } } });
      var driving = new DrivingSegment(0, {
        distance: { value: 28.5 },
        instructions: 'Go here' });
      driving.getEmissionEstimateWithSegment(function(f_segment, emissionEstimate) {
        segment = f_segment;
        emissions = emissionEstimate.value();
      });
    });

    it('passes a segment parameter', function() {
      expect(segment.index).toBe(0);
    });
    it('passes an emissions parameter', function() {
      expect(emissions).toBe(6.8);
    });
  });
});
