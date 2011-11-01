NumberFormatter = {
  kilogramsToPounds: function(num, significantDigits) {
    if(!significantDigits) significantDigits = 2;
    var magnitude = Math.pow(10.0, significantDigits)
    return (Math.round(num * magnitude * 2.2046) / magnitude);
  },
  metersToMiles: function(num) {
    return (Math.round((num / 1609.3) * 100) / 100);
  }
}
