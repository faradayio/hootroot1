describe('WalkingSegment', function() {
  describe('#getEmissionEstimateWithIndex', function() {
    it('results in zero emissions', function() {
      var walk = new WalkingSegment(0, {
        distance: { value: 28.5 },
        instructions: 'Go here' })
      
      var emissions, index
      walk.getEmissionEstimateWithIndex(function(f_index, emissionEstimate) {
        index = f_index
        emissions = emissionEstimate.value()
      })

      expect(index).toBe(0)
      expect(emissions).toBe(0)
    })
  })
})
