SubwayingSegment = function(index, step) {
  this.index = index
  this.distance = parseFloat(step.distance.value) / 1000.0
  this.instructions = step.instructions
  this.rail_class = 'heavy rail'
}
SubwayingSegment.prototype = new Segment()

Carbon.emitter(SubwayingSegment, function(emitter) {
  emitter.emitAs('rail_trip')
  emitter.provide('distance_estimate', { as: 'distance' })
  emitter.provide('rail_class')
})
