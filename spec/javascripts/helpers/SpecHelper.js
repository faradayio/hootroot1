beforeEach(function() {
  this.addMatchers({
    toBeClose: function(base, deviation) {
      var lowerBound = base - deviation
      var upperBound = base + deviation
      return this.actual >= lowerBound && this.actual <= upperBound
    },
    toBeInstanceOf: function(type) {
      return this.actual instanceof type
    }
  })
  Geocode = function() {
    this.geometry = {
      location: {
        lat: function() { return -73.98177; },
        lng: function() { return 40.767436; }
      }
    }
  }

  GoogleResult = {
    geocoderResult: [new Geocode],
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
  HopStopResult = {
    realSubway: {
      duration: {
        text: '21mins',
        value: 1270
      },
      steps: [
        { travel_mode: 'WALKING',
          duration: { text: '53 mins', value: 32400 },
          instructions: 'Start out going North West on Broadway towards Mother Gaston Blvd',
          start_position: {
            lat: 40.6819,
            lon: -73.90871
          },
          end_position: {
            lat: 40.68265,
            lon: -73.91002
          }
        },
        { travel_mode: 'SUBWAYING',
          distance: { value: 1479 },
          instructions: 'Take the J train from Chauncey St station heading to Broad St'
        },
        { travel_mode: 'WALKING',
          distance: { value: 240 },
          instructions: 'Exit near intersection of Canal St and Lafayette St'
        },
        { travel_mode: 'SUBWAYING',
          distance: { value: 948 },
          instructions: 'Take the 6 train from Canal Street station heading Uptown / to Pelham Bay Park'
        },
        { travel_mode: 'WALKING',
          distance: { value: 154 },
          instructions: 'Exit near intersection of E 32nd St and Park Ave',
          start_position: {
            lat: 40.74577,
            lon: -73.98222
          },
          end_position: {
            lat: 40.746824,
            lon: -73.983644
          }
        }
      ]
    },

    subway: {
      duration: {
        text: '21mins',
        value: 1270
      },
      steps: [
        { travel_mode: 'WALKING',
          duration: { value: 54 },
          instructions: 'Go there',
          start_position: {
            lat: 23.546,
            lon: -123.54
          },
          end_position: {
            lat: 23.546,
            lon: -123.54
          }
        },
        { travel_mode: 'SUBWAYING',
          duration: { value: 688 },
          instructions: 'Go there',
          start_position: {
            lat: 23.546,
            lon: -123.54
          },
          end_position: {
            lat: 23.546,
            lon: -123.54
          }
        },
        { travel_mode: 'WALKING',
          duration: { value: 298 },
          instructions: 'Go there',
          start_position: {
            lat: 23.546,
            lon: -123.54
          },
          end_position: {
            lat: 23.546,
            lon: -123.54
          }
        },
      ]
    }
  }

  Cm1Result = {
    fit: {"timeframe":"2011-01-01/2012-01-01","emission":3563.616916486099,"emission_units":"kilograms","errors":[],"reports":[{"committee":{"name":"emission","quorums":[{"name":"from fuel","requirements":["fuel_consumed","emission_factor"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"default","requirements":[],"appreciates":[],"complies":[]}]},"conclusion":3563.616916486099,"quorum":{"name":"from fuel","requirements":["fuel_consumed","emission_factor"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}},{"committee":{"name":"emission_factor","quorums":[{"name":"from fuel type","requirements":["fuel_type"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"default","requirements":[],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}]},"conclusion":2.490112979487,"quorum":{"name":"default","requirements":[],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}},{"committee":{"name":"fuel_consumed","quorums":[{"name":"from fuel efficiency and distance","requirements":["fuel_efficiency","distance"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}]},"conclusion":1431.106518395907,"quorum":{"name":"from fuel efficiency and distance","requirements":["fuel_efficiency","distance"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}},{"committee":{"name":"distance","quorums":[{"name":"from annual distance","requirements":["annual_distance","active_subtimeframe"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]}]},"conclusion":19020.836736,"quorum":{"name":"from annual distance","requirements":["annual_distance","active_subtimeframe"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]}},{"committee":{"name":"annual_distance","quorums":[{"name":"from weekly distance and timeframe","requirements":["weekly_distance"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]},{"name":"from daily distance and timeframe","requirements":["daily_distance"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]},{"name":"from daily duration, speed, and timeframe","requirements":["daily_duration","speed"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]},{"name":"from size class","requirements":["size_class"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]},{"name":"from fuel type","requirements":["fuel_type"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]},{"name":"default","requirements":[],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]}]},"conclusion":19020.836736,"quorum":{"name":"default","requirements":[],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]}},{"committee":{"name":"fuel_efficiency","quorums":[{"name":"from make model year variant and urbanity","requirements":["make_model_year_variant","urbanity"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"from make model year and urbanity","requirements":["make_model_year","urbanity"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"from make model and urbanity","requirements":["make_model","urbanity"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"from size class, hybridity multiplier, and urbanity","requirements":["size_class","hybridity_multiplier","urbanity"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"from make year and hybridity multiplier","requirements":["make_year","hybridity_multiplier"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"from make and hybridity multiplier","requirements":["make","hybridity_multiplier"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"from hybridity multiplier","requirements":["hybridity_multiplier"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]}]},"conclusion":13.291,"quorum":{"name":"from make and hybridity multiplier","requirements":["make","hybridity_multiplier"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}},{"committee":{"name":"hybridity_multiplier","quorums":[{"name":"from size class, hybridity, and urbanity","requirements":["size_class","hybridity","urbanity"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"from hybridity and urbanity","requirements":["hybridity","urbanity"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]},{"name":"default","requirements":[],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}]},"conclusion":1.0,"quorum":{"name":"default","requirements":[],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}},{"committee":{"name":"speed","quorums":[{"name":"from urbanity","requirements":["urbanity"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}]},"conclusion":50.943879367060404,"quorum":{"name":"from urbanity","requirements":["urbanity"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}},{"committee":{"name":"urbanity","quorums":[{"name":"default","requirements":[],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}]},"conclusion":0.43,"quorum":{"name":"default","requirements":[],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}},{"committee":{"name":"active_subtimeframe","quorums":[{"name":"from acquisition and retirement","requirements":["acquisition","retirement"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}]},"conclusion":"2011-01-01/2012-01-01","quorum":{"name":"from acquisition and retirement","requirements":["acquisition","retirement"],"appreciates":[],"complies":["ghg_protocol_scope_1","ghg_protocol_scope_3","iso"]}},{"committee":{"name":"acquisition","quorums":[{"name":"from make model year variant","requirements":["make_model_year_variant"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]},{"name":"from make model year","requirements":["make_model_year"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]},{"name":"from make year","requirements":["make_year"],"appreciates":[],"complies":["ghg_protocol_scope_3","iso"]},{"name":"from retirement","requirements":[],"appreciates":["retirement"],"complies":["ghg_protocol_scope_3","iso"]}]},"conclusion":"2011-01-01","quorum":{"name":"from retirement","requirements":[],"appreciates":["retirement"],"complies":["ghg_protocol_scope_3","iso"]}},{"committee":{"name":"retirement","quorums":[{"name":"from acquisition","requirements":[],"appreciates":["acquisition"],"complies":["ghg_protocol_scope_3","iso"]}]},"conclusion":"2012-01-01","quorum":{"name":"from acquisition","requirements":[],"appreciates":["acquisition"],"complies":["ghg_protocol_scope_3","iso"]}}],"methodology":"http://carbon.brighterplanet.com/automobiles.html?make=Honda&timeframe=2011-01-01%2F2012-01-01","execution_id":"1c620eaa39ae4023e05a6558087970e0dbd32c4e4352e5ec790bd05b1cc5a480f29ce252565d884c","complies":[],"make":{"automobile_make":{"fuel_efficiency":13.291,"fuel_efficiency_units":"kilometres_per_litre","name":"Honda"}},"retirement":"2012-01-01","acquisition":"2011-01-01","active_subtimeframe":"2011-01-01/2012-01-01","urbanity":0.43,"speed":50.943879367060404,"hybridity_multiplier":1.0,"fuel_efficiency":13.291,"annual_distance":19020.836736,"distance":19020.836736,"fuel_consumed":1431.106518395907,"emission_factor":2.490112979487}
  }
});
