describe('IndexController', function() {
  describe('#segments', function() {
    it('returns an array of segments', function() {
      var result = {
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

      google = { maps: { Map: function() {},
                         LatLng: function() {},
                         MapTypeId: { ROADMAP: 'roadmap' } } }

      var indexController = new IndexController(null, null)
      var segments = indexController.segments(result)

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
})
