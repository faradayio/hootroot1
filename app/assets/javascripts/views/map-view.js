var $ = require('qwery'),
    bonzo = require('bonzo'),
    Google = require('../lib/google');

var MapView = module.exports = function(mapId) {
  this.mapId = mapId;
  var ll = new Google.maps.LatLng(39.57, -97.82);
  this.options = {
    zoom: 4,
    center: ll,
    mapTypeId: Google.maps.MapTypeId.ROADMAP,
    scaleControl: true,
    scaleControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    }
  };

  this.canvas = $(this.mapId);
  this.googleMap = new Google.maps.Map(this.canvas[0], this.options);

  return true;
}

MapView.prototype.resize = function() {
  bonzo(this.canvas).css({
    width: '100%',
    height: '100%'
  });
}
