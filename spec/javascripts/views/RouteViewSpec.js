stub_google(function() {
  describe('RouteView', function() {
    var routeView
    var directions

    beforeEach(function() {
      routeView = new RouteView()
      directions = Directions.create('Lansing, MI', 'Ann Arbor, MI', 'DRIVING')
      directions.directionResult = GoogleResult.driving
    })

    describe('#update', function() {
      it('updates the #route div with directions', function() {
        setFixtures('<div id="route"></div>')
        routeView.update(directions)
        expect($('#route').html()).toContain('Total emissions')
      })
    })

    describe('#updateSegmentEmissions', function() {
      it('updates the emissions of a segment', function() {
        setFixtures('<div id="route"></div>')
        routeView.update(directions)
        var emissionEstimate = {
          methodology: function() { },
          toString: function() { return 'BINGO' }
        }
        routeView.updateSegmentEmissions(0, emissionEstimate)
        expect($('#segment_0').html()).toContain('BINGO')
      })
    })
  })
})
