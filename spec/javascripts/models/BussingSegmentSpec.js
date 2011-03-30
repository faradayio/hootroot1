describe('BussingSegment', function() {
  it('converts distance to kilometers', function() {
    var bs = new BussingSegment(0, { distance: { value: 3401 } });
    expect(bs.distance).toBeClose(3.401, 0.0001)
  });
  it('provides duration', function() {
    var bs = new BussingSegment(0, { duration: { value: 120 } });
    expect(bs.duration).toBe(120);
  });
});
