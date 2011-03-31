describe('CommuterRailingSegment', function() {
  it('converts distance to kilometers', function() {
    var ws = new CommuterRailingSegment(0, { distance: { value: 3401 } });
    expect(ws.distance).toBeClose(3.401, 0.0001)
  });
  it('provides duration in seconds', function() {
    var ws = new CommuterRailingSegment(0, { duration: { value: 120 } });
    expect(ws.duration).toBe(120);
  });

  it('provides duration in hours', function() {
    var ws = new CommuterRailingSegment(0, { duration: { value: 7201 } });
    expect(ws.durationInHours()).toBeClose(2.00, 0.01);
  });
});
