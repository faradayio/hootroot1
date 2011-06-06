FlyingSegment = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  this.instructions = step.instructions;
  this.trips = 1;
  this.mode = 'FLYING';
}
FlyingSegment.prototype = new Segment();

Carbon.emitter(FlyingSegment, function(emitter) {
  emitter.emitAs('flight');
  emitter.provide('distaince', { as: 'distance_estimate' });
  emitter.provide('trips');
});
