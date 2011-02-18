function BicyclingSegment(index, step) {
  this.index = index
  this.distance = parseFloat(step.distance.value) / 1000.0
  this.instructions = step.instructions
}
BicyclingSegment.prototype = new Segment()
BicyclingSegment.prototype.emissions = function(onSuccess, onError) {
  onSuccess(this.index, 0)
}
