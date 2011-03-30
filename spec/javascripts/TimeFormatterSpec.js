describe('TimeFormatter', function() {
  describe('.format', function() {
    it('returns empty string for 0 seconds', function() {
      expect(TimeFormatter.format(0)).toBe('');
    });
    it('converts 1 second', function() {
      expect(TimeFormatter.format(1)).toBe('1min');
    });
    it('converts 59 seconds', function() {
      expect(TimeFormatter.format(59)).toBe('1min');
    });
    it('converts 60 seconds', function() {
      expect(TimeFormatter.format(60)).toBe('1min');
    });
    it('converts 90 seconds', function() {
      expect(TimeFormatter.format(90)).toBe('2mins');
    });
    it('converts 7200 seconds', function() {
      expect(TimeFormatter.format(7200)).toBe('2hrs');
    });
    it('converts 7201 seconds', function() {
      expect(TimeFormatter.format(7201)).toBe('2hrs, 1min');
    });
  });

  describe('.getParts', function() {
    it('gets parts for 0 seconds', function() {
      expect(TimeFormatter.getParts(0)).toEqual({ minutes: 0 });
    });
    it('gets parts for 1 second', function() {
      expect(TimeFormatter.getParts(1)).toEqual({ minutes: 1 });
    });
    it('gets parts for 59 seconds', function() {
      expect(TimeFormatter.getParts(59)).toEqual({ minutes: 1 });
    });
    it('gets parts for 60 seconds', function() {
      expect(TimeFormatter.getParts(60)).toEqual({ minutes: 1 });
    });
    it('gets parts for 90 seconds', function() {
      expect(TimeFormatter.getParts(90)).toEqual({ minutes: 2 });
    });
    it('gets parts for 7200 seconds', function() {
      expect(TimeFormatter.getParts(7200)).toEqual({ hours: 2 });
    });
    it('gets parts for 7201 seconds', function() {
      expect(TimeFormatter.getParts(7201)).toEqual({ hours: 2, minutes: 1 });
    });
  });
});
