FlightPath = function(controller, directions) {
  this.controller = controller;
  this.directions = directions;
};

FlightPath.prototype.originLatLng = function() {
  return this.directions.originLatLng;
}
FlightPath.prototype.destinationLatLng = function() {
  return this.directions.destinationLatLng;
}

FlightPath.prototype.polyLine = function() {
  if(!this._polyLine && this.originLatLng() && this.destinationLatLng()) {
    this._polyLine = new google.maps.Polyline({
      path: [this.originLatLng(),this.destinationLatLng()],
      geodesic: true,
      strokeColor: '#89E',
      strokeWeight: 4,
      strokeOpacity: 0.85
    });
  }

  return this._polyLine;
};

FlightPath.prototype.markers = function() {
  if(!this._markers && this.originLatLng() && this.destinationLatLng()) {
    this._markers = [];
    this._markers.push(new google.maps.Marker({ position: this.originLatLng(), icon: 'http://maps.gstatic.com/intl/en_us/mapfiles/marker_greenA.png' }));
    this._markers.push(new google.maps.Marker({ position: this.destinationLatLng(), icon: 'http://maps.gstatic.com/intl/en_us/mapfiles/marker_greenB.png' }));
  }

  return this._markers;
};

FlightPath.prototype.display = function() {
  this.polyLine().setMap(this.controller.mapView.googleMap());
  for(var i in this.markers()) {
    this.markers()[i].setMap(this.controller.mapView.googleMap());
  }
};
FlightPath.prototype.hide = function() {
  if(this.polyLine())
    this.polyLine().setMap(null);
  for(var i in this.markers()) {
    this.markers()[i].setMap(null);
  }
};

