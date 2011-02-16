describe('DrivingSegment', function() {
  var segment;

  beforeEach(function() {
    var step = {
      distance: { value: '10000' },
      travel_mode: 'DRIVING',
      instructions: 'Go West, young man!'
    }
    segment = new DrivingSegment(0, step)
  })

  describe('#emissions', function() {
    it('runs on onSuccess handler on a successful fetch', function() {
      var onSuccess = jasmine.createSpy('onSuccess')
      fakeAjax({ urls: {
        'http://carbon.brighterplanet.com/automobile_trips.json?distance=10': {
          successData: {"emission": 10.4}}}})
      segment.emissions(onSuccess, null)
      expect(onSuccess).toHaveBeenCalledWith(10.4)
    })
    it('runs an onFailure handler on a failed fetch', function() {
      var onError = jasmine.createSpy('onError')
      fakeAjax({ urls: {
        'http://carbon.brighterplanet.com/automobile_trips.json?distance=10': {
          errorMessage: 'argh'}}})
      segment.emissions(null, onError)
      expect(onError).toHaveBeenCalled()
    })
  })
})
