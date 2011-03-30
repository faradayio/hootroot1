HopStopSegment = function() {}
HopStopSegment.prototype = Segment.prototype;

HopStopSegment.prototype.durationInHours = function() {
  if(this.duration)
    return this.duration / 3600;
};

HopStopSegment.prototype.durationInMinutes = function() {
  if(this.duration)
    return this.duration / 60;
};
