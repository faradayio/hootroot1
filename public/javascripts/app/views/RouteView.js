function RouteView() {}

RouteView.prototype.output = function(segments) {
  var html = '<div id="route"><ul>'
  var total_emissions = 0;
  for(i = 0; i < segments.length; i++) {
    var segment = segments[i]
    var detail = segment.instructions + ', emissions: <span class="emissions"><em>Loading...</em></span>'
    html += '<li id="segment_' + segment.index + '" class="driving">' + detail + '</li>'
  }
  html += '</ul><p>Total emissions: <span id="emissions_total">' + total_emissions + '</span></p></div>'
  return html
}

RouteView.prototype.update = function(segments) {
  var output = this.output(segments)
  $('#route').replaceWith(output)
}

RouteView.prototype.updateSegmentEmissions = function(index, emission_value) {
  $('#segment_' + index + ' .emissions').html(emission_value)
}
