describe('DrivingSegment', function() {
  var segment;

  beforeEach(function() {
    setFixtures('<div id="quiet"></div>')
    var step = {
      distance: 10000,
      travel_mode: 'DRIVING',
      instructions: 'Go West, young man!'
    }
    segment = new DrivingSegment(0, step)
  })

  describe('#emissions', function() {
    it('sets the value of the specified element to the emissions result')
    it('runs an onFailure handler on a failed fetch', function() {
      DrivingSegment.onError = jasmine.createSpy('onError')
      fakeAjax({ urls: {
        'http://carbon.brighterplanet.com/automobile_trips?distance=10': {
          errorMessage: 'argh'}}})
      segment.emissions($('#quiet'))
      expect(DrivingSegment.onError).toHaveBeenCalled()
    })
  })
})
