var $ = require('jquery-browserify');

var HootBarController = module.exports = function(indexController) {
  this.indexController = indexController;
}

HootBarController.prototype.init = function() {
  $('#aboutlink').click(this.onAboutClick);
  $('#about').click(this.onAboutClick);
  $('#directions').click($.proxy(this.onDirectionsClick, this));
  $('#link').click($.proxy(this.onLinkClick, this));
  $('#linkclose').click($.proxy(this.onLinkClick, this));
  $('#tweet').click($.proxy(this.onTweetClick, this));
  $('#restart').click(this.onRestartClick);
}

HootBarController.prototype.getTweet = function() {
  document.body.style.cursor = 'wait';
  $.ajax('http://is.gd/create.php', {
    data: { url: this.indexController.currentUrl(), format: 'json' },
    dataType: 'json',
    success: function(data) {
      document.body.style.cursor = 'default';
      if(data.shorturl) {
        var status = "My trip's carbon footprint: " + data.shorturl + " (via Hootroot)";
        document.location.href = 'http://twitter.com/?status=' + status;
      } else {
        alert('Failed to shorten URL: ' + data.errormessage);
      }
    },
    error :function(data) {
      document.body.style.cursor = 'default';
    }
  });
};

HootBarController.prototype.onAboutClick = function() {
  $('#about').toggle('slide', { direction: 'up' }, 500);
  return false;
};

HootBarController.prototype.onDirectionsClick = function() {
  this.indexController.currentRoute().toggleDirections();
  return false;
};

HootBarController.prototype.onLinkClick = function() {
  $('#permalink').val(this.indexController.currentUrl());
  $('#linkform').toggle('drop', { direction: 'up' }, 500);
  return false;
};

HootBarController.prototype.onTweetClick = function() {
  this.getTweet();
  return false;
};

HootBarController.prototype.onRestartClick = function() {
  $('#search').show('drop', { direction: 'up' }, 500);
  $('h1').show('drop', { direction: 'up' }, 500);
  $('#nav').hide('slide', { direction: 'up' }, 500);
  $('#meta').show();
  $('#modes').hide('slide', { direction: 'down' }, 500);
  return false;
};

