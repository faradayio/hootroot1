stub_google(function() {
  describe('RouteView', function() {
    var routeView
    var directions

    beforeEach(function() {
      routeView = new RouteView()
      directions = new Directions('Lansing, MI', 'Ann Arbor, MI')
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
        routeView.updateSegmentEmissions(0, 'BINGO')
        expect($('#segment_0').html()).toContain('BINGO')
      })
    })
  })
})
