function IndexController(mapId, routeId) {
  this.mapView = new MapView(mapId)
  this.routeView = new RouteView(routeId)
  this.directionsDisplay = new google.maps.DirectionsRenderer()

  return true
}

IndexController.prototype.init = function() {
  this.mapView.resize()
  this.directionsDisplay.setMap(this.mapView.googleMap())

  $('#go').click($.proxy(this.routeButtonClick, this))
  $('input[type=text]').keyup($.proxy(this.originDestinationInputKeyup, this))
}

IndexController.prototype.directions = function() {
  if(!this._directions) {
    this._directions = new Directions($('#origin').val(),
                                      $('#destination').val())
  }
  return this._directions
}

IndexController.prototype.getEmissions = function() {
  routeView = this.routeView
  this.directions().getEmissions(
    $.proxy(this.segmentEmissionsSuccess, this),
    $.proxy(this.segmentEmissionsFailure, this))
}

IndexController.prototype.getDirections = function () {
  this.directions().route(
    $.proxy(this.directionsRouteSuccess, this),
    $.proxy(this.directionsRouteFailure, this))
}

//////  Events 

IndexController.prototype.originDestinationInputKeyup = function(event) {
  if(event.keyCode == 13) {
    this.getDirections()
  }
}

IndexController.prototype.routeButtonClick = function() {
  this.getDirections()
}

IndexController.prototype.directionsRouteSuccess = function(result) {
  this.directionsDisplay.setDirections(result)
  this.routeView.update(this.directions())
  this.getEmissions()
}

IndexController.prototype.directionsRouteFailure = function(result, status) {
  alert('Failed to get directions')
}

IndexController.prototype.segmentEmissionsSuccess = function(index, emission_value) {
  this.routeView.updateSegmentEmissions(index, emission_value)
}

IndexController.prototype.segmentEmissionsFailure = function(index) {
  this.routeView.updateSegmentEmissions(index, 'Unable to fetch emissions')
}
