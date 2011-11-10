var $ = require('../lib/jquery-custom');

var NumberFormatter = require('cm1-route').NumberFormatter;

var RouteView = module.exports = function(controller, mode) {
  this.controller = controller;
  this.mode = mode.toLowerCase();
  this.element = $('#' + this.mode);
  this.isEnabled = false;
};

RouteView.prototype.directions = function() {
  return this.controller.directions[this.mode];
};

RouteView.prototype.clearDirections = function() {
  $('#routing .' + this.mode).html('');
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

  $('#routing .' + this.mode).html(html);
};

RouteView.prototype.toggleDirections = function() {
  $('#wrapper').toggleClass('with_directions');
  $('#routing').toggle();
};

RouteView.prototype.updateSegmentEmissions = function(impacts) {
  var output;
  var value = NumberFormatter.kilogramsToPounds(impacts.carbon, 4);
  if(impacts.methodology) {
    output = '<a href="' + impacts.methodology + '">' + value + ' lbs CO₂</a>';
  } else {
    output = value.toString() + ' lbs CO₂';
  }

  $('#' + this.mode + '_segment_' + impacts.subject.index + ' span.emissions').html(output);
};

RouteView.prototype.updateTotalEmissions = function() {
  var value = NumberFormatter.kilogramsToPounds(this.directions().totalEmissions);
  $('#' + this.mode + ' .footprint').html(value).addClass('complete');
};

RouteView.prototype.select = function() {
  $('#modes .selected').removeClass('selected');
  this.element.addClass('selected');

  if (this.mode == 'publictransit' && $('#hopstop').is(':hidden')) {
    $('#hopstop').show('slide', { direction: 'down' }, 500);
  } else if (this.mode != 'publictransit' && $('#hopstop').is(':visible') ) {
    $('#hopstop').hide('slide', { direction: 'down' }, 500);
  }
};

RouteView.prototype.enable = function() {
  this.start();
  this.element.removeClass('disabled');

  if(!this.isEnabled) {
    this.element.click(this.controller.events.onModeClick(this.controller));
    this.element.hover(this.controller.events.onModeHoverIn(this.controller),
                       this.controller.events.onModeHoverOut(this.controller));
  }
  this.isEnabled = true;

  return this;
};

RouteView.prototype.disable = function() {
  this.finish();
  this.element.addClass('disabled');

  if(this.isEnabled) {
    this.element.unbind('click');
    this.element.unbind('mouseenter mouseleave');
  }
  this.isEnabled = false;

  this.clearDirections();

  return this;
};

RouteView.prototype.fail = function() {
  $('#' + this.mode + ' .footprint').html('N/A');
  this.disable();
  this.finish();
};

RouteView.prototype.start = function() {
  this.clearDirections();
  this.element.addClass('loading');
  this.element.find('.footprint').html('...');
  this.element.find('.total_time').html('');
  return this;
};

RouteView.prototype.finish = function() {
  this.element.removeClass('loading');
};
