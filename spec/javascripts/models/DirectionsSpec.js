describe('Directions', function() {
  var directions

  beforeEach(function() {
    directions = new Directions('Lansing, MI', 'Ann Arbor, MI')
  })

  describe('#segments', function() {
    it('returns an array of segments', function() {
      directions.directionResult = result
      var segments = directions.segments(result)

      expect(segments[0].distance).toEqual(0.688)
      expect(segments[0].index).toEqual(0)

      expect(segments[1].distance).toEqual(0.128)
      expect(segments[1].index).toEqual(1)

      expect(segments[2].distance).toEqual(0.045)
      expect(segments[2].index).toEqual(2)

      expect(segments[3].distance).toEqual(9.025)
      expect(segments[3].index).toEqual(3)
    })
  })

  describe('#getEmissions', function() {
    it('gets emissions for all segments', function() {
      directions.directionResult = result
      directions.eachSegment(function(segment) {
        segment.emissions = jasmine.createSpy()
      })
      directions.getEmissions(function() {}, function() {})
      directions.eachSegment(function(segment) {
        expect(segment.emissions).toHaveBeenCalled()
      })
    })
  })

  describe('#onSegmentEmissions', function() {
    it('updates the total emissions', function() {
      directions.directionResult = result
      fakeAjax({
        urls: {
          'http://carbon.brighterplanet.com/automobile_trips.json?distance=0.688': {
            successData: {"emission": 6.8}},
          'http://carbon.brighterplanet.com/automobile_trips.json?distance=0.128': {
            successData: {"emission": 1.2}},
          'http://carbon.brighterplanet.com/automobile_trips.json?distance=0.045': {
            successData: {"emission": 0.4}},
          'http://carbon.brighterplanet.com/automobile_trips.json?distance=9.025': {
            successData: {"emission": 90.2}}
        }
      })
      directions.getEmissions(function(index, emissionValue) {}, function() {})
      expect(directions.totalEmissions).toBeClose(98.6, 0.01)
    })
  })

// describe('#route', function() {
//   it('calls the onSuccess method', function() {
//     google.maps.DirectionsService.prototype.route = function(request, callback) { callback('OK') }
//     onSuccess = jasmine.createSpy('onSuccess')
//     directions.route(onSuccess, null)
//     expect(onSuccess).toHaveBeenCalled()
//   })
//   it('calls the onFailure method when directions cannot be fetched', function() {
//     onFailure = jasmine.createSpy('onFailure')
//     directions.route(null, onFailure)
//     expect(onFailure).toHaveBeenCalled()
//   })
// })
})
