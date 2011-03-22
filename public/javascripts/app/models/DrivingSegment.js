function DrivingSegment(index, step) {
  this.index = index;
  this.distance = parseFloat(step.distance.value) / 1000.0;
  this.instructions = step.instructions;
  this.mode = 'DRIVING';
}
DrivingSegment.prototype = new Segment();

Carbon.emitter(DrivingSegment, function(emitter) {
  emitter.emitAs('automobile_trip');
  emitter.provide('distance');
});
