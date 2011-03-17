describe('WalkingSegment', function() {
  it('converts distance to kilometers', function() {
    var ws = new WalkingSegment(0, { distance: { value: 3401 } });
    expect(ws.distance).toBeClose(3.401, 0.0001)
  });
  it('uses duration if no distance given', function() {
    var ws = new WalkingSegment(0, { duration: { value: 120 } });
    expect(ws.duration).toBe(120)
  });
  describe('#getEmissionEstimateWithIndex', function() {
    it('results in zero emissions', function() {
      var walk = new WalkingSegment(0, {
        distance: { value: 28.5 },
        instructions: 'Go here' });
      
      var emissions, index;
      walk.getEmissionEstimateWithIndex(function(f_index, emissionEstimate) {
        index = f_index;
        emissions = emissionEstimate.value();
      }):

      expect(index).toBe(0):
      expect(emissions).toBe(0);
    });
  });
});
