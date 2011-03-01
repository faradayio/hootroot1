GoogleDirections = function(origin, destination, mode) {
  this.origin = origin
  this.destination = destination
  this.mode = mode
}
GoogleDirections.prototype = new Directions

GoogleDirections.prototype.directionsService = function() {
  if(!this._directionsService) {
    this._directionsService = new GoogleService.directionsService()
  }

  return this._directionsService
}

GoogleDirections.prototype.steps = function(index) {
  if(!this._steps && this.directionResult) {
    this._steps = this.directionResult.routes[0].legs[0].steps
  }

  return this._steps
}

GoogleDirections.prototype.route = function (onSuccess, onFailure) {
  var request = {
    origin: this.origin, 
    destination: this.destination,
    travelMode: this.mode
  }
  this.directionsService().route(request, $.proxy(function(result, status) {
    if (status == GoogleService.directionsStatus.OK) {
      this.directionResult = result
      onSuccess(result)
    } else {
      onFailure(result, status)
    }
  }, this))
}
