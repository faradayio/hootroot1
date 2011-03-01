describe('HopStopDirections', function() {
  var directions

  beforeEach(function() {
    directions = new HopStopDirections('A','B','WALKING')
  })

  describe('#steps', function() {
    it('returns an array of steps', function() {
      directions.directionsResult = HopStopResult.subway
      var steps = directions.steps()

      expect(steps[0].distance.value).toEqual(54)
      expect(steps[1].distance.value).toEqual(688)
      expect(steps[2].distance.value).toEqual(298)
    })
  })

  describe('#route', function() {
    it('sets directionResult on success', function() {
      fakeAjax({
        urls: { '/hopstops' : { successData: HopStopResult.subway } }
      })

      directions.route(function() {}, function() {})
      expect(directions.directionsResult).toBe(HopStopResult.subway)
    })
    it('runs the onFailure method on failure', function() {
      fakeAjax({
        urls: { '/hopstops' : { errorMessage: 'OMG' } }
      })
      var onError = jasmine.createSpy('onError')

      directions.route(function() {}, onError)
      expect(onError).toHaveBeenCalled()
    })
  })
})
