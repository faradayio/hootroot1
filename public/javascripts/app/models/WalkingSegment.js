function WalkingSegment(index, step) {
  this.index = index
  this.distance = parseFloat(step.distance.value) / 1000.0
  this.instructions = step.instructions
}
WalkingSegment.prototype = new Segment()
WalkingSegment.prototype.emissions = function(onSuccess, onError) {
  onSuccess(this.index, 0)
}
