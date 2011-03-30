describe('FlyingSegment', function() {
  it('converts distance to kilometers', function() {
    var ws = new FlyingSegment(0, { distance: { value: 3401 } });
    expect(ws.distance).toBeClose(3.401, 0.0001)
  });
  describe('#getEmissionEstimateWithSegment', function() {
    it('results in zero emissions', function() {
      var flight = new FlyingSegment(0, {
        distance: { value: 28.5 },
        instructions: 'Go here' });
      
      var emissions, step;
      flight.getEmissionEstimateWithSegment(function(f_step, emissionEstimate) {
        step = f_step;
        emissions = emissionEstimate.value();
      });

      expect(step.index).toBe(0);
      expect(emissions).toBe(0);
    });
  });
});
