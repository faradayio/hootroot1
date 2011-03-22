function RouteView(directions) {
  this.directions = directions;
  this.id = this.directions.mode.toLowerCase();
}

RouteView.prototype.output = function() {
  var html = '<ul>';
  var id = this.id;
  this.directions.eachSegment(function(segment) {
    var detail = segment.instructions + '<br />Emissions: <span class="emissions"><em>Loading...</em></span>';
    html += '<li id="' + id + '_segment_' + segment.index + '" class="' + id + '">' + detail + '</li>';
  });
  html += '</ul>';
  return html;
};

RouteView.prototype.update = function() {
  $('#' + this.id + ' .route').html(this.output());
};

RouteView.prototype.updateSegmentEmissions = function(segment, emissionEstimate) {
  var output;
  if(emissionEstimate.methodology) {
    output = '<a href="' + emissionEstimate.methodology() + '">' + emissionEstimate.toString() + '</a>';
  } else {
    output = emissionEstimate.toString();
  }

  $('#' + this.id + '_segment_' + segment.index + ' .emissions').html(output);
};

RouteView.prototype.updateTotalEmissions = function() {
  $('#' + this.id + ' .footprint').html(Math.round(this.directions.totalEmissions * 100) / 100);
};
