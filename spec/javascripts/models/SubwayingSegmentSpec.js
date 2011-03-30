describe('SubwayingSegment', function() {
  it('converts distance to kilometers', function() {
    var ws = new SubwayingSegment(0, { distance: { value: 3401 } });
    expect(ws.distance).toBeClose(3.401, 0.0001)
  });
  it('stores duration', function() {
    var ws = new SubwayingSegment(0, { distance: { value: 3401 }, duration: { value: 120 } });
    expect(ws.duration).toBe(120);
  });
});
