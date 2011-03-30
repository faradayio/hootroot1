HopStopSegment = function() {}
HopStopSegment.prototype = Segment.prototype;

HopStopSegment.prototype.durationInHours = function() {
  if(this.duration)
    return this.duration / 3600;
};
