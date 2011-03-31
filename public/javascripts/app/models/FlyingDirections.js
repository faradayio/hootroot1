FlyingDirections = function(origin, destination, mode) {
  this.origin = origin;
  this.destination = destination;
  this.mode = 'FLYING';
  this.geocoder = new google.maps.Geocoder();
}
FlyingDirections.prototype = new Directions();

FlyingDirections.prototype.route = function (onSuccess, onError) {
  this.geocoder.geocode({ address: this.origin },
      $.proxy(function(geocode) { this.onGeocodeOriginSuccess(geocode, onSuccess, onError) },
              this));
  this.geocoder.geocode({ address: this.destination },
      $.proxy(function(geocode) { this.onGeocodeDestinationSuccess(geocode, onSuccess, onError) },
              this));
};

FlyingDirections.prototype.steps = function() {
  return [{
    travel_mode: 'FLYING',
    distance: { value: this.distanceEstimate() },
    duration: { value: this.duration() },
    instructions: NumberFormatter.metersToMiles(this.distanceEstimate()) + ' mile flight',
    start_position: {
      lat: this.originLatLng.lat(),
      lon: this.originLatLng.lng()
    },
    end_position: {
      lat: this.destinationLatLng.lat(),
      lon: this.destinationLatLng.lng()
    }
  }];
};

FlyingDirections.prototype.distanceEstimate = function() {
  if(!this._distanceEstimate) {
    this._distanceEstimate = google.maps.geometry.spherical.computeDistanceBetween(
      this.originLatLng, this.destinationLatLng);
  }
  return this._distanceEstimate;
};

FlyingDirections.prototype.duration = function() {
  var rate = 0.0056818;  // that's like 400mph
  return rate * this.distanceEstimate();
}

FlyingDirections.prototype.totalTime = function() {
  return TimeFormatter.format(this.duration());
};

FlyingDirections.prototype.isFullyGeocoded = function() {
  return this.originLatLng != null && this.destinationLatLng != null;
};

FlyingDirections.prototype.isLongEnough = function() {
  return this.distanceEstimate() > 115000;
};

FlyingDirections.prototype.onGeocodeOriginSuccess = function(geocode, onSuccess, onError) {
  this.originLatLng = geocode[0].geometry.location;
  this.onGeocodeSuccess(onSuccess, onError);
};
FlyingDirections.prototype.onGeocodeDestinationSuccess = function(geocode, onSuccess, onError) {
  this.destinationLatLng = geocode[0].geometry.location;
  this.onGeocodeSuccess(onSuccess, onError);
};

FlyingDirections.prototype.onGeocodeSuccess = function(onSuccess, onError) {
  if(this.isFullyGeocoded()) {
    this.directionsResult = { routes: {
      legs: [{
        duration: { value: this.duration() },
        distance: { value: this.distanceEstimate() },
        steps: this.steps(),
      }],
      warnings: [],
      bounds: GoogleDirectionsRoute.generateBounds(this.steps())
    }};
    if(this.isLongEnough()) {  // don't show unless it's a long enough flight
      onSuccess(this, this.directionsResult);
    } else {
      onError(this, this.directionsResult);
    }
  }
};
