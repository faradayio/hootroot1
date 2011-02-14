function RouteView() {}
RouteView.prototype.segments = function(result) {
  var list = []
  var steps = result.routes[0].legs[0].steps
  for(i = 0; i < steps.length; i++) {
    var step = steps[i]
    list[i] = SegmentFactory.from_google(i, step)
  }
  return list
}
RouteView.prototype.output = function(segments) {
  var html = '<div id="route"><ul>'
  var total_emissions = 0;
  for(i = 0; i < segments.length; i++) {
    var segment = segments[i]
    var detail = segment.instructions + ', emissions: ' + segment.emissions()
    html += '<li id="' + segment.elementId + '" class="' + segment.elementClass + '">' + detail + '</li>'
    total_emissions += segment.emissions()
  }
  html += '</ul><p>Total emissions: ' + total_emissions + '</p></div>'
  return html
}
RouteView.prototype.update = function(result) {
  var segments = this.segments(result)
  var output = this.output(segments)
  $('#route').replaceWith(output)
}
