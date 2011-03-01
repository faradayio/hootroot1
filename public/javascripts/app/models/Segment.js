function Segment() {}

Segment.create = function(index, step) {
  if(step.travel_mode == 'DRIVING') {
    return new DrivingSegment(index, step)
  } else if(step.travel_mode == 'WALKING') {
    return new WalkingSegment(index, step)
  } else if(step.travel_mode == 'BICYCLING') {
    return new BicyclingSegment(index, step)
  } else if(step.travel_mode == 'SUBWAYING') {
    return new SubwayingSegment(index, step)
  } else if(step.travel_mode == 'BUSSING') {
    return new BussingSegment(index, step)
  } else {
    return null
  }
}

Segment.prototype.getEmissionEstimateWithIndex = function(onSuccess, onError) {
  this.getEmissionEstimate(
    this.onGetEmissionEstimateWithIndexSuccess(onSuccess),
    this.onGetEmissionEstimateWithIndexError(onError))
}

// Events

Segment.prototype.onGetEmissionEstimateWithIndexSuccess = function(onSuccess) {
  var index = this.index
  return function(emissionEstimate) {
    onSuccess(index, emissionEstimate)
  }
}
Segment.prototype.onGetEmissionEstimateWithIndexError = function(onError) {
  var index = this.index
  return function() {
    onError(index)
  }
}
