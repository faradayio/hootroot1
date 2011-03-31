function IndexController(mapId) {
  this.mapView = new MapView(mapId);
  this.directionsDisplay = new google.maps.DirectionsRenderer();
  this.directions = {};
  this.routeViews = {};
  var modes = IndexController.modes;
  for(var i in modes) { this.routeViews[modes[i].toLowerCase()] = new RouteView(this, modes[i]); }
  this.hootBarController = new HootBarController(this);

  return true;
}

IndexController.modes = ['DRIVING','WALKING','BICYCLING','PUBLICTRANSIT','FLYING'];

IndexController.prototype.init = function() {
  Carbon.key = 'fd881ce1f975ac07b5c396591bd6978a'
  this.mapView.resize();
  this.mapView.googleMap();

  $('#go').click($.proxy(this.routeButtonClick, this));
  $('input[type=text]').keyup($.proxy(this.originDestinationInputKeyup, this));
  $('#when').val('Today');
  $('#example').click(this.onExampleClick);
  this.hootBarController.init();
  for(var i in this.routeViews) {
    this.routeViews[i].enable();
  }

  if(Url.origin()) {
    $('#origin').val(Url.origin());
  }
  if(Url.destination()) {
    $('#destination').val(Url.destination());
  }
  if(Url.origin() && Url.destination()) {
    this.routeButtonClick();
  }
};


IndexController.prototype.getEmissions = function(directions) {
  directions.getEmissions(
      $.proxy(this.onSegmentEmissionsSuccess, this),
      $.proxy(this.onSegmentEmissionsFailure, this),
      this.onSegmentEmissionsFinish);
};

IndexController.prototype.getDirections = function () {
  for(var i in IndexController.modes) {
    var mode = IndexController.modes[i].toLowerCase();
    var direction = Directions.create(
      $('#origin').val(), $('#destination').val(), IndexController.modes[i]);
    this.directions[mode] = direction;
    direction.route(
      $.proxy(this.onDirectionsRouteSuccess, this),
      $.proxy(this.onDirectionsRouteFailure, this));
  }
  this.directionsDisplay.setMap(null); 
  this.directionsDisplay.setMap(this.mapView.googleMap());
}

IndexController.prototype.currentUrl = function() {
  return Url.generate($('#origin').val(), $('#destination').val());
};

IndexController.prototype.currentRoute = function() {
  return this.routeViewFor($('#modes .selected').get(0).id);
};

IndexController.prototype.displayDirectionsFor = function(directions) {
  if(directions.mode == 'FLYING') { 
    this.flightPath().display();
  } else {
    this.directionsDisplay.setOptions({ preserveViewport: true });
    this.directionsDisplay.setDirections(directions.directionsResult);
    this.directionsDisplay.setMap(this.mapView.googleMap());
  }
};

IndexController.prototype.hideDirectionsFor = function(directions) {
  if(directions.mode == 'FLYING') { 
    this.flightPath().hide();
  } else {
    this.directionsDisplay.setMap(null);
  }
};

IndexController.prototype.flightPath = function() {
  if(!this._flightPath && this.directions.flying) {
    this._flightPath = new FlightPath(this, this.directions.flying); 
  }
  return this._flightPath;
};

IndexController.prototype.clearFlightPath = function() {
  this._flightPath = null;
};

IndexController.prototype.routeViewFor = function(directions_or_mode) {
  var mode;
  if(directions_or_mode.mode) {
    mode = directions_or_mode.mode;
  } else {
    mode = directions_or_mode;
  }
  return this.routeViews[mode.toLowerCase()];
}


//////  Events 

IndexController.prototype.originDestinationInputKeyup = function(event) {
  if(event.keyCode == 13) {
    this.routeButtonClick();
  }
};

IndexController.prototype.routeButtonClick = function() {
  Url.go(this.currentUrl());
  this.getDirections();
  $('#search').hide('drop', { direction: 'up' }, 500);
  $('h1').hide('drop', { direction: 'up' }, 500);
  $('#nav').show('slide', { direction: 'up' }, 500);
  $('#meta').hide();
  $('#modes .failed').each(function(element) { $(element).removeClass('failed'); });
  for(var i in this.routeViews) { this.routeViews[i].enable().start(); }
  this.routeViews.driving.select();
  if(this.flightPath()) {
    this.flightPath().hide();
    this.clearFlightPath();
  }
  $('#modes').show('slide', { direction: 'down' }, 500);
  if ($('#about').is(':visible')) {
    $('#about').hide('drop', { direction: 'up' }, 500);
  }
};

IndexController.prototype.onModeClick = function(controller) {
  return function() {
    var newMode = controller.routeViewFor(this.id);

    var oldDirectionId = this.parentNode.getElementsByClassName('selected')[0].id;
    var oldDirection = controller.directions[oldDirectionId];

    var newDirection = controller.directions[this.id];

    if(oldDirection.mode == newDirection.mode) {
      newMode.toggleDirections();
    } else {
      newMode.select();

      controller.hideDirectionsFor(oldDirection);
      controller.displayDirectionsFor(newDirection);

      $('#routing div').hide();
      $('#routing .' + this.id).show();
    }

    return false;
  };
};

IndexController.prototype.onModeHoverIn = function(controller) {
  return function() {
    var direction = controller.directions[this.id];
    var originalDirectionId = this.parentNode.getElementsByClassName('selected')[0].id;
    var originalDirection = controller.directions[originalDirectionId];
    controller.hideDirectionsFor(originalDirection);
    controller.displayDirectionsFor(direction);
  };
};

IndexController.prototype.onModeHoverOut = function(controller) {
  return function() {
    var direction = controller.directions[this.id];
    var originalDirectionId = this.parentNode.getElementsByClassName('selected')[0].id;
    var originalDirection = controller.directions[originalDirectionId];
    controller.hideDirectionsFor(direction);
    controller.displayDirectionsFor(originalDirection);
  };
};

IndexController.prototype.onDirectionsRouteSuccess = function(directions) {
  this.routeViewFor(directions).updateDirections();
  this.getEmissions(directions);
  if(directions.mode == 'DRIVING') {
    this.directionsDisplay.setOptions({ preserveViewport: false });
    this.directionsDisplay.setDirections(directions.directionsResult);
  }
  $('#' + directions.mode.toLowerCase() + ' a span.total_time').html(directions.totalTime());
}

IndexController.prototype.onDirectionsRouteFailure = function(directions, result) {
  this.routeViewFor(directions).disable();
}

IndexController.prototype.onSegmentEmissionsSuccess = function(mode, segment, emissionEstimate) {
  var routeView = this.routeViewFor(mode);
  routeView.updateSegmentEmissions(segment, emissionEstimate);
  routeView.updateTotalEmissions();
};

IndexController.prototype.onSegmentEmissionsFailure = function(segment) {
  this.routeViewFor(segment.mode).updateSegmentEmissions(segment, 'Unable to fetch emissions');
};

IndexController.prototype.onSegmentEmissionsFinish = function(segment) {  // tell 'em, SoulJa Boy
  $('li#' + segment.mode.toLowerCase()).removeClass('loading');
};

IndexController.prototype.onExampleClick = function() {
  $('#origin').val('1916 Broadway, New York, NY');
  $('#destination').val('162 Madison Ave, New York, NY');
  return false;
}
