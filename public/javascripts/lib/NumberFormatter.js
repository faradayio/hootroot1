NumberFormatter = {
  kilogramsToPounds: function(num) {
    return (Math.round(num * 100 * 2.2046) / 100);
  },
  metersToMiles: function(num) {
    return (Math.round((num / 1609.3) * 100) / 100);
  }
}
