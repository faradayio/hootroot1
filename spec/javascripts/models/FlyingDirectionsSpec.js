describe('FlyingDirections', function() {
  var directions, geocoder;

  beforeEach(function() {
    geocoder = jasmine.createSpy('google.maps.Geocoder.geocode');
    directions = new FlyingDirections('A','B','WALKING','now');
  });

  describe('#steps', function() {
    it('returns an array of a single step', function() {
      directions.isFullyGeocoded = function() { return true; };
      directions.distanceEstimate = function() { return 90000000; };
      directions.originLatLng = { lat: function() { return 1; }, lng: function() { return 2; } };
      directions.destinationLatLng = { lat: function() { return 3; }, lng: function() { return 4; } };
      directions.onGeocodeSuccess
      var steps = directions.steps();

      expect(steps[0].duration.value).toEqual(511362);
    });
  })

  describe('#route', function() {
    var onSuccess, onError;
    beforeEach(function() {
      onSuccess = jasmine.createSpy();
      onError = jasmine.createSpy();
    });
    //it('geocodes origin', function() {
    //  directions.route(onSuccess, onError);
    //  expect(geocoder.argsForCall[0][0].address).toBe('A');
    //});
    //it('geocodes destination', function() {
    //  directions.route(onSuccess, onError);
    //  expect(geocoder.argsForCall[1][0].address).toBe('B');
    //});
  });

  describe('#isFullyGeocoded', function() {
    it('returns true if origin and destination are both geocoded', function() {
      directions.originLatLng = {};
      directions.destinationLatLng = {};

      expect(directions.isFullyGeocoded()).toBeTruthy();
    })
    it('returns false if origin and destination are not geocoded', function() {
      directions.originLatLng = {};

      expect(directions.isFullyGeocoded()).toBeFalsy();
    })
  });

  describe('#onGeocodeOriginSuccess', function() {
    it('sets originLatLng', function() {
      directions.onGeocodeOriginSuccess(GoogleResult.geocoderResult, function() {}, function() {});
      expect(directions.originLatLng.lng()).toBe(40.767436);
      expect(directions.originLatLng.lat()).toBe(-73.98177);
    });
    it('calls #onGeocodeSuccess', function() {
      var onSuccess = jasmine.createSpy();
      var onError = jasmine.createSpy();
      var onGeocodeSuccess = jasmine.createSpy();
      directions.onGeocodeSuccess = onGeocodeSuccess;

      directions.onGeocodeOriginSuccess(GoogleResult.geocoderResult, onSuccess, onError);
      expect(onGeocodeSuccess).toHaveBeenCalledWith(onSuccess, onError);
    })
  });

  describe('#onGeocodeDestinationSuccess', function() {
    it('sets destinationLatLng', function() {
      directions.onGeocodeDestinationSuccess(GoogleResult.geocoderResult, function() {}, function() {});
      expect(directions.destinationLatLng.lng()).toBe(40.767436);
      expect(directions.destinationLatLng.lat()).toBe(-73.98177);
    });
    it('calls #onGeocodeSuccess', function() {
      var onSuccess = jasmine.createSpy();
      var onError = jasmine.createSpy();
      var onGeocodeSuccess = jasmine.createSpy();
      directions.onGeocodeSuccess = onGeocodeSuccess;

      directions.onGeocodeDestinationSuccess(GoogleResult.geocoderResult, onSuccess, onError);
      expect(onGeocodeSuccess).toHaveBeenCalledWith(onSuccess, onError);
    })
  });

  describe('#onGeocodeSuccess', function() {
    beforeEach(function() {
      directions.originLatLng = { lat: function() { return 1; }, lng: function() { return 2; } };
      directions.destinationLatLng = { lat: function() { return 3; }, lng: function() { return 4; } };
      directions.mode = 'WALKING';
      directions.when = 'now';
    });

    it('calls onSuccess when origin and destination have been geocoded', function() {
      directions.isFullyGeocoded = function() { return true };
      var onSuccess = jasmine.createSpy('onSuccess');

      directions.onGeocodeSuccess(onSuccess);
      expect(onSuccess).toHaveBeenCalled();
    });
    it('sets directionResult on success', function() {
      directions.distanceEstimate = function() { return 90000000; };
      directions.onGeocodeSuccess(function() {});
      expect(directions.directionsResult.routes.legs.length).toBe(1);
    });
    it('runs the onError method if the distance is too short', function() {
      var onError = jasmine.createSpy('onError');
      directions.isFullyGeocoded = function() { return true };

      directions.distanceEstimate = function() { return 0; };
      directions.onGeocodeSuccess(function() {}, onError);
      expect(onError).toHaveBeenCalled();
    });
  });
});
