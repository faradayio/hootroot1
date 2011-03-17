describe('BussingSegment', function() {
  it('converts distance to kilometers', function() {
    var bs = new BussingSegment(0, { distance: { value: 3401 } });
    expect(bs.distance).toBeClose(3.401, 0.0001)
  });
  it('uses duration if no distance given', function() {
    var bs = new BussingSegment(0, { duration: 120 });
    expect(bs.duration).toBeClose(0.03, 0.01);
  });
});
