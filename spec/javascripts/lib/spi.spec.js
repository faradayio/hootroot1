var SPI = require('spi');

describe('SPI', function() {
  describe('#parseSpiPath', function() {
    it('returns null if there is no SPI path', function() {
      var spi = new SPI('http://hootroot.com');
      expect(spi.parseSpiPath()).toBeNull();
    });
    it('does not mistakenly translate URLs with names', function() {
      var spi = new SPI('http://hootroot.com/#foo');
      expect(spi.parseSpiPath()).toBeNull();
    });
    it('returns the SPI path', function() {
      var spi = new SPI('http://hootroot.com/#!/foo/bar%20baz');
      expect(spi.parseSpiPath()).toBe('/foo/bar baz');
    });
  });

  describe('#getSpiPathParameter', function() {
    it('returns null if there is no SPI', function() {
      var spi = new SPI('http://hootroot.com');
      expect(spi.getSpiPathParameter('a')).toBeNull();
    });
    it('returns null if there is no "to" parameter', function() {
      var spi = new SPI('http://hootroot.com/#!/a/b');
      expect(spi.getSpiPathParameter('b')).toBeNull();
    });
    it('returns the named parameter', function() {
      var spi = new SPI('http://hootroot.com/#!/a/b/c/d');
      expect(spi.getSpiPathParameter('c')).toBe('d');
    });
  });

  describe('#origin', function() {
    it('is set to the "from" parameter', function() {
      var spi = new SPI('http://hootroot.com/#!/from/600%20Jenison%20Ave%2C%20Lansing%2C%20MI%2048915/to/860%20Abbott%20Rd%2C%20Ste%204%2C%20East%20Lansing%2C%20MI');
      expect(spi.origin).toBe('600 Jenison Ave, Lansing, MI 48915');
    });
  });

  describe('#destination', function() {
    it('is set to the "to" parameter', function() {
      var spi = new SPI('http://hootroot.com/#!/from/600%20Jenison%20Ave%2C%20Lansing%2C%20MI%2048915/to/860%20Abbott%20Rd%2C%20Ste%204%2C%20East%20Lansing%2C%20MI');
      expect(spi.destination).toBe('860 Abbott Rd, Ste 4, East Lansing, MI');
    });
  });

  describe('.generate', function() {
    it('encodes addresses with spaces', function() {
      spyOn(SPI, 'current').andReturn(new SPI('http://hootroot.com/'));
      var spi = SPI.generate('123 Main St, Anytown, US', '321 Maple St');
      expect(spi.urlString).
        toBe('http://hootroot.com/#!/from/123%20Main%20St%2C%20Anytown%2C%20US/to/321%20Maple%20St');
    });
  });
});
