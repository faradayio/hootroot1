(function( jQuery ) {
  // Create the request object
  // (This is still attached to ajaxSettings for backward compatibility)
  jQuery.ajaxSettings.xdr = function() {
    return (window.XDomainRequest ? new window.XDomainRequest() : null);
  };

  // Determine support properties
  (function( xdr ) {
    jQuery.extend( jQuery.support, { iecors: !!xdr, });
  })( jQuery.ajaxSettings.xdr() );

  // Create transport if the browser can provide an xdr
  if ( jQuery.support.iecors ) {

    jQuery.ajaxTransport(function( s ) {
      var callback;

      return {
        send: function( headers, complete ) {
          var xdr = s.xdr();

          xdr.onload = function() {
            var headers = { 'Content-Type': xdr.contentType };
            complete(200, 'OK', { text: xdr.responseText }, headers);
          };
          
          // Apply custom fields if provided
					if ( s.xhrFields ) {
            xhr.onerror = s.xhrFields.error;
            xhr.ontimeout = s.xhrFields.timeout;
					}

          xdr.open( s.type, s.url );

          // XDR has no method for setting headers O_o

          xdr.send( ( s.hasContent && s.data ) || null );
        },

        abort: function() {
          xdr.abort();
        }
      };
    });
  }
})( jQuery );
String.prototype.pluralize = function() {
  return this + 's';
}
EmissionEstimate = function() {};

EmissionEstimate.prototype.value = function() {
  if(this.data) {
    return this.data.emission;
  } else {
    return 'No data';
  }
};

EmissionEstimate.prototype.methodology = function() {
  if(this.data) {
    return this.data.methodology;
  } else {
    return 'No data';
  }
};

EmissionEstimate.prototype.toString = function() {
  return this.value().toString();
};
EmissionEstimator = function(emitter, carbon) {
  this.emitter = emitter;
  this.carbon = carbon;
};

EmissionEstimator.prototype.url = function() {
  return 'http://carbon.brighterplanet.com/' + this.carbon.emitter_name.pluralize() + '.json';
};

EmissionEstimator.prototype.params = function() {
  var params = {};
  for(var attribute in this.carbon.attribute_map) {
    var cm1_field = this.carbon.attribute_map[attribute];
    var value = this.emitter[attribute];
    var result;
    if(value) 
      result = value;
    if(typeof result == 'function')
      result = result.apply(this.emitter);
    if(result)
      params[cm1_field] = result;
  }

  if(Carbon.key) {
    params['key'] = Carbon.key;
  }

  return params;
};

EmissionEstimator.prototype.getEmissionEstimate = function(onSuccess, onError) {
  $.ajax({
    url: this.url(),
    data: this.params(),
    dataType: 'json',
    success: this.onEstimateSuccess(onSuccess),
    error: onError
  });
};

// Events

EmissionEstimator.prototype.onEstimateSuccess = function(onSuccess) {
  return $.proxy(function(result) {
    this.emitter.emissionEstimate.data = result;
    onSuccess(this.emitter.emissionEstimate);
  }, this);
};
Carbon = function() {
  this.attribute_map = {};
};

Carbon.emitter = function(klass, definition) {
  klass.carbon = new Carbon();
  klass.carbon.define(definition);
  klass.prototype.emissionEstimate = new EmissionEstimate();
  klass.prototype.emissionEstimator = function() {
    if(!this._emissionEstimator) {
      this._emissionEstimator = new EmissionEstimator(this, klass.carbon);
    }

    return this._emissionEstimator;
  };
  klass.prototype.getEmissionEstimate = function(onSuccess, onError) {
    return this.emissionEstimator().getEmissionEstimate(onSuccess, onError);
  };
};

Carbon.prototype.define = function(lambda) {
  lambda(this);
};

Carbon.prototype.emitAs = function(emitter_name) {
  this.emitter_name = emitter_name;
};

Carbon.prototype.provide = function(attribute, options) {
  var actual_field;
  if(options && options.as) {
    actual_field = options.as;
  } else {
    actual_field = attribute;
  }

  this.attribute_map[attribute] = actual_field;
};
