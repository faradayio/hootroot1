function RouteView(controller, mode) {
  this.controller = controller;
  this.mode = mode.toLowerCase();
  this.element = $('#' + this.mode);
  this.isEnabled = false;
}

RouteView.prototype.directions = function() {
  if(!this._directions) {
    this._directions = this.controller.directions[this.mode];
  }
  return this._directions;
};

RouteView.prototype.updateDirections = function() {
  var html = '<ul>';
  var mode = this.mode;
  this.directions().eachSegment(function(segment) {
    var detail = '<p class="instructions">' + segment.instructions + '</p><p class="emissions">Emissions: <span class="emissions"><em>Loading...</em></span></p>';
    html += '<li id="' + mode + '_segment_' + segment.index + '" class="' + mode + '">' + detail + '</li>';
  });
  html += '</ul>';

  $('#routing .' + this.mode).html(html);
};

RouteView.prototype.toggleDirections = function() {
  $('#wrapper').toggleClass('with_directions');
  $('#routing').toggle();
}

RouteView.prototype.updateSegmentEmissions = function(segment, emissionEstimate) {
  var output;
  var value = NumberFormatter.kilogramsToPounds(emissionEstimate.value());
  if(emissionEstimate.methodology) {
    output = '<a href="' + emissionEstimate.methodology() + '">' + value + ' lbs CO₂</a>';
  } else {
    output = value.toString() + ' lbs CO₂';
  }

  $('#' + this.mode + '_segment_' + segment.index + ' span.emissions').html(output);
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
}

RouteView.prototype.enable = function() {
  this.start();
  this.element.removeClass('disabled');
  this.element.find('.footprint').html('...');
  this.element.find('.total_time').html('');

  if(!this.isEnabled) {
    this.element.click(this.controller.onModeClick(this.controller));
    this.element.hover(this.controller.onModeHoverIn(this.controller),
                       this.controller.onModeHoverOut(this.controller));
  }
  this.isEnabled = true;

  return this;
}

RouteView.prototype.disable = function() {
  this.finish();
  this.element.addClass('disabled');

  if(this.isEnabled) {
    this.element.unbind('click');
    this.element.unbind('mouseenter mouseleave');
  }
  this.isEnabled = false;

  return this;
};

RouteView.prototype.start = function() {
  this.element.addClass('loading');
  return this;
}

RouteView.prototype.finish = function() {
  this.element.removeClass('loading');
}
