function Segment() {}

Segment.from_google = function(index, step) {
  if(step.travel_mode == 'DRIVING') {
    return new DrivingSegment(index, step)
  } else {
    return null
  }
}

