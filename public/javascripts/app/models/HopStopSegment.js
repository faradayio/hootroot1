HopStopSegment = function() {}
HopStopSegment.prototype = Segment.prototype;

HopStopSegment.prototype.durationInMinutes = function() {
  if(this.duration)
    return this.duration / 60;
};
