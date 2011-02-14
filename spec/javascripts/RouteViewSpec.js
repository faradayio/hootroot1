describe('RouteView', function() {
  describe('.segments', function() {
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
                distance: 688,
                instructions: 'Go there' },
              { travel_mode: 'DRIVING',
                distance: 128,
                instructions: 'Go there' },
              { travel_mode: 'DRIVING',
                distance: 45,
                instructions: 'Go there' },
              { travel_mode: 'DRIVING',
                distance: 9025,
                instructions: 'Go there' },
            ]
          }]
        }]
      }
      var rv = new RouteView()
      var segments = rv.segments(result)
      expect(segments[0].distance).toEqual(0.688)
      expect(segments[0].emissions()).toEqual(0.0)
      expect(segments[0].elementId).toEqual('segment_0')
      expect(segments[0].elementClass).toEqual('driving')

      expect(segments[1].distance).toEqual(0.128)
      expect(segments[1].emissions()).toEqual(0.0)
      expect(segments[1].elementId).toEqual('segment_1')
      expect(segments[1].elementClass).toEqual('driving')

      expect(segments[2].distance).toEqual(0.045)
      expect(segments[2].emissions()).toEqual(0.0)
      expect(segments[2].elementId).toEqual('segment_2')
      expect(segments[2].elementClass).toEqual('driving')

      expect(segments[3].distance).toEqual(9.025)
      expect(segments[3].emissions()).toEqual(0.0)
      expect(segments[3].elementId).toEqual('segment_3')
      expect(segments[3].elementClass).toEqual('driving')
    })
  })
})
