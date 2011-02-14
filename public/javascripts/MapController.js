function MapController(map) {
  this.map = map

  return true
}

MapController.prototype.init = function() {
  this.sizeMap()
  this.map.googleMap()

  mc = this

  newDirections = function() {
    mc.getDirections()
  }
  this.button().click(function() {
    newDirections()
  })
  $('input[type=text]').keyup(function(event) {
    if(event.keyCode == 13) {
      newDirections()
    }
  })
}

MapController.prototype.sizeMap = function() {
  this.map.canvas().width('100%')
  this.map.canvas().height('600px')
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
  return $('#origin')
}
MapController.prototype.destinationField = function () {
  return $('#destination')
}
MapController.prototype.origin = function () {
  return this.originField().val()
}
MapController.prototype.destination = function () {
  return this.destinationField().val()
}
MapController.prototype.button = function () {
  return $('#go')
}
