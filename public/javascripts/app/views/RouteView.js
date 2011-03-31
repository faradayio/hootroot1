function RouteView(directions) {
  this.directions = directions;
  this.id = this.directions.mode.toLowerCase();
}

RouteView.prototype.output = function() {
  var html = '<ul>';
  var id = this.id;
  this.directions.eachSegment(function(segment) {
    var detail = '<p class="instructions">' + segment.instructions + '</p><p class="emissions">Emissions: <span class="emissions"><em>Loading...</em></span></p>';
    html += '<li id="' + id + '_segment_' + segment.index + '" class="' + id + '">' + detail + '</li>';
  });
  html += '</ul>';
  return html;
};

RouteView.prototype.update = function() {
  $('#routing .' + this.id).html(this.output());
};

RouteView.prototype.updateSegmentEmissions = function(segment, emissionEstimate) {
  var output;
  var value = (Math.round(emissionEstimate.value() * 100 * 2.2046) / 100);
  if(emissionEstimate.methodology) {
    output = '<a href="' + emissionEstimate.methodology() + '">' + value + ' lbs CO₂</a>';
  } else {
    output = value.toString() + ' lbs CO₂';
  }

  $('#' + this.id + '_segment_' + segment.index + ' span.emissions').html(output);
};

RouteView.prototype.updateTotalEmissions = function() {
  var value = (Math.round(this.directions.totalEmissions * 100 * 2.2046) / 100);
  $('#' + this.id + ' .footprint').html(value).addClass('complete');
};

RouteView.prototype.fail = function() {
  $('#' + this.id).removeClass('loading');
  $('#' + this.id).addClass('disabled');
  $('#' + this.id).unbind('click');
  $('#' + this.id).unbind('mouseenter mouseleave');
};
