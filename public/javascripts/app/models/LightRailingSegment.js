LightRailingSegment = function(index, step) {
  this.index = index;
  if(step.distance) {
    this.distance = parseFloat(step.distance.value) / 1000.0;
  } else if(step.duration) {
    this.duration = step.duration / 3600;
  }
  this.instructions = step.instructions;
  this.rail_class = 'light rail';
}
LightRailingSegment.prototype = new Segment();

Carbon.emitter(LightRailingSegment, function(emitter) {
  emitter.emitAs('rail_trip');
  emitter.provide('distance_estimate', { as: 'distance' });
  emitter.provide('duration');
  emitter.provide('rail_class');
})