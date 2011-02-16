Directions = function(origin, destination) {
  this.origin = origin
  this.destination = destination
  this.directionsService = new google.maps.DirectionsService()
}

Directions.prototype.segments = function() {
  if(!this._segments) {
    var list = []
    var steps = this.directionResult.routes[0].legs[0].steps
    for(var i = 0; i < steps.length; i++) {
      var step = steps[i]
      list[i] = Segment.from_google(i, step)
    }
    this._segments = list
  }
  return this._segments
}

Directions.prototype.eachSegment = function(lambda) {
  for(var i = 0; i < this.segments().length; i++) {
    lambda(this.segments()[i])
  }
}

Directions.prototype.route = function (onSuccess, onFailure) {
  var request = {
    origin: this.origin, 
    destination: this.destination,
    travelMode: google.maps.DirectionsTravelMode.DRIVING
  }
  me = this
  this.directionsService.route(request, function(result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      me.directionResult = result
      onSuccess(result)
    } else {
      onFailure(result, status)
    }
  })
}

Directions.prototype.getEmissions = function(onSuccess, onError) {
  this.eachSegment(function(segment) {
    segment.emissions(onSuccess, onError)
  })
}
