if(typeof google == 'undefined') {
  module.exports = Google = {
    maps: {
      DirectionsRenderer: function() {}
    }
  };
} else {
  module.exports = Google = google;
}

