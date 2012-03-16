var $ = require('qwery'),
    events = require('bean'),
    dom = require('bonzo'),
    ajax = require('reqwest'),
    $$ = function(selector, parent) { return dom($(selector, parent)); };

var HootBarController = function(indexController) {
  this.indexController = indexController;
}

HootBarController.prototype.init = function() {
  events.add($('#aboutlink')[0], 'click', HootBarController.events.onAboutClick);
  events.add($('#about')[0], 'click', HootBarController.events.onAboutClick);
  events.add($('#directions')[0], 'click', HootBarController.events.onDirectionsClick(this));
  events.add($('#link')[0], 'click', HootBarController.events.onLinkClick(this));
  events.add($('#linkclose')[0], 'click', HootBarController.events.onLinkClick(this));
  events.add($('#tweet')[0], 'click', HootBarController.events.onTweetClick(this));
  events.add($('#restart')[0], 'click', HootBarController.events.onRestartClick(this));
}

HootBarController.prototype.getTweet = function() {
  document.body.style.cursor = 'wait';
  ajax('http://is.gd/create.php', {
    data: { url: this.indexController.currentUrl(), format: 'json' },
    type: 'json',
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

HootBarController.events = {
  onAboutClick: function() {
    var about = $('#about');
    dom(about).show();
    morpheus(about[0], {
      top: 400
    }); //'slide', { direction: 'up' }, 500);
    return false;
  },

  onDirectionsClick: function(controller) {
    return function() {
      controller.indexController.currentRoute().toggleDirections();
      return false;
    };
  },

  onLinkClick: function(controller) {
    return function() {
      $$('#permalink').val(controller.indexController.currentUrl());
      $$('#linkform').toggle(); //'drop', { direction: 'up' }, 500);
      return false;
    };
  },

  onTweetClick: function(controller) {
    return function() {
      controller.getTweet();
      return false;
    };
  },

  onRestartClick: function(controller) {
    return function() {   
      controller.indexController.fadeInSearch();
      controller.indexController.fadeOutNav();
      controller.indexController.fadeOutModes
    return false;
  }
};

module.exports = HootBarController;
