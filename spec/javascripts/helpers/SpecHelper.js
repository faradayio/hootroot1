beforeEach(function() {
  this.addMatchers({
    toBeClose: function(base, deviation) {
      var lowerBound = base - deviation
      var upperBound = base + deviation
      return this.actual >= lowerBound && this.actual <= upperBound
    }
  })
  GoogleResult = {
    driving: {
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
    },
    walking: {
      routes: [{
        summary: 'W Oakland Rd',
        legs: [{
          distance: {
            text: '1.4 mi',
            value: 2253
          },
          duration: {
            text: '27mins',
            value: 1620
          },
          end_address: '1132 N Washington, Lansing, Michigan 48906',
          start_address: '610 Westmoreland Ave, Lansing, MI 48915',
          steps: [
            { travel_mode: 'WALKING',
              distance: { value: 321 },
              instructions: 'Go there' },
            { travel_mode: 'WALKING',
              distance: { value: 1609 },
              instructions: 'Go there' },
            { travel_mode: 'WALKING',
              distance: { value: 321 },
              instructions: 'Go there' }
          ]
        }]
      }]
    }
  }
});
