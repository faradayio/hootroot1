GoogleService = {
  directionsRenderer: google.maps.DirectionsRenderer,
  directionsService: google.maps.DirectionsService,
  directionsStatus: google.maps.DirectionsStatus,
  directionsTravelMode: google.maps.DirectionsTravelMode,
  latLng: google.maps.LatLng,
  map: google.maps.Map,
  mapTypeId: google.maps.MapTypeId
}

StubbedGoogleService = {
  directionsRenderer: function() {},
  directionsService: function() { this.route = function() {} },
  directionsStatus: { OK: 'OK' },
  directionsTravelMode: { DRIVING: 'DRIVING' },
  latLng: function() {},
  map: function() {},
  mapTypeId: { ROADMAP: 'roadmap' },
}


function stub_google(lambda) {
  oldService = GoogleService
  GoogleService = StubbedGoogleService
  lambda()
  GoogleService = oldService
}
