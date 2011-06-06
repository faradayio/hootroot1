BussingSegment = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.bus_class = 'city transit';
  this.mode = 'BUSSING';
}
BussingSegment.prototype = new HopStopSegment();

Carbon.emitter(BussingSegment, function(emitter) {
  emitter.emitAs('bus_trip');
  emitter.provide('distance');
  emitter.provide('durationInMinutes', { as: 'duration' });
  emitter.provide('bus_class');
});
