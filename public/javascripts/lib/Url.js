Url = {
  actual: function() { return document.URL },

  get: function() {
    return decodeURIComponent(this.actual());
  },
  go: function(destination) {
    document.location.href = destination;
  },

  baseUrl: function() {
    var match = this.get().match(/^([^#]*)/);
    var base = match[1];
    if(!base.match(/\/$/)) {
      base += '/';
    }
    return base; // your base no longer belongs to us
  },

  spi: function() {
    var match = this.get().match(/#!(.*)/);
    if(match) {
      return match[1];
    } else {
      return null;
    }
  },

  getSpiPathParameter: function(name) {
    if(this.spi()) {
      var parts = this.get().split('/');
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
  },

  origin: function() {
    return this.getSpiPathParameter('from');
  },
  destination: function() {
    return this.getSpiPathParameter('to');
  },

  generate: function(from, to) {
    return this.baseUrl() + '#!/from/' + encodeURIComponent(from) + '/to/' + encodeURIComponent(to);
  }
};
