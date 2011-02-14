function DrivingSegment(index, step) {
  this.distance = step.distance / 1000
  this.elementClass = step.travel_mode.toLowerCase()
  this.elementId = 'segment_' + index
  this.instructions = step.instructions
}
DrivingSegment.prototype = new Segment()
DrivingSegment.prototype.emissions = function() {
  return 0.0
}
