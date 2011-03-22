function IndexController(mapId) {
  this.mapView = new MapView(mapId);
  this.directionsDisplay = new google.maps.DirectionsRenderer();
  this.directions = {};
  this.routeViews = {};

  return true;
}

IndexController.modes = ['DRIVING','WALKING','BICYCLING','PUBLICTRANSIT'];

IndexController.prototype.init = function() {
  this.mapView.resize();
  this.mapView.googleMap();

  $('#go').click($.proxy(this.routeButtonClick, this));
  $('input[type=text]').keyup($.proxy(this.originDestinationInputKeyup, this));
  $('#modes li').click(this.onModeClick(this));
  $('#modes li').hover(this.onModeHover);
  $('#when').val('Today');
};


IndexController.prototype.getEmissions = function(directions) {
  directions.getEmissions(
      $.proxy(this.onSegmentEmissionsSuccess, this),
      $.proxy(this.onSegmentEmissionsFailure, this));
};

IndexController.prototype.getDirections = function () {
  for(var i in IndexController.modes) {
    var mode = IndexController.modes[i].toLowerCase();
    var direction = Directions.create(
      $('#origin').val(), $('#destination').val(), IndexController.modes[i]);
    this.routeViews[mode] = new RouteView(direction);
    this.directions[mode] = direction;
    direction.route(
      $.proxy(this.onDirectionsRouteSuccess, this),
      this.onDirectionsRouteFailure);
  }
  this.directionsDisplay.setMap(null); 
  this.directionsDisplay.setMap(this.mapView.googleMap());
}

//////  Events 

IndexController.prototype.originDestinationInputKeyup = function(event) {
  if(event.keyCode == 13) {
    this.getDirections();
  }
};

IndexController.prototype.routeButtonClick = function() {
  this.getDirections();
  $('#search').hide('drop', { direction: 'up' }, 500);
  $('#modes').show('slide', { direction: 'up' }, 500);
};

IndexController.prototype.onModeClick = function(controller) {
  return function() {
    $('#modes li').removeClass('selected');
    $(this).addClass('selected');
    var direction = controller.directions[this.id];
    controller.directionsDisplay.setDirections(direction.directionsResult);
  };
};

IndexController.prototype.onDirectionsRouteSuccess = function(directions) {
  this.routeViews[directions.mode.toLowerCase()].update(directions);
  this.getEmissions(directions);
  if(directions.mode == 'DRIVING') {
    this.directionsDisplay.setDirections(directions.directionsResult);
  }
}

IndexController.prototype.onDirectionsRouteFailure = function(result, status) {
  alert('Failed to get directions');
}

IndexController.prototype.onSegmentEmissionsSuccess = function(segment, emissionEstimate) {
  var routeView = this.routeViews[segment.mode.toLowerCase()];
  routeView.updateSegmentEmissions(segment, emissionEstimate);
  routeView.updateTotalEmissions();
}

IndexController.prototype.onSegmentEmissionsFailure = function(segment) {
  var routeView = this.routeViews[segment.mode.toLowerCase()];
  routeView.updateSegmentEmissions(segment, 'Unable to fetch emissions')
}
