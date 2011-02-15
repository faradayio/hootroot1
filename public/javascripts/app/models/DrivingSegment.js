function DrivingSegment(index, step) {
  this.index = index
  this.distance = step.distance / 1000
  this.instructions = step.instructions
}
DrivingSegment.prototype = new Segment()
DrivingSegment.prototype.emissions = function(onSuccess, onError) {
  $.ajax({
    url: 'http://carbon.brighterplanet.com/automobile_trips?distance=' + this.distance,
    dataType: 'json',
    success: function(data) { onSuccess(data.emission) },
    error: onError
  })
}
