RentalCar = function() {}
Carbon.emitter(RentalCar, function(emitter) {
  emitter.emitAs('automobile')
  emitter.provide('make')
  emitter.provide('model')
  emitter.provide('fuel_economy', { as: 'fuel_efficiency' })
})

describe('Carbon.js usage', function() {
  it('asynchronously calculates emissions for an emitter', function() {
    fakeAjax({ urls: {
      'http://carbon.brighterplanet.com/automobiles.json': {
        successData: Cm1Result.fit  
      }
    } })

    var car = new RentalCar()
    car.make = 'Honda'
    car.model = 'Fit'
    car.fuel_efficiency = 36.7

    var value
    car.getEmissionEstimate(function(estimate) {
      value = estimate.value()
    })

    expect(value).toBe(3563.616916486099)
    expect(car.emissionEstimate.value()).toBe(3563.616916486099)
  })
})

describe('Carbon', function() {
  var carbon

  beforeEach(function() {
    carbon = new Carbon()
  })

  describe('.emitter', function() {
    var car
    beforeEach(function() {
      car = new RentalCar
    })

    it('sets the type of emitter', function() {
      expect(RentalCar.carbon.emitter_name).toBe('automobile')
    })
    it('creates an #emissionEstimate method on the target class', function() {
      expect(car.emissionEstimate).toBeInstanceOf(EmissionEstimate)
    })
    it('creates an #emissionEstimator method on the target class', function() {
      expect(car.emissionEstimator()).toBeInstanceOf(EmissionEstimator)
    })
    it('creates a #getEmissionEstimate method on the target class', function() {
      expect(car.getEmissionEstimate()).not.toBe(null)
    })
  })

  describe('#define', function() {
    it('runs the specified methods on the Carbon instance', function() {
      carbon.define(function(instance) {
        instance.emitAs('gyrocopter')
      })
      expect(carbon.emitter_name).toBe('gyrocopter')
    })
  })

  describe('#emitAs', function() {
    it('sets the emitter name', function() {
      carbon.emitAs('dirigible')
      expect(carbon.emitter_name).toBe('dirigible')
    })
  })

  describe('#provide', function() {
    it('maps an emitter attribute with the same name as a class attribute', function() {
      carbon.provide('air_speed')
      expect(carbon.attribute_map['air_speed']).toBe('air_speed')
    })
    it('maps an emitter attribute with a different name than a class attribute', function() {
      carbon.provide('air_speed', { as: 'velocity' })
      expect(carbon.attribute_map['air_speed']).toBe('velocity')
    })
  })
})



describe('EmissionEstimator', function() {
  var car, estimator

  beforeEach(function() {
    car = new RentalCar()
    car.make = 'Honda'
    car.model = 'Fit'
    car.fuel_efficiency = 38.2

    estimator = new EmissionEstimator(car, RentalCar.carbon)
  })

  describe('#url', function() {
    it('returns the proper url for the emitter', function() {
      expect(estimator.url()).toBe('http://carbon.brighterplanet.com/automobiles')
    })
  })

  describe('#params', function() {
    it('returns an empty object if no params are set', function() {
      car.make = null
      car.model = null
      car.fuel_efficiency = null
      expect(estimator.params()).toEqual({})
    })
    it('returns an object mapping CM1 params to emitter attribute values', function() {
      expect(estimator.params()).toEqual({
        make: 'Honda',
        model: 'Fit',
        fuel_economy: 38.2
      })
    })
  })

  describe('#getEmissionEstimate', function() {
    var onSuccess, onError

    beforeEach(function() {
      fakeAjax({ urls: {
        'http://carbon.brighterplanet.com/automobiles': {
          successData: Cm1Result.fit  
        }
      } })

      onSuccess = jasmine.createSpy('onSuccess')
      onError = jasmine.createSpy('onError')
    })

    it('calls the given onSuccess method with the emissionEstimate', function() {
      car.getEmissionEstimate(onSuccess, onError)
      expect(onSuccess).toHaveBeenCalledWith(car.emissionEstimate)
    })
    it("sets the data attribute on the emitter's EmissionEstimate", function() {
      car.getEmissionEstimate(onSuccess, onError)
      expect(car.emissionEstimate.data).toBe(Cm1Result.fit)
    })
  })
})


describe('EmissionEstimate', function() {
  var estimate

  beforeEach(function() {
    estimate = new EmissionEstimate()
    estimate.data = Cm1Result.fit
  })
  
  describe('#value', function() {
    it('returns the emission value', function() {
      expect(estimate.value()).toBe(3563.616916486099)
    })
  })

  describe('#methodology', function() {
    it('returns the methodology URL', function() {
      expect(estimate.methodology()).toBe('http://carbon.brighterplanet.com/automobiles.html?make=Honda&timeframe=2011-01-01%2F2012-01-01')
    })
  })

  describe('#toString', function() {
    it('returns a string representation of the emission value', function() {
      expect(estimate.toString()).toBe('3563.616916486099')
    })
  })
})
