function MapController(map) {
  this.map = map

  return true
}

MapController.prototype.init = function () {
  this.sizeMap()
  this.map.googleMap()

  mc = this
  this.button().onclick = function () {
    mc.getDirections()
  }
}

MapController.prototype.sizeMap = function () {
  this.map.canvas.style.width = '100%'
  this.map.canvas.style.height = '600px'
}

MapController.prototype.getDirections = function () {
  directionsService = new google.maps.DirectionsService()
  directionsDisplay = new google.maps.DirectionsRenderer()
  directionsDisplay.setMap(this.map.googleMap())
  routeView = new RouteView()

  var request = {
    origin: this.origin(), 
    destination: this.destination(),
    travelMode: google.maps.DirectionsTravelMode.DRIVING
  }
  directionsService.route(request, function(result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(result)
      routeView.update(result)
    }
  })
}
MapController.prototype.originField = function () {
  return document.getElementById("origin")
}
MapController.prototype.destinationField = function () {
  return document.getElementById("destination")
}
MapController.prototype.origin = function () {
  return this.originField().value
}
MapController.prototype.destination = function () {
  return this.destinationField().value
}
MapController.prototype.button = function () {
  return document.getElementById("go")
}
