describe('HopStopDirections', function() {
  var directions;

  beforeEach(function() {
    directions = new HopStopDirections('A','B','WALKING','now');
  });

  describe('#steps', function() {
    it('returns an array of steps', function() {
      directions.directionsResult = HopStopResult.subway;
      var steps = directions.steps();

      expect(steps[0].distance.value).toEqual(54);
      expect(steps[1].distance.value).toEqual(688);
      expect(steps[2].distance.value).toEqual(298);
    });
  })

  describe('#route', function() {
    var geocoder, onSuccess, onError;
    beforeEach(function() {
      geocoder = jasmine.createSpy('GoogleService.geocoder');
      GoogleService.geocoder = { geocode: geocoder };
      onSuccess = jasmine.createSpy();
      onError = jasmine.createSpy();
    });
    it('geocodes origin', function() {
      directions.route(onSuccess, onError);
      expect(geocoder.argsForCall[0][0].address).toBe('A');
    });
    it('geocodes destination', function() {
      directions.route(onSuccess, onError);
      expect(geocoder.argsForCall[1][0].address).toBe('B');
    });
  });

  describe('#isFullyGeocoded', function() {
    it('returns true if origin and destination are both geocoded', function() {
      directions.x1 = 12;
      directions.y1 = 13;
      directions.x2 = 14;
      directions.y2 = 15;

      expect(directions.isFullyGeocoded()).toBeTruthy();
    })
    it('returns false if origin and destination are not geocoded', function() {
      directions.x1 = 12;
      directions.y1 = 13;

      expect(directions.isFullyGeocoded()).toBeFalsy();
    })
  });

  describe('#onGeocodeOriginSuccess', function() {
    it('sets x1 and y1', function() {
      directions.onGeocodeOriginSuccess(GoogleResult.geocoderResult, function() {}, function() {});
      expect(directions.x1).toBe(40.767436);
      expect(directions.y1).toBe(-73.98177);
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
    it('sets x2 and y2', function() {
      directions.onGeocodeDestinationSuccess(GoogleResult.geocoderResult, function() {}, function() {});
      expect(directions.x2).toBe(40.767436);
      expect(directions.y2).toBe(-73.98177);
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
      directions.x1 = 1;
      directions.y1 = 2;
      directions.x2 = 3;
      directions.y2 = 4;
      directions.mode = 'WALKING';
      directions.when = 'now';
      fakeAjax({
        urls: { '/hopstops?x1=1&y1=2&x2=3&y2=4&mode=WALKING&when=now' : { successData: HopStopResult.subway } }
      });
    });

    it('calculates the route when origin and destination have been geocoded', function() {
      directions.isFullyGeocoded = function() { return true };
      var onSuccess = jasmine.createSpy('onSuccess');

      directions.onGeocodeSuccess(onSuccess);
      expect(onSuccess).toHaveBeenCalled();
    });
    it('does not send a hopstop request if both origin/destination are not set', function() {
      directions.isFullyGeocoded = function() { return false };
      var onSuccess = jasmine.createSpy('onSuccess');

      directions.onGeocodeSuccess(onSuccess);
      expect(onSuccess).not.toHaveBeenCalled();
    });
    it('sets directionResult on success', function() {
      directions.onGeocodeSuccess(function() {});
      expect(directions.directionsResult).toBe(HopStopResult.subway);
    });
    it('runs the onError method on failure', function() {
      fakeAjax({
        urls: { '/hopstops?x1=1&y1=2&x2=3&y2=4&mode=WALKING&when=now' : { errorMessage: 'OMG' } }
      });
      var onError = jasmine.createSpy('onError');
      directions.isFullyGeocoded = function() { return true };

      directions.onGeocodeSuccess(function() {}, onError);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('#toGoogle', function() {
    it('creates a GoogleDirectionsResult from #directionsResult', function() {
      directions.directionsResult = HopStopResult.subway;
      var goog = directions.toGoogle();
      expect(goog.routes[0]).toBeInstanceOf(GoogleDirectionsRoute);
    });
  });
});
