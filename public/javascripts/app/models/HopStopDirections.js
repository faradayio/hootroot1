HopStopDirections = function(origin, destination, mode) {
  this.origin = origin
  this.destination = destination
  this.mode = mode
}
HopStopDirections.prototype = new Directions

HopStopDirections.prototype.steps = function(index) {
  if(!this._steps && this.directionsResult) {
    this._steps = this.directionsResult.steps
  }

  return this._steps
}

HopStopDirections.prototype.route = function (onSuccess, onFailure) {
  var request = {
    origin: this.origin, 
    destination: this.destination
  }
  $.ajax({
    url: '/hopstops',
    success: $.proxy(function(data) {
      this.directionsResult = data
      onSuccess(data)
    }, this),
    error: onFailure,
    timeout: onFailure
  })
}
