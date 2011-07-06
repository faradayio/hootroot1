SubwayingSegment = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  console.log('duration: ' + step.duration);
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.rail_class = 'heavy rail';
  this.mode = 'SUBWAYING';
}
SubwayingSegment.prototype = new HopStopSegment();

Carbon.emitter(SubwayingSegment, function(emitter) {
  emitter.emitAs('rail_trip');
  emitter.provide('distance', { as: 'distance_estimate' });
  emitter.provide('duration');
  emitter.provide('rail_class');
});
