DrivingDirections = function(origin, destination, mode) {
  this.origin = origin
  this.destination = destination
  this.mode = mode
}

DrivingDirections.prototype = new GoogleDirections
