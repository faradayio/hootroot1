describe('Url', function() {
  describe('spi', function() {
    it('returns null if there is no SPI path', function() {
      document.url = 'http://hootroot.com';
      expect(Url.spi()).toBeNull();
    });
    it('does not mistakenly translate URLs with names', function() {
      document.url = 'http://hootroot.com/#foo';
      expect(Url.spi()).toBeNull();
    });
    it('returns the SPI path', function() {
      document.url = 'http://hootroot.com/#!/foo/bar';
      expect(Url.spi()).toBe('/foo/bar');
    });
  });

  describe('.getSpiPathParameter', function() {
    it('returns null if there is no SPI', function() {
      document.url = 'http://hootroot.com';
      expect(Url.getSpiPathParameter('a')).toBeNull();
    });
    it('returns null if there is no "to" parameter', function() {
      document.url = 'http://hootroot.com/#!/a/b';
      expect(Url.getSpiPathParameter('b')).toBeNull();
    });
    it('returns the named parameter', function() {
      document.url = 'http://hootroot.com/#!/a/b/c/d'
      expect(Url.getSpiPathParameter('c')).toBe('d');
    });
  });

  describe('origin', function() {
    it('returns the "from" parameter', function() {
      document.url = 'http://hootroot.com/#!/from/600 Jenison Ave, Lansing, MI 48915/to/860 Abbott Rd, Ste 4, East Lansing, MI';
      expect(Url.origin()).toBe('600 Jenison Ave, Lansing, MI 48915');
    });
  });

  describe('destination', function() {
    it('returns the "to" parameter', function() {
      document.url = 'http://hootroot.com/#!/from/600 Jenison Ave, Lansing, MI 48915/to/860 Abbott Rd, Ste 4, East Lansing, MI';
      expect(Url.destination()).toBe('860 Abbott Rd, Ste 4, East Lansing, MI');
    });
  });
});
