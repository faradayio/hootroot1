describe('BicyclingSegment', function() {
  describe('#getEmissionEstimateWithSegment', function() {
    var bicycling, emissions, segment;
    beforeEach(function() {
      var bicycling = new BicyclingSegment(0, {
        distance: { value: 28.5 },
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
