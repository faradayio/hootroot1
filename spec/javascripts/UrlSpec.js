describe('Url', function() {
  describe('get', function() {
    it('decodes the URL', function() {
      Url.actual = function() { return 'http://hootroot.com/#!/a%20b%20c/d%20e%2C%20f'; };
      expect(Url.spi()).toBe('/a b c/d e, f');
    });
  });

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
      Url.get = function() { return 'http://hootroot.com/#!/foo/bar baz' };
      expect(Url.spi()).toBe('/foo/bar baz');
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

  describe('generate', function() {
    it('encodes addresses with spaces', function() {
      document.URL = 'http://hootroot.com/#!/foo/bar';
      expect(Url.generate('123 Main St, Anytown, US', '321 Maple St')).
        toBe('http://hootroot.com/#!/from/123%20Main%20St%2C%20Anytown%2C%20US/to/321%20Maple%20St');
    });
  });
});
