Segment = function() {};

Segment.create = function(index, step) {
  if(step.travel_mode == 'DRIVING') {
    return new DrivingSegment(index, step);
  } else if(step.travel_mode == 'WALKING' || step.travel_mode == 'ENTRANCEEXIT') {
    return new WalkingSegment(index, step);
  } else if(step.travel_mode == 'BICYCLING') {
    return new BicyclingSegment(index, step);
  } else if(step.travel_mode == 'SUBWAYING') {
    return new SubwayingSegment(index, step);
  } else if(step.travel_mode == 'BUSSING') {
    return new BussingSegment(index, step);
  } else if(step.travel_mode == 'LIGHTRAILING') {
    return new LightRailingSegment(index, step);
  } else if(step.travel_mode == 'FLYING') {
    return new FlyingSegment(index, step);
  } else if(step.travel_mode == 'AMTRAKING') {
    return new AmtrakingSegment(index, step);
  } else if(step.travel_mode == 'COMMUTERRAILING') {
    return new CommuterRailingSegment(index, step);
  } else {
    throw "Could not create a Segment for travel_mode: " + step.travel_mode;
  }
};

Segment.prototype.getEmissionEstimateWithSegment = function(onSuccess, onError) {
  this.getEmissionEstimate(
    $.proxy(this.onGetEmissionEstimateWithSegmentSuccess(onSuccess), this),
    $.proxy(this.onGetEmissionEstimateWithSegmentError(onError), this));
};

// Events

Segment.prototype.onGetEmissionEstimateWithSegmentSuccess = function(onSuccess) {
  return function(emissionEstimate) {
    onSuccess(this, emissionEstimate);
  };
};
Segment.prototype.onGetEmissionEstimateWithSegmentError = function(onError) {
  return function() {
    onError(this);
  };
}
