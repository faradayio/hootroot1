function DrivingSegment(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.mode = 'DRIVING';
}
DrivingSegment.prototype = new Segment();

Carbon.emitter(DrivingSegment, function(emitter) {
  emitter.emitAs('automobile_trip');
  emitter.provide('distance');
});
