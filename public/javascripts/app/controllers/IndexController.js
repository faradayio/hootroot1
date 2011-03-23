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
  $('#modes li').hover(this.onModeHoverIn(this),this.onModeHoverOut(this));
  $('#when').val('Today');
  $('#example').click(this.onExampleClick);
  $('#aboutlink').click(this.onAboutClick);
  $('#about').click(this.onAboutClick);
  $('#directions').click(this.onDirectionsClick);
  $('#link').click(this.onLinkClick);
  $('#linkclose').click(this.onLinkClick);
  $('#tweet').click(this.onTweetClick);
  $('#restart').click(this.onRestartClick);
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
    this.routeButtonClick();
  }
};

IndexController.prototype.routeButtonClick = function() {
  this.getDirections();
  $('#search').hide('drop', { direction: 'up' }, 500);
  $('h1').hide('drop', { direction: 'up' }, 500);
  $('#nav').show('slide', { direction: 'up' }, 500);
  $('#meta').hide();
  $('#modes').show('slide', { direction: 'down' }, 500);
  if ($('#about').is(':visible')) {
    $('#about').hide('drop', { direction: 'up' }, 500);
  }
};

IndexController.prototype.onModeClick = function(controller) {
  return function() {
    $('#modes li').removeClass('selected');
    $(this).addClass('selected');
    var direction = controller.directions[this.id];
    controller.directionsDisplay.setDirections(direction.directionsResult);
    if (this.id == 'publictransit' && $('#hopstop').is(':hidden')) {
      $('#hopstop').show('slide', { direction: 'down' }, 500);
    } else if (this.id != 'publictransit' && $('#hopstop').is(':visible') ) {
      $('#hopstop').hide('slide', { direction: 'down' }, 500);
    }
    return false;
  };
};

IndexController.prototype.onModeHoverIn = function(controller) {
  return function() {
    var direction = controller.directions[this.id];
    controller.directionsDisplay.setOptions({ preserveViewport: true });
    controller.directionsDisplay.setDirections(direction.directionsResult);
  };
};

IndexController.prototype.onModeHoverOut = function(controller) {
  return function() {
    var originalDirectionId = this.parentElement.getElementsByClassName('selected')[0].id;
    var originalDirection = controller.directions[originalDirectionId];
    controller.directionsDisplay.setOptions({ preserveViewport: true });
    controller.directionsDisplay.setDirections(originalDirection.directionsResult);
  };
};

IndexController.prototype.onDirectionsRouteSuccess = function(directions) {
  this.routeViews[directions.mode.toLowerCase()].update(directions);
  this.getEmissions(directions);
  if(directions.mode == 'DRIVING') {
    this.directionsDisplay.setOptions({ preserveViewport: false });
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
};

IndexController.prototype.onSegmentEmissionsFailure = function(segment) {
  var routeView = this.routeViews[segment.mode.toLowerCase()];
  routeView.updateSegmentEmissions(segment, 'Unable to fetch emissions');
};

IndexController.prototype.onSegmentEmissionsFinish = function(segment) {  // tell 'em, SoulJa Boy
  $('li#' + segment.mode.toLowerCase()).removeClass('loading');
};

IndexController.prototype.onExampleClick = function() {
  $('#origin').val('1916 Broadway, New York, NY');
  $('#destination').val('162 Madison Ave, New York, NY');
  return false;
}

IndexController.prototype.onAboutClick = function() {
  $('#about').toggle('slide', { direction: 'up' }, 500);
  return false;
}

IndexController.prototype.onDirectionsClick = function() {
  return false;
}

IndexController.prototype.onLinkClick = function() {
  $('#permalink').val('FIXME');
  $('#linkform').toggle('drop', { direction: 'up' }, 500);
  return false;
}

IndexController.prototype.onTweetClick = function() {
  window.open('http://twitter.com/?status=FIXME');
  return false;
}

IndexController.prototype.onRestartClick = function() {
  $('#search').show('drop', { direction: 'up' }, 500);
  $('h1').show('drop', { direction: 'up' }, 500);
  $('#nav').hide('slide', { direction: 'up' }, 500);
  $('#meta').show();
  $('#modes').hide('slide', { direction: 'down' }, 500);
  return false;
}


