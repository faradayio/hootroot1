describe('GoogleDirections', function() {
  var directions

  beforeEach(function() {
    directions = new GoogleDirections('A','B','WALKING')
  })

  it('has a directionsService property', function() {
    expect(directions.directionsService).toBeDefined()
  })

  describe('#steps', function() {
    it('returns an array of steps', function() {
      directions.directionResult = GoogleResult.driving
      var steps = directions.steps()

      expect(steps[0].distance.value).toEqual(688)
      expect(steps[1].distance.value).toEqual(128)
      expect(steps[2].distance.value).toEqual(45)
      expect(steps[3].distance.value).toEqual(9025)
    })
  })

// describe('#route', function() {
//   it('passes results of a successful route to the onSuccess method', function() {
//     onSuccess = jasmine.createSpy('onSuccess')
//
//     directions.route(onSuccess)
//     expect(onSuccess).toHaveBeenCalledWith(GoogleResult.driving)
//   })
// })
})
