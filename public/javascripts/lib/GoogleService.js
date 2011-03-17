GoogleService = {
  directionsRenderer: google.maps.DirectionsRenderer,
  directionsService: google.maps.DirectionsService,
  directionsStatus: google.maps.DirectionsStatus,
  directionsTravelMode: google.maps.DirectionsTravelMode,
  latLng: google.maps.LatLng,
  map: google.maps.Map,
  mapTypeId: google.maps.MapTypeId,
  geocoder: new google.maps.Geocoder,
  latLngBounds: google.maps.LatLngBounds
};


StubbedGoogleService = {
  directionsRenderer: function() {},
  directionsService: function() { this.route = function() {} },
  directionsStatus: { OK: 'OK' },
  directionsTravelMode: { DRIVING: 'DRIVING' },
  latLng: function(attrs) {
    this.lat = function() { return attrs[0]; };
    this.lng = function() { return attrs[1]; };
  },
  latLngBounds: function(attrs) {
    this.getSouthWest = function() { return attrs[0]; };
    this.getNorthEast = function() { return attrs[1]; };
  },
  map: function() {},
  mapTypeId: { ROADMAP: 'roadmap' },
  geocoder: { geocode: function(onSuccess, onError) {
      onSuccess(new GoogleResult.geocoderResult);
    }
  }
};


function stub_google(lambda) {
  oldService = GoogleService;
  GoogleService = StubbedGoogleService;
  lambda();
  GoogleService = oldService;
}
