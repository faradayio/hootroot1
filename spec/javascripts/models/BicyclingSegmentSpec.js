describe('BicyclingSegment', function() {
  it('provides duration', function() {
    var bicycling = new BicyclingSegment(0, {
      distance: { value: 28.5 },
      duration: { value: 4800 },
      instructions: 'Go here' });
    expect(bicycling.duration).toBe(4800);
  });

  describe('#getEmissionEstimateWithSegment', function() {
    var emissions, segment;
    beforeEach(function() {
      var bicycling = new BicyclingSegment(0, {
        distance: { value: 28.5 },
        duration: { value: 4800 },
        instructions: 'Go here' });
      bicycling.getEmissionEstimateWithSegment(function(f_segment, emissionEstimate) {
        segment = f_segment;
        emissions = emissionEstimate.value();
      });
    });

    it('passes a segment parameter', function() {
      expect(segment.index).toBe(0);
    });
    it('passes an emissions parameter', function() {
      expect(emissions).toBe(0);
    });
  });
});
