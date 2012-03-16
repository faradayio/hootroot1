var $ = require('qwery'),
    events = require('bean'),
    dom = require('bonzo'),
    $$ = function(selector, parent) { return dom($(selector, parent)); };

var NumberFormatter = require('cm1-route').NumberFormatter;

var RouteView = function(controller, mode) {
  this.controller = controller;
  this.mode = mode.toLowerCase();
  this.elementId = '#' + this.mode;
  this.element = $(this.elementId)[0];
  this.isEnabled = false;
};

RouteView.prototype.directions = function() {
  return this.controller.directions[this.mode];
};

RouteView.prototype.clearDirections = function() {
  $$('#routing .' + this.mode).html('');
};

RouteView.prototype.updateDirections = function() {
  var html = '<ul>';
  var mode = this.mode;
  this.directions().eachSegment(function(segment) {
    if(segment.instructions == undefined) return;
    var length = ' (' + (segment.distance ? 
                          (Math.round(segment.distance * 100) / 100) + 'km' :
                          Math.ceil(segment.duration / 60.0) + 'min') + ')';
    var detail = '<p class="instructions">' + segment.instructions + length + '</p><p class="emissions">Emissions: <span class="emissions"><em>Loading...</em></span></p>';
    html += '<li id="' + mode + '_segment_' + segment.index + '" class="' + mode + '">' + detail + '</li>';
  });
  html += '</ul>';

  $$('#routing .' + this.mode).html(html);
};

RouteView.prototype.toggleDirections = function() {
  $$('#wrapper').toggleClass('with_directions');
  $$('#routing').toggle();
};

RouteView.prototype.updateSegmentEmissions = function(impacts) {
  var output;
  var value = NumberFormatter.kilogramsToPounds(impacts.carbon, 4);
  if(impacts.methodology) {
    output = '<a href="' + impacts.methodology + '">' + value + ' lbs CO₂</a>';
  } else {
    output = value.toString() + ' lbs CO₂';
  }

  $$('#' + this.mode + '_segment_' + impacts.subject.index + ' span.emissions').html(output);
};

RouteView.prototype.updateTotalEmissions = function() {
  var value = NumberFormatter.kilogramsToPounds(this.directions().totalEmissions);
  $$('#' + this.mode + ' .footprint').html(value).addClass('complete');
};

RouteView.prototype.select = function() {
  $$('#modes .selected').removeClass('selected');
  dom(this.element).addClass('selected');

  if (this.mode == 'publictransit' && $.is($('#hopstop')[0], ':hidden')) {
    $$('#hopstop').show(); //'slide', { direction: 'down' }, 500);
  } else if (this.mode != 'publictransit' && $.is($('#hopstop')[0], ':visible') ) {
    $$('#hopstop').hide(); //'slide', { direction: 'down' }, 500);
  }
};

RouteView.prototype.enable = function() {
  this.start();
  dom(this.element).removeClass('disabled');

  if(!this.isEnabled) {
    events.add(this.element, {
      click: this.controller.events.onModeClick(this.controller),
      mouseenter: this.controller.events.onModeHoverIn(this.controller),
      mouseleave: this.controller.events.onModeHoverOut(this.controller)
    });
  }
  this.isEnabled = true;

  return this;
};

RouteView.prototype.disable = function() {
  this.finish();
  dom(this.element).addClass('disabled');

  if(this.isEnabled) {
    events.remove(this.element, 'click');
    events.remove(this.element, 'mouseenter mouseleave');
  }
  this.isEnabled = false;

  this.clearDirections();

  return this;
};

RouteView.prototype.fail = function() {
  $$('#' + this.mode + ' .footprint').html('N/A');
  this.disable();
  this.finish();
};

RouteView.prototype.start = function() {
  this.clearDirections();
  dom(this.element).addClass('loading');
  $$('.footprint', this.element).html('...');
  $$('.total_time', this.element).html('');
  return this;
};

RouteView.prototype.finish = function() {
  dom(this.element).removeClass('loading');
};

module.exports = RouteView;
