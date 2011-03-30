describe('WalkingSegment', function() {
  it('converts distance to kilometers', function() {
    var ws = new WalkingSegment(0, { distance: { value: 3401 } });
    expect(ws.distance).toBeClose(3.401, 0.0001)
  });
  it('provides duration', function() {
    var ws = new WalkingSegment(0, { duration: { value: 120 } });
    expect(ws.duration).toBe(120)
  });
  describe('#getEmissionEstimateWithSegment', function() {
    it('results in zero emissions', function() {
      var walk = new WalkingSegment(0, {
        distance: { value: 28.5 },
        instructions: 'Go here' });
      
      var emissions, step;
      walk.getEmissionEstimateWithSegment(function(f_step, emissionEstimate) {
        step = f_step;
        emissions = emissionEstimate.value();
      });

      expect(step.index).toBe(0);
      expect(emissions).toBe(0);
    });
  });
});
