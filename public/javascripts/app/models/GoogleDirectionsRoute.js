GoogleDirectionsRoute = function(hopstopData) {
  this.hopstopData = hopstopData;
  this.copyrights = 'Copyright HopStop.com, Inc.';
  this.overview_path = GoogleDirectionsRoute.generateOverviewPath(hopstopData.steps);
  this.legs = [{
    duration: { value: this.hopstopData.duration },
    start_address: '',
    start_location: this.overview_path[0],
    end_address: '',
    end_location: this.overview_path[this.overview_path.length - 1],
    steps: GoogleDirectionsRoute.generateSteps(this.hopstopData.steps),
    via_waypoints: []
  }];
  this.warnings = [];
  this.bounds = GoogleDirectionsRoute.generateBounds(this.hopstopData.steps);
};

GoogleDirectionsRoute.generateOverviewPath = function(steps) {
  var path = [];
  for(i in steps) {
    var step = steps[i];
    if(step.start_position) {
      var startLatLng = new google.maps.LatLng(
        step.start_position.lat, step.start_position.lon );
      path.push(startLatLng);
      var endLatLng = new google.maps.LatLng(
          step.end_position.lat, step.end_position.lon);
      path.push(endLatLng);
    }
  }

  return path;
};

GoogleDirectionsRoute.generateBounds = function(steps) {
  var coords = {};

  for(i in steps) {
    var step = steps[i];
    coords = GoogleDirectionsRoute.recordCoords(step.start_position, coords);
    coords = GoogleDirectionsRoute.recordCoords(step.end_position, coords);
  }

  if(coords.sWLat != null && coords.sWLng != null && 
     coords.nELat != null && coords.nELng != null) {
    var southWest = new google.maps.LatLng(coords.sWLat, coords.sWLng);
    var northEast = new google.maps.LatLng(coords.nELat, coords.nELng);
    return new google.maps.LatLngBounds(southWest, northEast);
  } else {
    return null;
  }
};

GoogleDirectionsRoute.recordCoords = function(position, coords) {
  if(position) {
    var lat = position.lat;
    var lng = position.lon;
    coords.sWLat = (coords.sWLat == null ? lat : Math.min(coords.sWLat, lat));
    coords.sWLng = (coords.sWLng == null ? lng : Math.min(coords.sWLng, lng));
    coords.nELat = (coords.nELat == null ? lat : Math.max(coords.nELat, lat));
    coords.nELng = (coords.nELng == null ? lng : Math.max(coords.nELng, lng));
  }

  return coords;
};

GoogleDirectionsRoute.generateSteps = function(steps) {
  var googleSteps = [];

  for(i in steps) {
    var step = steps[i];
    var googleStep = {};

    googleStep.duration = step.duration;
    googleStep.instructions = step.instructions;
    googleStep.travel_mode = step.travel_mode;
    googleStep.path = [];

    if(step.start_position) {
      googleStep.start_location = new google.maps.LatLng(step.start_position.lat, step.start_position.lon);
      googleStep.path.push(googleStep.start_location);
    }
    if(step.end_position) {
      googleStep.end_location = new google.maps.LatLng(step.end_position.lat, step.end_position.lon);
      googleStep.path.push(googleStep.end_location);
    }

    googleSteps.push(googleStep);
  }

  return googleSteps;
};
