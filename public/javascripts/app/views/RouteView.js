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
  if(emissionEstimate.methodology) {
    output = '<a href="' + emissionEstimate.methodology() + '">' + (Math.round(emissionEstimate.value() * 100) / 100) + ' kg CO₂</a>';
  } else {
    output = (Math.round(emissionEstimate.value() * 100) / 100) + ' kg CO₂';
  }

  $('#' + this.id + '_segment_' + segment.index + ' span.emissions').html(output);
};

RouteView.prototype.updateTotalEmissions = function() {
  $('#' + this.id + ' .footprint').html(Math.round(this.directions.totalEmissions * 100) / 100);
};
