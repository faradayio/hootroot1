describe('SubwayingSegment', function() {
  it('converts distance to kilometers', function() {
    var ws = new SubwayingSegment(0, { distance: { value: 3401 } });
    expect(ws.distance).toBeClose(3.401, 0.0001)
  });
  it('uses duration if no distance given', function() {
    var ws = new SubwayingSegment(0, { duration: 120 });
    expect(ws.duration).toBeClose(0.03, 0.01);
  });
});
