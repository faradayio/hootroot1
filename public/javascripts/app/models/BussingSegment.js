BussingSegment = function(index, step) {
  this.index = index;
  if(step.distance) {
    this.distance = parseFloat(step.distance.value) / 1000.0;
  } else if(step.duration) {
    this.duration = step.duration / 3600;
  }
  this.instructions = step.instructions;
  this.bus_class = 'city transit';
}
BussingSegment.prototype = new Segment();

Carbon.emitter(BussingSegment, function(emitter) {
  emitter.emitAs('bus_trip');
  emitter.provide('distance');
  emitter.provide('duration');
  emitter.provide('bus_class');
});
