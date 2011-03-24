function IndexController(mapId) {
  this.mapView = new MapView(mapId);
  this.directionsDisplay = new google.maps.DirectionsRenderer();
  this.directions = {};
  this.routeViews = {};

  return true;
}

IndexController.modes = ['DRIVING','WALKING','BICYCLING','PUBLICTRANSIT'];

IndexController.prototype.init = function() {
  Carbon.key = 'fd881ce1f975ac07b5c396591bd6978a'
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
  $('#link').click($.proxy(this.onLinkClick, this));
  $('#linkclose').click($.proxy(this.onLinkClick, this));
  $('#tweet').click($.proxy(this.onTweetClick, this));
  $('#restart').click(this.onRestartClick);

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
    this.routeViews[mode] = new RouteView(direction);
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

IndexController.prototype.getTweet = function() {
  document.body.style.cursor = 'wait';
  $.ajax('http://is.gd/create.php', {
    data: { url: this.currentUrl(), format: 'json' },
    dataType: 'json',
    success: function(data) {
      document.body.style.cursor = 'default';
      if(data.shorturl) {
        var status = "Check out my trip's carbon footprint: " + data.shorturl;
        document.location.href = 'http://twitter.com/?status=' + status;
      } else {
        alert('Failed to shorten URL: ' + data.errormessage);
      }
    },
    error :function(data) {
      document.body.style.cursor = 'default';
    }
  });
};

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
    $('#routing div').hide();
    $('#routing .' + this.id).show();
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

IndexController.prototype.onDirectionsRouteFailure = function(directions, result) {
  var routeView = this.routeViews[directions.mode.toLowerCase()];
  routeView.fail();
}

IndexController.prototype.onSegmentEmissionsSuccess = function(mode, segment, emissionEstimate) {
  var routeView = this.routeViews[mode.toLowerCase()];
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
  $('#wrapper').toggleClass('with_directions');
  $('#routing').toggle();
  return false;
}

IndexController.prototype.onLinkClick = function() {
  $('#permalink').val(this.currentUrl());
  $('#linkform').toggle('drop', { direction: 'up' }, 500);
  return false;
}

IndexController.prototype.onTweetClick = function() {
  this.getTweet();
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


