function RouteView() {}

RouteView.prototype.output = function(directions) {
  var html = '<div id="route"><ul>'
  var total_emissions = 0;
  directions.eachSegment(function(segment) {
    var detail = segment.instructions + ', emissions: <span class="emissions"><em>Loading...</em></span>'
    html += '<li id="segment_' + segment.index + '" class="driving">' + detail + '</li>'
  })
  html += '</ul><p>Total emissions: <span id="emissions_total">' + total_emissions + '</span></p></div>'
  return html
}

RouteView.prototype.update = function(directions) {
  var output = this.output(directions)
  $('#route').replaceWith(output)
}

RouteView.prototype.updateSegmentEmissions = function(index, emission_value) {
  $('#segment_' + index + ' .emissions').html(emission_value)
}
