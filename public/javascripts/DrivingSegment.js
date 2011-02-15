function DrivingSegment(index, step) {
  this.distance = step.distance / 1000
  this.elementClass = step.travel_mode.toLowerCase()
  this.elementId = 'segment_' + index
  this.instructions = step.instructions
}
DrivingSegment.prototype = new Segment()
DrivingSegment.prototype.emissions = function(element) {
  element.html('Loading emissions data...')
  $.ajax({
    url: 'http://carbon.brighterplanet.com/automobile_trips?distance=' + this.distance,
    dataType: 'json',
    success: DrivingSegment.onSuccess,
    error: DrivingSegment.onError
  })
}

DrivingSegment.onSuccess = function(data) { element.html(data['emissions']) }
DrivingSegment.onError = function(data) { element.html('Failed to load emissions data') }
