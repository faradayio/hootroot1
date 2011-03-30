function WalkingSegment(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.mode = 'WALKING';
};
WalkingSegment.prototype = new Segment();

WalkingSegment.prototype.getEmissionEstimate = function(onSuccess, onError) {
  var estimate = new EmissionEstimate();
  estimate.data = {
    emission: 0
  };
  estimate.methodology = null;
  onSuccess(estimate);
};
