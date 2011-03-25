describe('Url', function() {
  describe('spi', function() {
    it('returns null if there is no SPI path', function() {
      Url.get = function() { return 'http://hootroot.com' };
      expect(Url.spi()).toBeNull();
    });
    it('does not mistakenly translate URLs with names', function() {
      Url.get = function() { return 'http://hootroot.com/#foo' };
      expect(Url.spi()).toBeNull();
    });
    it('returns the SPI path', function() {
      Url.get = function() { return 'http://hootroot.com/#!/foo/bar' };
      expect(Url.spi()).toBe('/foo/bar');
    });
  });

  describe('.getSpiPathParameter', function() {
    it('returns null if there is no SPI', function() {
      Url.get = function() { return 'http://hootroot.com' };
      expect(Url.getSpiPathParameter('a')).toBeNull();
    });
    it('returns null if there is no "to" parameter', function() {
      Url.get = function() { return 'http://hootroot.com/#!/a/b' };
      expect(Url.getSpiPathParameter('b')).toBeNull();
    });
    it('returns the named parameter', function() {
      Url.get = function() { return 'http://hootroot.com/#!/a/b/c/d' };
      expect(Url.getSpiPathParameter('c')).toBe('d');
    });
  });

  describe('origin', function() {
    it('returns the "from" parameter', function() {
      Url.get = function() { return 'http://hootroot.com/#!/from/600 Jenison Ave, Lansing, MI 48915/to/860 Abbott Rd, Ste 4, East Lansing, MI' };
      expect(Url.origin()).toBe('600 Jenison Ave, Lansing, MI 48915');
    });
  });

  describe('destination', function() {
    it('returns the "to" parameter', function() {
      Url.get = function() { return 'http://hootroot.com/#!/from/600 Jenison Ave, Lansing, MI 48915/to/860 Abbott Rd, Ste 4, East Lansing, MI' };
      expect(Url.destination()).toBe('860 Abbott Rd, Ste 4, East Lansing, MI');
    });
  });

  describe('baseUrl', function() {
    it('returns a plain URL', function() {
      Url.get = function() { return 'http://hootroot.com' };
      expect(Url.baseUrl()).toBe('http://hootroot.com/');
    });
    it('ignores lonely hashes', function() {
      Url.get = function() { return 'http://hootroot.com/#' };
      expect(Url.baseUrl()).toBe('http://hootroot.com/');
    });
    it('returns a base URL from a SPI URL', function() {
      Url.get = function() { return 'http://hootroot.com/#!/foo/bar' };
      expect(Url.baseUrl()).toBe('http://hootroot.com/');
    });
  });
});