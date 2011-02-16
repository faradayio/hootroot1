describe('Directions', function() {
  var directions
  var result

  beforeEach(function() {
    google = {
      maps: {
        Map: function() {},
        LatLng: function() {},
        MapTypeId: { ROADMAP: 'roadmap' },
        DirectionsService: function() { this.route = function() {} },
        DirectionsTravelMode: { DRIVING: 'DRIVING' },
        DirectionsStatus: { OK: 'OK' },
        DirectionsRenderer: function() {} } }

      result = {
        routes: [{
          summary: 'I-96E',
          legs: [{
            distance: {
              text: '66.3 mi',
              value: 106738
            },
            duration: {
              text: '1 hour 9mins',
              value: 4158
            },
            end_address: 'Ann Arbor, MI, USA',
            start_address: 'Lansing, MI, USA',
            steps: [
              { travel_mode: 'DRIVING',
                distance: { value: 688 },
                instructions: 'Go there' },
              { travel_mode: 'DRIVING',
                distance: { value: 128 },
                instructions: 'Go there' },
              { travel_mode: 'DRIVING',
                distance: { value: 45 },
                instructions: 'Go there' },
              { travel_mode: 'DRIVING',
                distance: { value: 9025 },
                instructions: 'Go there' },
            ]
          }]
        }]
      }

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
