AmtrakingSegment = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.rail_class = 'intercity rail';
}
AmtrakingSegment.prototype = new HopStopSegment();

Carbon.emitter(AmtrakingSegment, function(emitter) {
  emitter.emitAs('rail_trip');
  emitter.provide('distance_estimate', { as: 'distance' });
  emitter.provide('duration', { as: 'durationInHours' });
  emitter.provide('rail_class');
})
