CommuterRailingSegment = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.rail_class = 'commuter rail';
}
CommuterRailingSegment.prototype = new HopStopSegment();

Carbon.emitter(CommuterRailingSegment, function(emitter) {
  emitter.emitAs('rail_trip');
  emitter.provide('distance', { as: 'distance_estimate' });
  emitter.provide('duration');
  emitter.provide('rail_class');
})
