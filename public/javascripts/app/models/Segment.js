function Segment() {}

Segment.from_google = function(index, step) {
  if(step.travel_mode == 'DRIVING') {
    return new DrivingSegment(index, step)
  } else if(step.travel_mode == 'WALKING') {
    return new WalkingSegment(index, step)
  } else if(step.travel_mode == 'BICYCLING') {
    return new BicyclingSegment(index, step)
  } else {
    return null
  }
}

