HopStopDirections = function(origin, destination, mode, when) {
  this.origin = origin;
  this.destination = destination;
  this.mode = mode;
  this.when = when;
  this.geocoder = new google.maps.Geocoder();
}
HopStopDirections.prototype = new Directions;

HopStopDirections.prototype.route = function(onSuccess, onError) {
  this.geocoder.geocode({address: this.origin},
      $.proxy(function(geocode) { this.onGeocodeOriginSuccess(geocode, onSuccess, onError) },
              this));
  this.geocoder.geocode({address: this.destination},
      $.proxy(function(geocode) { this.onGeocodeDestinationSuccess(geocode, onSuccess, onError) },
              this));
};

HopStopDirections.prototype.isFullyGeocoded = function() {
  return this.x1 != null && this.y1 != null && this.x2 != null && this.y2 != null;
};

HopStopDirections.prototype.isAllWalkingSegments = function() {
  var result = true;
  this.eachSegment(function(segment) {
    result = result && segment instanceof WalkingSegment;
  });
  return result;
};

HopStopDirections.prototype.onGeocodeOriginSuccess = function(geocode, onSuccess, onError) {
  this.x1 = geocode[0].geometry.location.lng();
  this.y1 = geocode[0].geometry.location.lat();
  this.onGeocodeSuccess(onSuccess, onError);
};
HopStopDirections.prototype.onGeocodeDestinationSuccess = function(geocode, onSuccess, onError) {
  this.x2 = geocode[0].geometry.location.lng();
  this.y2 = geocode[0].geometry.location.lat();
  this.onGeocodeSuccess(onSuccess, onError);
};

HopStopDirections.prototype.onGeocodeSuccess = function(onSuccess, onError) {
  if(this.isFullyGeocoded()) {
    var request = {
      x1: this.x1, 
      y1: this.y1, 
      x2: this.x2, 
      y2: this.y2, 
      mode: this.mode,
      when: this.when
    };
    $.ajax({
      url: '/hopstops',
      data: request,
      success: $.proxy(function(data) {
        this.directionsResult = { routes: [new GoogleDirectionsRoute(data)] };
        if(this.isAllWalkingSegments()) {
          onError(this, data);
        } else {
          onSuccess(this);
        }
      }, this),
      error: $.proxy(function(result) { onError(this, result); }, this),
      timeout: onError
    });
  }
};
