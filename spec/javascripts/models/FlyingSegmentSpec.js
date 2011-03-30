describe('FlyingSegment', function() {
  it('converts distance to kilometers', function() {
    var ws = new FlyingSegment(0, { distance: { value: 3401 } });
    expect(ws.distance).toBeClose(3.401, 0.0001)
  });
});
