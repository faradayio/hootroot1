function IndexController(mapId, routeId) {
  this.mapView = new MapView(mapId)
  this.routeView = new RouteView(routeId)

  return true
}

IndexController.prototype.init = function() {
  this.sizeMap()
  this.mapView.googleMap()

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

IndexController.prototype.sizeMap = function() {
  this.mapView.canvas().width('100%')
  this.mapView.canvas().height('600px')
}

IndexController.prototype.segments = function(result) {
  if(!this._segments) {
    var list = []
    var steps = result.routes[0].legs[0].steps
    for(i = 0; i < steps.length; i++) {
      var step = steps[i]
      list[i] = Segment.from_google(i, step)
    }
    this._segments = list
  }
  return this._segments
}

IndexController.prototype.events = {
  emissionSuccess: function(data) {

  },
  emissionError: function(data) {

  }
}

IndexController.prototype.getEmissions = function(segments) {
  for(i = 0; i < this.segments().length; i++) {
    segment = this.segments()[i]
    segment.emissions(this.events.emissionSuccess,
                      this.events.emissionError)
  }
}

IndexController.prototype.getDirections = function () {
  directionsService = new google.maps.DirectionsService()
  directionsDisplay = new google.maps.DirectionsRenderer()
  directionsDisplay.setMap(this.mapView.googleMap())

  var request = {
    origin: this.origin(), 
    destination: this.destination(),
    travelMode: google.maps.DirectionsTravelMode.DRIVING
  }
  directionsService.route(request, function(result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(result)

      this.routeView.update(this.segments())
      this.getEmissions()
      this.routeView.updateTotalEmissions(totalEmissions)
    }
  })
}

IndexController.prototype.originField = function () {
  return $('#origin')
}

IndexController.prototype.destinationField = function () {
  return $('#destination')
}

IndexController.prototype.origin = function () {
  return this.originField().val()
}

IndexController.prototype.destination = function () {
  return this.destinationField().val()
}

IndexController.prototype.button = function () {
  return $('#go')
}
