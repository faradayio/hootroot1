function BicyclingSegment(index, step) {
  this.index = index
  this.distance = parseFloat(step.distance.value) / 1000.0
  this.instructions = step.instructions
}
BicyclingSegment.prototype = new Segment()

BicyclingSegment.prototype.getEmissionEstimate = function(onSuccess, onError) {
  var estimate = new EmissionEstimate()
  estimate.data = {
    emission: 0
  }
  onSuccess(estimate)
}
