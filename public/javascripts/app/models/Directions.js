Directions = function(origin, destination, mode) {
  this.origin = origin;
  this.destination = destination;
  this.mode = mode;
  this.directionsResult = null;
  this.segmentEmissionsSuccessCount = 0;
}

Directions.create = function(origin, destination, mode, day) {
  if(mode == 'PUBLICTRANSIT' || mode == 'SUBWAYING' || mode == 'BUSSING') {
    return new HopStopDirections(origin, destination, mode, day);
  } else if(mode == 'FLYING') {
    return new FlyingDirections(origin, destination, mode);
  } else {
    return new GoogleDirections(origin, destination, mode);
  }
};

Directions.prototype.steps = function(index) {
  if(!this._steps && this.directionsResult) {
    this._steps = this.directionsResult.routes[0].legs[0].steps
  }

  return this._steps
}

Directions.prototype.segments = function() {
  if(!this._segments) {
    var list = [];
    for(var i = 0; i < this.steps().length; i++) {
      var step = this.steps()[i];
      list[i] = Segment.create(i, step);
    }
    this._segments = list;
  }

  return this._segments;
};

Directions.prototype.eachSegment = function(lambda) {
  for(var i = 0; i < this.segments().length; i++) {
    lambda(this.segments()[i]);
  }
};

Directions.prototype.getEmissions = function(onSuccess, onError, onFinish) {
  var onSuccessWithTotalEmissionUpdate = this.onSegmentEmissionsSuccess(onSuccess, onFinish);
  this.totalEmissions = 0.0;
  this.segmentEmissionsSuccessCount = 0;
  this.eachSegment(function(segment) {
    segment.getEmissionEstimateWithSegment(onSuccessWithTotalEmissionUpdate, onError);
  });
};

Directions.prototype.totalTime = function() {
  var totalTime = 0;
  this.eachSegment(function(segment) {
    totalTime += segment.duration;
  });
  return TimeFormatter.format(totalTime);
};



// Events

Directions.prototype.onSegmentEmissionsSuccess = function(onSuccess, onFinish) {
  return $.proxy(function(segment, emissionEstimate) {
      this.totalEmissions += emissionEstimate.value();
      onSuccess(this.mode, segment, emissionEstimate);

      this.segmentEmissionsSuccessCount++;
      if(onFinish && this.segmentEmissionsSuccessCount == this.segments().length) {
        onFinish(this);
      }
    },
    this);
};
