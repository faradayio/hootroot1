beforeEach(function() {
  this.addMatchers({
    toBeClose: function(base, deviation) {
      var lowerBound = base - deviation
      var upperBound = base + deviation
      return this.actual >= lowerBound && this.actual <= upperBound
    }
  })
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
});
