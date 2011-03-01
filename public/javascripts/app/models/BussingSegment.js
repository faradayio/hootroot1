BussingSegment = function(index, step) {
  this.index = index
  this.distance = parseFloat(step.distance.value) / 1000.0
  this.instructions = step.instructions
  this.bus_class = 'city transit'
}
BussingSegment.prototype = new Segment()

Carbon.emitter(BussingSegment, function(emitter) {
  emitter.emitAs('bus_trip')
  emitter.provide('distance')
  emitter.provide('bus_class')
})
