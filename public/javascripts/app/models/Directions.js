Directions = function(origin, destination, mode) {
  this.origin = origin
  this.destination = destination
  this.mode = mode
}

Directions.create = function(origin, destination, mode) {
  if(mode == 'PUBLICTRANSIT') {
    return new HopStopDirections(origin, destination, mode)
  } else {
    return new GoogleDirections(origin, destination, mode)
  }
}

Directions.prototype.segments = function() {
  if(!this._segments) {
    var list = []
    for(var i = 0; i < this.steps().length; i++) {
      var step = this.steps()[i]
      list[i] = Segment.create(i, step)
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

Directions.prototype.getEmissions = function(onSuccess, onError) {
  var onSuccessWithTotalEmissionUpdate = this.onSegmentEmissions(onSuccess)
  this.totalEmissions = 0.0
  this.eachSegment(function(segment) {
    segment.getEmissionEstimateWithIndex(onSuccessWithTotalEmissionUpdate, onError)
  })
}



// Events

Directions.prototype.onSegmentEmissions = function(onSuccess) {
  return $.proxy(function(index, emissionEstimate) {
      this.totalEmissions += emissionEstimate.value()
      onSuccess(this, index, emissionEstimate)
    },
    this)
}
