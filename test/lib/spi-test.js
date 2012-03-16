var helper = require('../helper'),
    vows = helper.vows,
    assert = helper.assert,
    sinon = helper.sinon,
    SPI = require('../../app/assets/javascripts/lib/spi');

vows.describe('SPI').addBatch({
  '#parseSpiPath': {
    'returns null if there is no SPI path': function() {
      var spi = new SPI('http://hootroot.com');
      assert.isNull(spi.parseSpiPath());
    },
    'does not mistakenly translate URLs with names': function() {
      var spi = new SPI('http://hootroot.com/#foo');
      assert.isNull(spi.parseSpiPath());
    },
    'returns the SPI path': function() {
      var spi = new SPI('http://hootroot.com/#!/foo/bar%20baz');
      assert.equal(spi.parseSpiPath(),'/foo/bar baz');
    }
  },

  '#getSpiPathParameter': {
    'returns null if there is no SPI': function() {
      var spi = new SPI('http://hootroot.com');
      assert.isNull(spi.getSpiPathParameter('a'));
    },
    'returns null if there is no "to" parameter': function() {
      var spi = new SPI('http://hootroot.com/#!/a/b');
      assert.isNull(spi.getSpiPathParameter('b'));
    },
    'returns the named parameter': function() {
      var spi = new SPI('http://hootroot.com/#!/a/b/c/d');
      assert.equal(spi.getSpiPathParameter('c'),'d');
    }
  },

  '#origin': {
    'is set to the "from" parameter': function() {
      var spi = new SPI('http://hootroot.com/#!/from/600%20Jenison%20Ave%2C%20Lansing%2C%20MI%2048915/to/860%20Abbott%20Rd%2C%20Ste%204%2C%20East%20Lansing%2C%20MI');
      assert.equal(spi.origin,'600 Jenison Ave, Lansing, MI 48915');
    }
  },

  '#destination': {
    'is set to the "to" parameter': function() {
      var spi = new SPI('http://hootroot.com/#!/from/600%20Jenison%20Ave%2C%20Lansing%2C%20MI%2048915/to/860%20Abbott%20Rd%2C%20Ste%204%2C%20East%20Lansing%2C%20MI');
      assert.equal(spi.destination,'860 Abbott Rd, Ste 4, East Lansing, MI');
    }
  },

  '.generate': {
    'encodes addresses with spaces': function() {
      sinon.stub(SPI, 'current').returns(new SPI('http://hootroot.com/'));
      var spi = SPI.generate('123 Main St, Anytown, US', '321 Maple St');
      assert.equal(spi.urlString,
        'http://hootroot.com/#!/from/123%20Main%20St%2C%20Anytown%2C%20US/to/321%20Maple%20St');
    }
  }
}).export(module);
