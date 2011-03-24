Url = {
  spi: function() {
    var match = document.url.match(/#!(.*)/);
    if(match) {
      return match[1];
    } else {
      return null;
    }
  },

  getSpiPathParameter: function(name) {
    if(this.spi()) {
      var parts = document.url.split('/');
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
  }
};
