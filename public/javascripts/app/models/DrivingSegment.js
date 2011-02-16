function DrivingSegment(index, step) {
  this.index = index
  this.distance = parseFloat(step.distance.value) / 1000.0
  this.instructions = step.instructions
}
DrivingSegment.prototype = new Segment()
DrivingSegment.prototype.emissions = function(onSuccess, onError) {
  var index = this.index
  $.ajax({
    url: 'http://carbon.brighterplanet.com/automobile_trips.json?distance=' + this.distance,
    dataType: 'json',
    success: function(data) { onSuccess(index, data['emission']) },
    error: function(data) { onError(index) }
  })
}
