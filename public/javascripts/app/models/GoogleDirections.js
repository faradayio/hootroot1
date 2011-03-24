GoogleDirections = function(origin, destination, mode) {
  this.origin = origin
  this.destination = destination
  this.mode = mode
}
GoogleDirections.prototype = new Directions

GoogleDirections.prototype.directionsService = function() {
  if(!this._directionsService) {
    this._directionsService = new google.maps.DirectionsService()
  }

  return this._directionsService
}

GoogleDirections.prototype.route = function (onSuccess, onFailure) {
  var request = {
    origin: this.origin, 
    destination: this.destination,
    travelMode: this.mode
  }
  this.directionsService().route(request, $.proxy(function(result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      this.directionsResult = result
      onSuccess(this)
    } else {
      onFailure(this, result, status)
    }
  }, this))
}
