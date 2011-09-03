var url = require('url');

var SPI = module.exports = function(urlString) {
  this.urlString = urlString;
  this.url = url.parse(this.urlString, true);
  this.path = this.parseSpiPath();
  this.origin = this.getSpiPathParameter('from');
  this.destination = this.getSpiPathParameter('to');
};

SPI.current = function() {
  return new SPI(window.location.href);
};

SPI.generate = function(from, to) {
  var currentSpi = SPI.current();
  var newUrl = currentSpi.url.protocol + '//' +
               currentSpi.url.host +
               currentSpi.url.pathname +
               '#!/from/' + encodeURIComponent(from) +
               '/to/' + encodeURIComponent(to);
  return new SPI(newUrl);
};

SPI.go = function(destination) {
  document.location.href = destination;
};

SPI.prototype.parseSpiPath = function() {
  if(/#!/.test(this.url.hash)) {
    return decodeURIComponent(this.url.hash.substr(2));
  } else {
    return null;
  }
};

SPI.prototype.getSpiPathParameter = function(name) {
  if(this.path) {
    var parts = this.path.split('/');
    if(parts[0] == '') parts.shift();
    i = 0;
    while(i + 1 <= parts.length) {
      var part_name = parts[i];
      if(part_name == name) {
        return parts[i + 1];
      }
      i += 2;
    }
  }
  return null;
};
