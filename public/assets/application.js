var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

if (!process.env) process.env = {};
if (!process.argv) process.argv = [];

require.define("path", function (require, module, exports, __dirname, __filename) {
function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/node_modules/http-browserify/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"index.js","browserify":"index.js"}
});

require.define("/node_modules/http-browserify/index.js", function (require, module, exports, __dirname, __filename) {
var http = module.exports;
var EventEmitter = require('events').EventEmitter;
var Request = require('./lib/request');

http.request = function (params, cb) {
    var host = window.location.host.split(':')[0];
    if (!params) params = {};
    if (!params.host) params.host = host;
    if (!params.port) params.port = window.location.port;
    
    var xhrClass = xhrHttp(host, params);
    var req = new Request(new xhrClass(), params);
    if (cb) req.on('response', cb);
    return req;
};

http.get = function (params, cb) {
    params.method = 'GET';
    var req = http.request(params, cb);
    req.end();
    return req;
};

http.Agent = function () {};
http.Agent.defaultMaxSockets = 4;

var xhrHttp = function (host, params) {
    if (typeof window === 'undefined') {
        throw new Error('no window object present');
    }
    else if (params.host != host && window.XDomainRequest) {
        return window.XDomainRequest;
    }
    else if (window.XMLHttpRequest) {
        return window.XMLHttpRequest;
    }
    else if (window.ActiveXObject) {
        var axs = [
            'Msxml2.XMLHTTP.6.0',
            'Msxml2.XMLHTTP.3.0',
            'Microsoft.XMLHTTP'
        ];
        for (var i = 0; i < axs.length; i++) {
            try {
                var ax = new(window.ActiveXObject)(axs[i]);
                return function () {
                    if (ax) {
                        var ax_ = ax;
                        ax = null;
                        return ax_;
                    }
                    else {
                        return new(window.ActiveXObject)(axs[i]);
                    }
                };
            }
            catch (e) {}
        }
        throw new Error('ajax not supported in this browser')
    }
    else {
        throw new Error('ajax not supported in this browser');
    }
};

});

require.define("events", function (require, module, exports, __dirname, __filename) {
if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});

require.define("/node_modules/http-browserify/lib/request.js", function (require, module, exports, __dirname, __filename) {
var EventEmitter = require('events').EventEmitter;
var Response = require('./response');

var Request = module.exports = function (xhr, params) {
    var self = this;
    self.xhr = xhr;
    self.body = '';
    
    var uri = params.host + ':' + params.port + (params.path || '/');
    
    xhr.open(
        params.method || 'GET',
        (params.scheme || 'http') + '://' + uri,
        true
    );
    
    if (params.headers && xhr.setRequestHeader) {
        for(key in params.headers) {
            if (Request.isSafeRequestHeader(key)) {
                var value = params.headers[key];
                if (value instanceof Array) {
                    for(var i = 0, j = value.length; i < j; i++) {
                        xhr.setRequestHeader(key, value[i]);
                    }
                }
                else xhr.setRequestHeader(key, value)
            }
        }
    }
    
    var res = new Response;
    res.on('ready', function () {
        self.emit('response', res);
    });
    

    if(window.XDomainRequest && xhr instanceof window.XDomainRequest) {  // IE XDR
        xhr.onprogress = function() {
            xhr.readyState = 2;
            res.getAllResponseHeaders = function() {
              return 'Content-Type: ' + xhr.contentType;  // This is the only header available
            };
            res.handle(xhr);
        }
        xhr.onload = function() {  // IE XDR
            xhr.readyState = 4;
            res.handle(xhr);
        };
        xhr.onerror = function() {  // IE XDR
            xhr.readyState = 4;
            xhr.error = 'Unknown error';
            res.handle(xhr);
        };
    }
    xhr.onreadystatechange = function () {
        res.handle(xhr);
    };
};

Request.prototype = new EventEmitter;

Request.prototype.setHeader = function (key, value) {
    if (!xhr.setRequestHeader) // IE XDR
        return;

    if (value instanceof Array) {
        for (var i = 0; i < value.length; i++) {
            this.xhr.setRequestHeader(key, value[i]);
        }
    }
    else {
        this.xhr.setRequestHeader(key, value);
    }
};

Request.prototype.write = function (s) {
    this.body += s;
};

Request.prototype.end = function (s) {
    if (s !== undefined) this.write(s);
    this.xhr.send(this.body);
};

// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html
Request.unsafeHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "content-transfer-encoding",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via"
];

Request.indexOfHeader = function(headerName) {
    for (var i = 0, j = Request.unsafeHeaders.length; i < j; i++) {
        if (Request.unsafeHeaders[i] === headerName) {
            return i;
        }
    }
    return -1;
};

Request.isSafeRequestHeader = function (headerName) {
    if (!headerName) return false;
    return (Request.indexOfHeader(headerName.toLowerCase()) === -1)
};

});

require.define("/node_modules/http-browserify/lib/response.js", function (require, module, exports, __dirname, __filename) {
var EventEmitter = require('events').EventEmitter;

var Response = module.exports = function (res) {
    this.offset = 0;
};

Response.prototype = new EventEmitter;

var capable = {
    streaming : true,
    status2 : true
};

function parseHeaders (res) {
    if(!res.getAllResponseHeaders)
      return;
    var lines = res.getAllResponseHeaders().split(/\r?\n/);
    var headers = {};
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') continue;
        
        var m = line.match(/^([^:]+):\s*(.*)/);
        if (m) {
            var key = m[1].toLowerCase(), value = m[2];
            
            if (headers[key] !== undefined) {
                if (headers[key] instanceof Array) {
                    headers[key].push(value);
                }
                else {
                    headers[key] = [ headers[key], value ];
                }
            }
            else {
                headers[key] = value;
            }
        }
        else {
            headers[line] = true;
        }
    }
    return headers;
}

Response.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()];
};

Response.prototype.handle = function (res) {
    if (res.readyState === 2 && capable.status2) {
        try {
            this.statusCode = res.status;
            this.headers = parseHeaders(res);
        }
        catch (err) {
            capable.status2 = false;
        }
        
        if (capable.status2) {
            this.emit('ready');
        }
    }
    else if (capable.streaming && res.readyState === 3) {
        try {
            if (!this.statusCode) {
                this.statusCode = res.status;
                this.headers = parseHeaders(res);
                this.emit('ready');
            }
        }
        catch (err) {}
        
        try {
            this.write(res);
        }
        catch (err) {
            capable.streaming = false;
        }
    }
    else if (res.readyState === 4) {
        if (!this.statusCode) {
            this.statusCode = res.status;
            this.emit('ready');
        }
        this.write(res);
        
        if (res.error) {
            this.emit('error', res.responseText);
        }
        else this.emit('end');
    }
};

Response.prototype.write = function (res) {
    if (res.responseText.length > this.offset) {
        this.emit('data', res.responseText.slice(this.offset));
        this.offset = res.responseText.length;
    }
};

});

require.define("/node_modules/domready/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"./ready.js"}
});

require.define("/node_modules/domready/ready.js", function (require, module, exports, __dirname, __filename) {
/*!
  * domready (c) Dustin Diaz 2012 - License MIT
  */
!function (name, definition) {
  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()
}('domready', function (ready) {

  var fns = [], fn, f = false
    , doc = document
    , testEl = doc.documentElement
    , hack = testEl.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , addEventListener = 'addEventListener'
    , onreadystatechange = 'onreadystatechange'
    , readyState = 'readyState'
    , loaded = /^loade|c/.test(doc[readyState])

  function flush(f) {
    loaded = 1
    while (f = fns.shift()) f()
  }

  doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
    doc.removeEventListener(domContentLoaded, fn, f)
    flush()
  }, f)


  hack && doc.attachEvent(onreadystatechange, fn = function () {
    if (/^c/.test(doc[readyState])) {
      doc.detachEvent(onreadystatechange, fn)
      flush()
    }
  })

  return (ready = hack ?
    function (fn) {
      self != top ?
        loaded ? fn() : fns.push(fn) :
        function () {
          try {
            testEl.doScroll('left')
          } catch (e) {
            return setTimeout(function() { ready(fn) }, 50)
          }
          fn()
        }()
    } :
    function (fn) {
      loaded ? fn() : fns.push(fn)
    })
})
});

require.define("/controllers/index-controller.js", function (require, module, exports, __dirname, __filename) {
var $ = require('qwery'),
    _ = require('underscore'),
    async = require('async'),
    events = require('bean'),
    dom = require('bonzo'),
    $$ = function(selector, parent) { return dom($(selector, parent)); },
    morpheus = require('morpheus'),
    Cm1Route = require('cm1-route').Cm1Route,
    Google = require('../lib/google');

var FlightPath = require('../models/flight-path'),
    HootBarController = require('./hoot-bar-controller'),
    MapView = require('../views/map-view');
    RouteView = require('../views/route-view');
    SPI = require('../lib/spi');

var IndexController = module.exports = function(mapId) {
  this.mapView = new MapView(mapId);
  this.directionsDisplay = new Google.maps.DirectionsRenderer();
  this.directions = {};
  this.routeViews = {};
  for(var i in IndexController.modes) {
    var mode = IndexController.modes[i].toLowerCase();
    this.routeViews[mode] = new RouteView(this, mode);
  }
  this.hootBarController = new HootBarController(this);

  return true;
}

IndexController.modes = ['DRIVING','WALKING','BICYCLING','PUBLICTRANSIT','FLYING'];

IndexController.prototype.init = function() {
  //CM1.key = 'fd881ce1f975ac07b5c396591bd6978a';
  this.mapView.resize();
  this.mapView.googleMap;
  this.spi = SPI.current();

  events.add($('#go')[0], 'click', IndexController.events.routeButtonClick(this));
  var controller = this;
  _.each($('input[type=text]'), function(input) {
    events.add(input, 'keyup', IndexController.events.originDestinationInputKeyup(controller));
  });
  dom($('#when')[0]).val('Today');
  events.add($('#example')[0], 'click', IndexController.events.onExampleClick(this));
  this.hootBarController.init();
  for(var i in this.routeViews) {
    this.routeViews[i].enable();
  }

  if(this.spi.origin) $$('#origin').val(this.spi.origin);
  if(this.spi.destination) $$('#destination').val(this.spi.destination);
  if(this.spi.origin && this.spi.destination) {
    this.routeButtonClick();
  } else {
    this.fadeInSearch();
    $$('#nav').hide();
    $$('#modes').hide();
  }
};

IndexController.prototype.fadeIn = function(selector) {
  fadeIn = {
    opacity: '+=1',

    duration: 700,
    easing: morpheus.easings.easeIn
  }
  var element = $$(selector);
  element.show();
  if(element.css('opacity') <= 0) morpheus($(selector)[0], fadeIn);
};

IndexController.prototype.fadeOut = function(selector) {
  fadeOut = {
    opacity: '-=1',

    duration: 700,
    easing: morpheus.easings.easeOut,
    complete: function() { $$(selector).hide(); }
  }
  var element = $$(selector);
  if(element.css('opacity') > 0) morpheus($(selector)[0], fadeOut);
};

IndexController.prototype.fadeInSearch = function() {
  this.fadeIn('#search-panel');
};

IndexController.prototype.fadeOutSearch = function() {
  this.fadeOut('#search-panel');
};

IndexController.prototype.fadeInNav = function() {
  this.fadeIn('#nav');
};

IndexController.prototype.fadeOutNav = function() {
  this.fadeOut('#nav');
};

IndexController.prototype.fadeInModes = function() {
  this.fadeIn('#modes');
};

IndexController.prototype.fadeOutModes = function() {
  this.fadeOut('#modes');
};

IndexController.prototype.getEmissions = function(directions) {
  directions.getEmissions(
    IndexController.events.directionsGetEmissionsCallback(this),
    IndexController.events.segmentGetEmissionsCallback(this, directions));
};

IndexController.prototype.getDirections = function() {
  this.directionsDisplay.setMap(null); 
  this.directionsDisplay.setMap(this.mapView.googleMap);

  var controller = this;
  var directions = [];
  _.each(this.directions, function(direction) {
    directions.push(direction);
    direction.route(IndexController.events.
      directionsRouteCallback(controller));
  });
};

IndexController.prototype.currentUrl = function() {
  return SPI.generate($$('#origin').val(), $$('#destination').val()).urlString;
};

IndexController.prototype.currentRoute = function() {
  return this.routeViewFor($$('#modes .selected').attr('id'));
};

IndexController.prototype.displayDirectionsFor = function(directions) {
  if(directions.mode == 'FLYING') { 
    this.flightPath().display();
  } else {
    this.directionsDisplay.setOptions({ preserveViewport: true });
    this.directionsDisplay.setDirections(directions.directionsResult);
    this.directionsDisplay.setMap(this.mapView.googleMap);
  }
};

IndexController.prototype.hideDirectionsFor = function(directions) {
  if(directions.mode == 'FLYING') { 
    this.flightPath().hide();
  } else {
    this.directionsDisplay.setMap(null);
  }
};

IndexController.prototype.flightPath = function() {
  if(!this._flightPath && this.directions.flying) {
    this._flightPath = new FlightPath(this, this.directions.flying); 
  }
  return this._flightPath;
};

IndexController.prototype.clearFlightPath = function() {
  this._flightPath = null;
};

IndexController.prototype.routeViewFor = function(directions_or_mode) {
  var mode;
  if(directions_or_mode.mode) {
    mode = directions_or_mode.mode;
  } else {
    mode = directions_or_mode;
  }
  return this.routeViews[mode.toLowerCase()];
}

IndexController.prototype.routeButtonClick = function() {
  SPI.go(this.currentUrl());
  this.fadeOutSearch();
  this.fadeInNav();
  _.each($('#modes .failed'), function(element) { $$(element).removeClass('failed'); });
  for(var i in IndexController.modes) {
    var mode = IndexController.modes[i];
    var directions = Cm1Route.DirectionsFactory.
      create($$('#origin').val(), $$('#destination').val(), mode);
    this.directions[mode.toLowerCase()] = directions;
  }
  for(var i in this.routeViews) { this.routeViews[i].enable().start(); }
  this.routeViews.driving.select();
  if(this.flightPath()) {
    this.flightPath().hide();
    this.clearFlightPath();
  }
  this.fadeInModes();
  if ($.is($('#about')[0], ':visible')) {
    $$('#about').hide(); //'drop', { direction: 'up' }, 500);
  }
  this.getDirections();
};

IndexController.prototype.normalizePublicTransitDirections = function() {
  var drivingDirections = this.directions.driving.directionsResult,
      transitDirections = this.directions.publictransit.directionsResult,
      secretKey = _.first(_.difference(_.keys(drivingDirections), _.keys(transitDirections)));
  if(secretKey) {
    transitDirections[secretKey] = {
      travelMode: 'DRIVING'
    };
  }
};


// Events 

IndexController.events = {
  originDestinationInputKeyup: function(controller) {
    return function(event) {
      if(event.keyCode == 13) {
        controller.routeButtonClick();
      }
    };
  },

  routeButtonClick: function(controller) {
    return function() {
      controller.routeButtonClick();
    };
  },

  onModeClick: function(controller) {
    return function() {
      var newMode = controller.routeViewFor(this.id);

      var oldDirectionId = $$('.selected', this.parentNode).attr('id');
      var oldDirection = controller.directions[oldDirectionId];

      var newDirection = controller.directions[this.id];

      if(oldDirection.mode == newDirection.mode) {
        newMode.toggleDirections();
      } else {
        newMode.select();

        controller.hideDirectionsFor(oldDirection);
        controller.displayDirectionsFor(newDirection);

        $$('#routing div').hide();
        $$('#routing .' + this.id).show();
      }

      if($$('#routing').css('display') != 'none') {
        _.each($('li.' + this.id), function(li) {
          var liHeight = $$(li).dim().height - $$('p.emissions', li).dim().height - 20;
          var liIncrement = $$(li).dim().width;

          var instructions = $$('p.instructions', li);

          while(instructions.dim().height > liHeight) {
            var width = $$(li).dim().width + liIncrement;
            $$(li).css('width', width + 'px');
          }
        });
      }

      return false;
    };
  },

  onModeHoverIn: function(controller) {
    return function() {
      var direction = controller.directions[this.id];
      var originalDirectionId = $$('.selected', this.parentNode).attr('id');
      var originalDirection = controller.directions[originalDirectionId];
      controller.hideDirectionsFor(originalDirection);
      controller.displayDirectionsFor(direction);
    };
  },

  onModeHoverOut: function(controller) {
    return function() {
      var direction = controller.directions[this.id];
      var originalDirectionId = $$('.selected', this.parentNode).attr('id');
      var originalDirection = controller.directions[originalDirectionId];
      controller.hideDirectionsFor(direction);
      controller.displayDirectionsFor(originalDirection);
    };
  },

  directionsRouteCallback: function(controller) {
    return function(err, directions) {
      var routeView = controller.routeViewFor(directions);
      if(err) {
        routeView.disable();
        if(typeof console != 'undefined')
          console.log('Failed to route ' + directions.mode);
      } else {
        routeView.updateDirections();
        controller.getEmissions(directions);
        if(directions.mode == 'DRIVING') {
          controller.directionsDisplay.setOptions({ preserveViewport: false });
          controller.directionsDisplay.setDirections(directions.directionsResult);
        } else if(directions.mode == 'PUBLICTRANSIT') {
          controller.normalizePublicTransitDirections();
        }
        $$('#' + directions.mode.toLowerCase() + ' a span.total_time').html(directions.totalTime());
      }
    };
  },

  segmentGetEmissionsCallback: function(controller, directions) {
    return function(err, emissionEstimate) {
      var segment = emissionEstimate.emitter;
      var routeView = controller.routeViewFor(directions.mode);
      if(err) {
        routeView.fail();
      } else {
        routeView.updateSegmentEmissions(emissionEstimate);
      }
    };
  },

  directionsGetEmissionsCallback: function(controller) {
    return function(err, directions) {
      var routeView = controller.routeViewFor(directions.mode);
      if(err) {
        routeView.fail();
      } else {
        routeView.updateTotalEmissions();
        routeView.finish();
      }
    };
  },

  onExampleClick: function() {
    return function() {
      $$('#origin').val('1916 Broadway, New York, NY');
      $$('#destination').val('162 Madison Ave, New York, NY');
      return false;
    };
  }
};

IndexController.prototype.events = IndexController.events;

});

require.define("/node_modules/qwery/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"./qwery.js"}
});

require.define("/node_modules/qwery/qwery.js", function (require, module, exports, __dirname, __filename) {
/*!
  * Qwery - A Blazing Fast query selector engine
  * https://github.com/ded/qwery
  * copyright Dustin Diaz & Jacob Thornton 2011
  * MIT License
  */

(function (name, definition) {
  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()
})('qwery', function () {
  var doc = document
    , html = doc.documentElement
    , byClass = 'getElementsByClassName'
    , byTag = 'getElementsByTagName'
    , qSA = 'querySelectorAll'
    , useNativeQSA = 'useNativeQSA'
    , tagName = 'tagName'
    , nodeType = 'nodeType'
    , select // main select() method, assign later

    // OOOOOOOOOOOOH HERE COME THE ESSSXXSSPRESSSIONSSSSSSSS!!!!!
    , id = /#([\w\-]+)/
    , clas = /\.[\w\-]+/g
    , idOnly = /^#([\w\-]+)$/
    , classOnly = /^\.([\w\-]+)$/
    , tagOnly = /^([\w\-]+)$/
    , tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/
    , splittable = /(^|,)\s*[>~+]/
    , normalizr = /^\s+|\s*([,\s\+\~>]|$)\s*/g
    , splitters = /[\s\>\+\~]/
    , splittersMore = /(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\]|[\s\w\+\-]*\))/
    , specialChars = /([.*+?\^=!:${}()|\[\]\/\\])/g
    , simple = /^(\*|[a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/
    , attr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/
    , pseudo = /:([\w\-]+)(\(['"]?([^()]+)['"]?\))?/
    , easy = new RegExp(idOnly.source + '|' + tagOnly.source + '|' + classOnly.source)
    , dividers = new RegExp('(' + splitters.source + ')' + splittersMore.source, 'g')
    , tokenizr = new RegExp(splitters.source + splittersMore.source)
    , chunker = new RegExp(simple.source + '(' + attr.source + ')?' + '(' + pseudo.source + ')?')
    , walker = {
        ' ': function (node) {
          return node && node !== html && node.parentNode
        }
      , '>': function (node, contestant) {
          return node && node.parentNode == contestant.parentNode && node.parentNode
        }
      , '~': function (node) {
          return node && node.previousSibling
        }
      , '+': function (node, contestant, p1, p2) {
          if (!node) return false
          return (p1 = previous(node)) && (p2 = previous(contestant)) && p1 == p2 && p1
        }
      }

  function cache() {
    this.c = {}
  }
  cache.prototype = {
    g: function (k) {
      return this.c[k] || undefined
    }
  , s: function (k, v, r) {
      v = r ? new RegExp(v) : v
      return (this.c[k] = v)
    }
  }

  var classCache = new cache()
    , cleanCache = new cache()
    , attrCache = new cache()
    , tokenCache = new cache()

  function classRegex(c) {
    return classCache.g(c) || classCache.s(c, '(^|\\s+)' + c + '(\\s+|$)', 1)
  }

  // not quite as fast as inline loops in older browsers so don't use liberally
  function each(a, fn) {
    var i = 0, l = a.length
    for (; i < l; i++) fn(a[i])
  }

  function flatten(ar) {
    for (var r = [], i = 0, l = ar.length; i < l; ++i) arrayLike(ar[i]) ? (r = r.concat(ar[i])) : (r[r.length] = ar[i])
    return r
  }

  function arrayify(ar) {
    var i = 0, l = ar.length, r = []
    for (; i < l; i++) r[i] = ar[i]
    return r
  }

  function previous(n) {
    while (n = n.previousSibling) if (n[nodeType] == 1) break;
    return n
  }

  function q(query) {
    return query.match(chunker)
  }

  // called using `this` as element and arguments from regex group results.
  // given => div.hello[title="world"]:foo('bar')
  // div.hello[title="world"]:foo('bar'), div, .hello, [title="world"], title, =, world, :foo('bar'), foo, ('bar'), bar]
  function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value, wholePseudo, pseudo, wholePseudoVal, pseudoVal) {
    var i, m, k, o, classes
    if (this[nodeType] !== 1) return false
    if (tag && tag !== '*' && this[tagName] && this[tagName].toLowerCase() !== tag) return false
    if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) return false
    if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
      for (i = classes.length; i--;) if (!classRegex(classes[i].slice(1)).test(this.className)) return false
    }
    if (pseudo && qwery.pseudos[pseudo] && !qwery.pseudos[pseudo](this, pseudoVal)) return false
    if (wholeAttribute && !value) { // select is just for existance of attrib
      o = this.attributes
      for (k in o) {
        if (Object.prototype.hasOwnProperty.call(o, k) && (o[k].name || k) == attribute) {
          return this
        }
      }
    }
    if (wholeAttribute && !checkAttr(qualifier, getAttr(this, attribute) || '', value)) {
      // select is for attrib equality
      return false
    }
    return this
  }

  function clean(s) {
    return cleanCache.g(s) || cleanCache.s(s, s.replace(specialChars, '\\$1'))
  }

  function checkAttr(qualify, actual, val) {
    switch (qualify) {
    case '=':
      return actual == val
    case '^=':
      return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, '^' + clean(val), 1))
    case '$=':
      return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, clean(val) + '$', 1))
    case '*=':
      return actual.match(attrCache.g(val) || attrCache.s(val, clean(val), 1))
    case '~=':
      return actual.match(attrCache.g('~=' + val) || attrCache.s('~=' + val, '(?:^|\\s+)' + clean(val) + '(?:\\s+|$)', 1))
    case '|=':
      return actual.match(attrCache.g('|=' + val) || attrCache.s('|=' + val, '^' + clean(val) + '(-|$)', 1))
    }
    return 0
  }

  // given a selector, first check for simple cases then collect all base candidate matches and filter
  function _qwery(selector, _root) {
    var r = [], ret = [], i, l, m, token, tag, els, intr, item, root = _root
      , tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
      , dividedTokens = selector.match(dividers)

    if (!tokens.length) return r

    token = (tokens = tokens.slice(0)).pop() // copy cached tokens, take the last one
    if (tokens.length && (m = tokens[tokens.length - 1].match(idOnly))) root = byId(_root, m[1])
    if (!root) return r

    intr = q(token)
    // collect base candidates to filter
    els = root !== _root && root[nodeType] !== 9 && dividedTokens && /^[+~]$/.test(dividedTokens[dividedTokens.length - 1]) ?
      function (r) {
        while (root = root.nextSibling) {
          root[nodeType] == 1 && (intr[1] ? intr[1] == root[tagName].toLowerCase() : 1) && (r[r.length] = root)
        }
        return r
      }([]) :
      root[byTag](intr[1] || '*')
    // filter elements according to the right-most part of the selector
    for (i = 0, l = els.length; i < l; i++) {
      if (item = interpret.apply(els[i], intr)) r[r.length] = item
    }
    if (!tokens.length) return r

    // filter further according to the rest of the selector (the left side)
    each(r, function(e) { if (ancestorMatch(e, tokens, dividedTokens)) ret[ret.length] = e })
    return ret
  }

  // compare element to a selector
  function is(el, selector, root) {
    if (isNode(selector)) return el == selector
    if (arrayLike(selector)) return !!~flatten(selector).indexOf(el) // if selector is an array, is el a member?

    var selectors = selector.split(','), tokens, dividedTokens
    while (selector = selectors.pop()) {
      tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
      dividedTokens = selector.match(dividers)
      tokens = tokens.slice(0) // copy array
      if (interpret.apply(el, q(tokens.pop())) && (!tokens.length || ancestorMatch(el, tokens, dividedTokens, root))) {
        return true
      }
    }
    return false
  }

  // given elements matching the right-most part of a selector, filter out any that don't match the rest
  function ancestorMatch(el, tokens, dividedTokens, root) {
    var cand
    // recursively work backwards through the tokens and up the dom, covering all options
    function crawl(e, i, p) {
      while (p = walker[dividedTokens[i]](p, e)) {
        if (isNode(p) && (interpret.apply(p, q(tokens[i])))) {
          if (i) {
            if (cand = crawl(p, i - 1, p)) return cand
          } else return p
        }
      }
    }
    return (cand = crawl(el, tokens.length - 1, el)) && (!root || isAncestor(cand, root))
  }

  function isNode(el, t) {
    return el && typeof el === 'object' && (t = el[nodeType]) && (t == 1 || t == 9)
  }

  function uniq(ar) {
    var a = [], i, j
    o: for (i = 0; i < ar.length; ++i) {
      for (j = 0; j < a.length; ++j) if (a[j] == ar[i]) continue o
      a[a.length] = ar[i]
    }
    return a
  }

  function arrayLike(o) {
    return (typeof o === 'object' && isFinite(o.length))
  }

  function normalizeRoot(root) {
    if (!root) return doc
    if (typeof root == 'string') return qwery(root)[0]
    if (!root[nodeType] && arrayLike(root)) return root[0]
    return root
  }

  function byId(root, id, el) {
    // if doc, query on it, else query the parent doc or if a detached fragment rewrite the query and run on the fragment
    return root[nodeType] === 9 ? root.getElementById(id) :
      root.ownerDocument &&
        (((el = root.ownerDocument.getElementById(id)) && isAncestor(el, root) && el) ||
          (!isAncestor(root, root.ownerDocument) && select('[id="' + id + '"]', root)[0]))
  }

  function qwery(selector, _root) {
    var m, el, root = normalizeRoot(_root)

    // easy, fast cases that we can dispatch with simple DOM calls
    if (!root || !selector) return []
    if (selector === window || isNode(selector)) {
      return !_root || (selector !== window && isNode(root) && isAncestor(selector, root)) ? [selector] : []
    }
    if (selector && arrayLike(selector)) return flatten(selector)
    if (m = selector.match(easy)) {
      if (m[1]) return (el = byId(root, m[1])) ? [el] : []
      if (m[2]) return arrayify(root[byTag](m[2]))
      if (hasByClass && m[3]) return arrayify(root[byClass](m[3]))
    }

    return select(selector, root)
  }

  // where the root is not document and a relationship selector is first we have to
  // do some awkward adjustments to get it to work, even with qSA
  function collectSelector(root, collector) {
    return function(s) {
      var oid, nid
      if (splittable.test(s)) {
        if (root[nodeType] !== 9) {
         // make sure the el has an id, rewrite the query, set root to doc and run it
         if (!(nid = oid = root.getAttribute('id'))) root.setAttribute('id', nid = '__qwerymeupscotty')
         s = '[id="' + nid + '"]' + s // avoid byId and allow us to match context element
         collector(root.parentNode || root, s, true)
         oid || root.removeAttribute('id')
        }
        return;
      }
      s.length && collector(root, s, false)
    }
  }

  var isAncestor = 'compareDocumentPosition' in html ?
    function (element, container) {
      return (container.compareDocumentPosition(element) & 16) == 16
    } : 'contains' in html ?
    function (element, container) {
      container = container[nodeType] === 9 || container == window ? html : container
      return container !== element && container.contains(element)
    } :
    function (element, container) {
      while (element = element.parentNode) if (element === container) return 1
      return 0
    }
  , getAttr = function() {
      // detect buggy IE src/href getAttribute() call
      var e = doc.createElement('p')
      return ((e.innerHTML = '<a href="#x">x</a>') && e.firstChild.getAttribute('href') != '#x') ?
        function(e, a) {
          return a === 'class' ? e.className : (a === 'href' || a === 'src') ?
            e.getAttribute(a, 2) : e.getAttribute(a)
        } :
        function(e, a) { return e.getAttribute(a) }
   }()
  , hasByClass = !!doc[byClass]
    // has native qSA support
  , hasQSA = doc.querySelector && doc[qSA]
    // use native qSA
  , selectQSA = function (selector, root) {
      var result = [], ss, e
      try {
        if (root[nodeType] === 9 || !splittable.test(selector)) {
          // most work is done right here, defer to qSA
          return arrayify(root[qSA](selector))
        }
        // special case where we need the services of `collectSelector()`
        each(ss = selector.split(','), collectSelector(root, function(ctx, s) {
          e = ctx[qSA](s)
          if (e.length == 1) result[result.length] = e.item(0)
          else if (e.length) result = result.concat(arrayify(e))
        }))
        return ss.length > 1 && result.length > 1 ? uniq(result) : result
      } catch(ex) { }
      return selectNonNative(selector, root)
    }
    // no native selector support
  , selectNonNative = function (selector, root) {
      var result = [], items, m, i, l, r, ss
      selector = selector.replace(normalizr, '$1')
      if (m = selector.match(tagAndOrClass)) {
        r = classRegex(m[2])
        items = root[byTag](m[1] || '*')
        for (i = 0, l = items.length; i < l; i++) {
          if (r.test(items[i].className)) result[result.length] = items[i]
        }
        return result
      }
      // more complex selector, get `_qwery()` to do the work for us
      each(ss = selector.split(','), collectSelector(root, function(ctx, s, rewrite) {
        r = _qwery(s, ctx)
        for (i = 0, l = r.length; i < l; i++) {
          if (ctx[nodeType] === 9 || rewrite || isAncestor(r[i], root)) result[result.length] = r[i]
        }
      }))
      return ss.length > 1 && result.length > 1 ? uniq(result) : result
    }
  , configure = function (options) {
      // configNativeQSA: use fully-internal selector or native qSA where present
      if (typeof options[useNativeQSA] !== 'undefined')
        select = !options[useNativeQSA] ? selectNonNative : hasQSA ? selectQSA : selectNonNative
    }

  configure({ useNativeQSA: true })

  qwery.configure = configure
  qwery.uniq = uniq
  qwery.is = is
  qwery.pseudos = {}

  return qwery
});

});

require.define("/node_modules/underscore/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"underscore.js"}
});

require.define("/node_modules/underscore/underscore.js", function (require, module, exports, __dirname, __filename) {
//     Underscore.js 1.3.1
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.3.1';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    if (obj.length === +obj.length) results.length = obj.length;
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = _.toArray(obj).reverse();
    if (context && !initial) iterator = _.bind(iterator, context);
    return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj)) return Math.max.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj)) return Math.min.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var shuffled = [], rand;
    each(obj, function(value, index, list) {
      if (index == 0) {
        shuffled[0] = value;
      } else {
        rand = Math.floor(Math.random() * (index + 1));
        shuffled[index] = shuffled[rand];
        shuffled[rand] = value;
      }
    });
    return shuffled;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, val) {
    var result = {};
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    each(obj, function(value, index) {
      var key = iterator(value, index);
      (result[key] || (result[key] = [])).push(value);
    });
    return result;
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator || (iterator = _.identity);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(iterable) {
    if (!iterable)                return [];
    if (iterable.toArray)         return iterable.toArray();
    if (_.isArray(iterable))      return slice.call(iterable);
    if (_.isArguments(iterable))  return slice.call(iterable);
    return _.values(iterable);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.toArray(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head`. The **guard** check allows it to work
  // with `_.map`.
  _.first = _.head = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especcialy useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, (index == null) || guard ? 1 : index);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator) {
    var initial = iterator ? _.map(array, iterator) : array;
    var result = [];
    _.reduce(initial, function(memo, el, i) {
      if (0 == i || (isSorted === true ? _.last(memo) != el : !_.include(memo, el))) {
        memo[memo.length] = el;
        result[result.length] = array[i];
      }
      return memo;
    }, []);
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays. (Aliased as "intersect" for back-compat.)
  _.intersection = _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = _.flatten(slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.include(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i, l;
    if (isSorted) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(func, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) func.apply(context, args);
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        func.apply(context, args);
      }
      whenDone();
      throttling = true;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds.
  _.debounce = function(func, wait) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      return memo = func.apply(this, arguments);
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) { return func.apply(this, arguments); }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function.
  function eq(a, b, stack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // Invoke a custom `isEqual` method if one is provided.
    if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
    if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) return true;
    }
    // Add the first object to the stack of traversed objects.
    stack.push(a);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          // Ensure commutative equality for sparse arrays.
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent.
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    stack.pop();
    return result;
  }

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return toString.call(obj) == '[object Arguments]';
  };
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Is a given value a function?
  _.isFunction = function(obj) {
    return toString.call(obj) == '[object Function]';
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return toString.call(obj) == '[object String]';
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return toString.call(obj) == '[object Number]';
  };

  // Is the given value `NaN`?
  _.isNaN = function(obj) {
    // `NaN` is the only value for which `===` is not reflexive.
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return toString.call(obj) == '[object Date]';
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return toString.call(obj) == '[object RegExp]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Has own property?
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Escape a string for HTML interpolation.
  _.escape = function(string) {
    return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /.^/;

  // Within an interpolation, evaluation, or escaping, remove HTML escaping
  // that had been previously added.
  var unescape = function(code) {
    return code.replace(/\\\\/g, '\\').replace(/\\'/g, "'");
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(str, data) {
    var c  = _.templateSettings;
    var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
      'with(obj||{}){__p.push(\'' +
      str.replace(/\\/g, '\\\\')
         .replace(/'/g, "\\'")
         .replace(c.escape || noMatch, function(match, code) {
           return "',_.escape(" + unescape(code) + "),'";
         })
         .replace(c.interpolate || noMatch, function(match, code) {
           return "'," + unescape(code) + ",'";
         })
         .replace(c.evaluate || noMatch, function(match, code) {
           return "');" + unescape(code).replace(/[\r\n\t]/g, ' ') + ";__p.push('";
         })
         .replace(/\r/g, '\\r')
         .replace(/\n/g, '\\n')
         .replace(/\t/g, '\\t')
         + "');}return __p.join('');";
    var func = new Function('obj', '_', tmpl);
    if (data) return func(data, _);
    return function(data) {
      return func.call(this, data, _);
    };
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      var wrapped = this._wrapped;
      method.apply(wrapped, arguments);
      var length = wrapped.length;
      if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
      return result(wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

}).call(this);

});

require.define("/node_modules/async/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"./index"}
});

require.define("/node_modules/async/index.js", function (require, module, exports, __dirname, __filename) {
// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/async');

});

require.define("/node_modules/async/lib/async.js", function (require, module, exports, __dirname, __filename) {
/*global setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root = this,
        previous_async = root.async;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    else {
        root.async = async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    //// cross-browser compatiblity functions ////

    var _forEach = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _forEach(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _forEach(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        async.nextTick = function (fn) {
            setTimeout(fn, 0);
        };
    }
    else {
        async.nextTick = process.nextTick;
    }

    async.forEach = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _forEach(arr, function (x) {
            iterator(x, function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed === arr.length) {
                        callback();
                    }
                }
            });
        });
    };

    async.forEachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed === arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    
    async.forEachLimit = function (arr, limit, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length || limit <= 0) {
            return callback(); 
        }
        var completed = 0;
        var started = 0;
        var running = 0;
        
        (function replenish () {
          if (completed === arr.length) {
              return callback();
          }
          
          while (running < limit && started < arr.length) {
            iterator(arr[started], function (err) {
              if (err) {
                  callback(err);
                  callback = function () {};
              }
              else {
                  completed += 1;
                  running -= 1;
                  if (completed === arr.length) {
                      callback();
                  }
                  else {
                      replenish();
                  }
              }
            });
            started += 1;
            running += 1;
          }
        })();
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.forEach].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.forEachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);


    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.forEachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.forEach(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.forEach(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _forEach(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _forEach(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                if (err) {
                    callback(err);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    taskComplete();
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.nextTick(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    async.parallel = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.forEach(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.forEachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.queue = function (worker, concurrency) {
        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _forEach(data, function(task) {
                    q.tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (q.saturated && q.tasks.length == concurrency) {
                        q.saturated();
                    }
                    async.nextTick(q.process);
                });
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if(q.empty && q.tasks.length == 0) q.empty();
                    workers += 1;
                    worker(task.data, function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if(q.drain && q.tasks.length + workers == 0) q.drain();
                        q.process();
                    });
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _forEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      }
    };

}());

});

require.define("/node_modules/bean/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"./bean.js"}
});

require.define("/node_modules/bean/bean.js", function (require, module, exports, __dirname, __filename) {
/*!
  * bean.js - copyright Jacob Thornton 2011
  * https://github.com/fat/bean
  * MIT License
  * special thanks to:
  * dean edwards: http://dean.edwards.name/
  * dperini: https://github.com/dperini/nwevents
  * the entire mootools team: github.com/mootools/mootools-core
  */
!function (name, context, definition) {
  if (typeof module !== 'undefined') module.exports = definition(name, context);
  else if (typeof define === 'function' && typeof define.amd  === 'object') define(definition);
  else context[name] = definition(name, context);
}('bean', this, function (name, context) {
  var win = window
    , old = context[name]
    , overOut = /over|out/
    , namespaceRegex = /[^\.]*(?=\..*)\.|.*/
    , nameRegex = /\..*/
    , addEvent = 'addEventListener'
    , attachEvent = 'attachEvent'
    , removeEvent = 'removeEventListener'
    , detachEvent = 'detachEvent'
    , doc = document || {}
    , root = doc.documentElement || {}
    , W3C_MODEL = root[addEvent]
    , eventSupport = W3C_MODEL ? addEvent : attachEvent
    , slice = Array.prototype.slice
    , mouseTypeRegex = /click|mouse(?!(.*wheel|scroll))|menu|drag|drop/i
    , mouseWheelTypeRegex = /mouse.*(wheel|scroll)/i
    , textTypeRegex = /^text/i
    , touchTypeRegex = /^touch|^gesture/i
    , ONE = { one: 1 } // singleton for quick matching making add() do one()

    , nativeEvents = (function (hash, events, i) {
        for (i = 0; i < events.length; i++)
          hash[events[i]] = 1
        return hash
      })({}, (
          'click dblclick mouseup mousedown contextmenu ' +                  // mouse buttons
          'mousewheel mousemultiwheel DOMMouseScroll ' +                     // mouse wheel
          'mouseover mouseout mousemove selectstart selectend ' +            // mouse movement
          'keydown keypress keyup ' +                                        // keyboard
          'orientationchange ' +                                             // mobile
          'focus blur change reset select submit ' +                         // form elements
          'load unload beforeunload resize move DOMContentLoaded readystatechange ' + // window
          'error abort scroll ' +                                            // misc
          (W3C_MODEL ? // element.fireEvent('onXYZ'... is not forgiving if we try to fire an event
                       // that doesn't actually exist, so make sure we only do these on newer browsers
            'show ' +                                                          // mouse buttons
            'input invalid ' +                                                 // form elements
            'touchstart touchmove touchend touchcancel ' +                     // touch
            'gesturestart gesturechange gestureend ' +                         // gesture
            'message readystatechange pageshow pagehide popstate ' +           // window
            'hashchange offline online ' +                                     // window
            'afterprint beforeprint ' +                                        // printing
            'dragstart dragenter dragover dragleave drag drop dragend ' +      // dnd
            'loadstart progress suspend emptied stalled loadmetadata ' +       // media
            'loadeddata canplay canplaythrough playing waiting seeking ' +     // media
            'seeked ended durationchange timeupdate play pause ratechange ' +  // media
            'volumechange cuechange ' +                                        // media
            'checking noupdate downloading cached updateready obsolete ' +     // appcache
            '' : '')
        ).split(' ')
      )

    , customEvents = (function () {
        var cdp = 'compareDocumentPosition'
        var isAncestor = cdp in root
          ? function (element, container) {
              return container[cdp] && (container[cdp](element) & 16) === 16
            }
          : 'contains' in root
            ? function (element, container) {
                container = container.nodeType === 9 || container === window ? root : container
                return container !== element && container.contains(element)
              }
            : function (element, container) {
                while (element = element.parentNode) if (element === container) return 1
                return 0
              }

        function check(event) {
          var related = event.relatedTarget
          if (!related) return related === null
          return (related !== this && related.prefix !== 'xul' && !/document/.test(this.toString()) && !isAncestor(related, this))
        }

        return {
            mouseenter: { base: 'mouseover', condition: check }
          , mouseleave: { base: 'mouseout', condition: check }
          , mousewheel: { base: /Firefox/.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel' }
        }
      })()

    , fixEvent = (function () {
        var commonProps = 'altKey attrChange attrName bubbles cancelable ctrlKey currentTarget detail eventPhase getModifierState isTrusted metaKey relatedNode relatedTarget shiftKey srcElement target timeStamp type view which'.split(' ')
          , mouseProps = commonProps.concat('button buttons clientX clientY dataTransfer fromElement offsetX offsetY pageX pageY screenX screenY toElement'.split(' '))
          , mouseWheelProps = mouseProps.concat('wheelDelta wheelDeltaX wheelDeltaY wheelDeltaZ axis'.split(' ')) // 'axis' is FF specific
          , keyProps = commonProps.concat('char charCode key keyCode keyIdentifier keyLocation'.split(' '))
          , textProps = commonProps.concat(['data'])
          , touchProps = commonProps.concat('touches targetTouches changedTouches scale rotation'.split(' '))
          , preventDefault = 'preventDefault'
          , createPreventDefault = function (event) {
              return function () {
                if (event[preventDefault])
                  event[preventDefault]()
                else
                  event.returnValue = false
              }
            }
          , stopPropagation = 'stopPropagation'
          , createStopPropagation = function (event) {
              return function () {
                if (event[stopPropagation])
                  event[stopPropagation]()
                else
                  event.cancelBubble = true
              }
            }
          , createStop = function (synEvent) {
              return function () {
                synEvent[preventDefault]()
                synEvent[stopPropagation]()
                synEvent.stopped = true
              }
            }
          , copyProps = function (event, result, props) {
              var i, p
              for (i = props.length; i--;) {
                p = props[i]
                if (!(p in result) && p in event) result[p] = event[p]
              }
            }

        return function (event, isNative) {
          var result = { originalEvent: event, isNative: isNative }
          if (!event)
            return result

          var props
            , type = event.type
            , target = event.target || event.srcElement

          result[preventDefault] = createPreventDefault(event)
          result[stopPropagation] = createStopPropagation(event)
          result.stop = createStop(result)
          result.target = target && target.nodeType === 3 ? target.parentNode : target

          if (isNative) { // we only need basic augmentation on custom events, the rest is too expensive
            if (type.indexOf('key') !== -1) {
              props = keyProps
              result.keyCode = event.keyCode || event.which
            } else if (mouseTypeRegex.test(type)) {
              props = mouseProps
              result.rightClick = event.which === 3 || event.button === 2
              result.pos = { x: 0, y: 0 }
              if (event.pageX || event.pageY) {
                result.clientX = event.pageX
                result.clientY = event.pageY
              } else if (event.clientX || event.clientY) {
                result.clientX = event.clientX + doc.body.scrollLeft + root.scrollLeft
                result.clientY = event.clientY + doc.body.scrollTop + root.scrollTop
              }
              if (overOut.test(type))
                result.relatedTarget = event.relatedTarget || event[(type === 'mouseover' ? 'from' : 'to') + 'Element']
            } else if (touchTypeRegex.test(type)) {
              props = touchProps
            } else if (mouseWheelTypeRegex.test(type)) {
              props = mouseWheelProps
            } else if (textTypeRegex.test(type)) {
              props = textProps
            }
            copyProps(event, result, props || commonProps)
          }
          return result
        }
      })()

      // if we're in old IE we can't do onpropertychange on doc or win so we use doc.documentElement for both
    , targetElement = function (element, isNative) {
        return !W3C_MODEL && !isNative && (element === doc || element === win) ? root : element
      }

      // we use one of these per listener, of any type
    , RegEntry = (function () {
        function entry(element, type, handler, original, namespaces) {
          this.element = element
          this.type = type
          this.handler = handler
          this.original = original
          this.namespaces = namespaces
          this.custom = customEvents[type]
          this.isNative = nativeEvents[type] && element[eventSupport]
          this.eventType = W3C_MODEL || this.isNative ? type : 'propertychange'
          this.customType = !W3C_MODEL && !this.isNative && type
          this.target = targetElement(element, this.isNative)
          this.eventSupport = this.target[eventSupport]
        }

        entry.prototype = {
            // given a list of namespaces, is our entry in any of them?
            inNamespaces: function (checkNamespaces) {
              var i, j
              if (!checkNamespaces)
                return true
              if (!this.namespaces)
                return false
              for (i = checkNamespaces.length; i--;) {
                for (j = this.namespaces.length; j--;) {
                  if (checkNamespaces[i] === this.namespaces[j])
                    return true
                }
              }
              return false
            }

            // match by element, original fn (opt), handler fn (opt)
          , matches: function (checkElement, checkOriginal, checkHandler) {
              return this.element === checkElement &&
                (!checkOriginal || this.original === checkOriginal) &&
                (!checkHandler || this.handler === checkHandler)
            }
        }

        return entry
      })()

    , registry = (function () {
        // our map stores arrays by event type, just because it's better than storing
        // everything in a single array. uses '$' as a prefix for the keys for safety
        var map = {}

          // generic functional search of our registry for matching listeners,
          // `fn` returns false to break out of the loop
          , forAll = function (element, type, original, handler, fn) {
              if (!type || type === '*') {
                // search the whole registry
                for (var t in map) {
                  if (t.charAt(0) === '$')
                    forAll(element, t.substr(1), original, handler, fn)
                }
              } else {
                var i = 0, l, list = map['$' + type], all = element === '*'
                if (!list)
                  return
                for (l = list.length; i < l; i++) {
                  if (all || list[i].matches(element, original, handler))
                    if (!fn(list[i], list, i, type))
                      return
                }
              }
            }

          , has = function (element, type, original) {
              // we're not using forAll here simply because it's a bit slower and this
              // needs to be fast
              var i, list = map['$' + type]
              if (list) {
                for (i = list.length; i--;) {
                  if (list[i].matches(element, original, null))
                    return true
                }
              }
              return false
            }

          , get = function (element, type, original) {
              var entries = []
              forAll(element, type, original, null, function (entry) { return entries.push(entry) })
              return entries
            }

          , put = function (entry) {
              (map['$' + entry.type] || (map['$' + entry.type] = [])).push(entry)
              return entry
            }

          , del = function (entry) {
              forAll(entry.element, entry.type, null, entry.handler, function (entry, list, i) {
                list.splice(i, 1)
                if (list.length === 0)
                  delete map['$' + entry.type]
                return false
              })
            }

            // dump all entries, used for onunload
          , entries = function () {
              var t, entries = []
              for (t in map) {
                if (t.charAt(0) === '$')
                  entries = entries.concat(map[t])
              }
              return entries
            }

        return { has: has, get: get, put: put, del: del, entries: entries }
      })()

      // add and remove listeners to DOM elements
    , listener = W3C_MODEL ? function (element, type, fn, add) {
        element[add ? addEvent : removeEvent](type, fn, false)
      } : function (element, type, fn, add, custom) {
        if (custom && add && element['_on' + custom] === null)
          element['_on' + custom] = 0
        element[add ? attachEvent : detachEvent]('on' + type, fn)
      }

    , nativeHandler = function (element, fn, args) {
        var beanDel = fn.__beanDel
          , handler = function (event) {
          event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || win).event, true)
          if (beanDel) // delegated event, fix the fix
            event.currentTarget = beanDel.ft(event.target, element)
          return fn.apply(element, [event].concat(args))
        }
        handler.__beanDel = beanDel
        return handler
      }

    , customHandler = function (element, fn, type, condition, args, isNative) {
        var beanDel = fn.__beanDel
          , handler = function (event) {
          var target = beanDel ? beanDel.ft(event.target, element) : this // deleated event
          if (condition ? condition.apply(target, arguments) : W3C_MODEL ? true : event && event.propertyName === '_on' + type || !event) {
            if (event) {
              event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || win).event, isNative)
              event.currentTarget = target
            }
            fn.apply(element, event && (!args || args.length === 0) ? arguments : slice.call(arguments, event ? 0 : 1).concat(args))
          }
        }
        handler.__beanDel = beanDel
        return handler
      }

    , once = function (rm, element, type, fn, originalFn) {
        // wrap the handler in a handler that does a remove as well
        return function () {
          rm(element, type, originalFn)
          fn.apply(this, arguments)
        }
      }

    , removeListener = function (element, orgType, handler, namespaces) {
        var i, l, entry
          , type = (orgType && orgType.replace(nameRegex, ''))
          , handlers = registry.get(element, type, handler)

        for (i = 0, l = handlers.length; i < l; i++) {
          if (handlers[i].inNamespaces(namespaces)) {
            if ((entry = handlers[i]).eventSupport)
              listener(entry.target, entry.eventType, entry.handler, false, entry.type)
            // TODO: this is problematic, we have a registry.get() and registry.del() that
            // both do registry searches so we waste cycles doing this. Needs to be rolled into
            // a single registry.forAll(fn) that removes while finding, but the catch is that
            // we'll be splicing the arrays that we're iterating over. Needs extra tests to
            // make sure we don't screw it up. @rvagg
            registry.del(entry)
          }
        }
      }

    , addListener = function (element, orgType, fn, originalFn, args) {
        var entry
          , type = orgType.replace(nameRegex, '')
          , namespaces = orgType.replace(namespaceRegex, '').split('.')

        if (registry.has(element, type, fn))
          return element // no dupe
        if (type === 'unload')
          fn = once(removeListener, element, type, fn, originalFn) // self clean-up
        if (customEvents[type]) {
          if (customEvents[type].condition)
            fn = customHandler(element, fn, type, customEvents[type].condition, args, true)
          type = customEvents[type].base || type
        }
        entry = registry.put(new RegEntry(element, type, fn, originalFn, namespaces[0] && namespaces))
        entry.handler = entry.isNative ?
          nativeHandler(element, entry.handler, args) :
          customHandler(element, entry.handler, type, false, args, false)
        if (entry.eventSupport)
          listener(entry.target, entry.eventType, entry.handler, true, entry.customType)
      }

    , del = function (selector, fn, $) {
        var findTarget = function (target, root) {
              var i, array = typeof selector === 'string' ? $(selector, root) : selector
              for (; target && target !== root; target = target.parentNode) {
                for (i = array.length; i--;) {
                  if (array[i] === target)
                    return target
                }
              }
            }
          , handler = function (e) {
              var match = findTarget(e.target, this)
              if (match)
                fn.apply(match, arguments)
            }

        handler.__beanDel = {
            ft: findTarget // attach it here for customEvents to use too
          , selector: selector
          , $: $
        }
        return handler
      }

    , remove = function (element, typeSpec, fn) {
        var k, m, type, namespaces, i
          , rm = removeListener
          , isString = typeSpec && typeof typeSpec === 'string'

        if (isString && typeSpec.indexOf(' ') > 0) {
          // remove(el, 't1 t2 t3', fn) or remove(el, 't1 t2 t3')
          typeSpec = typeSpec.split(' ')
          for (i = typeSpec.length; i--;)
            remove(element, typeSpec[i], fn)
          return element
        }
        type = isString && typeSpec.replace(nameRegex, '')
        if (type && customEvents[type])
          type = customEvents[type].type
        if (!typeSpec || isString) {
          // remove(el) or remove(el, t1.ns) or remove(el, .ns) or remove(el, .ns1.ns2.ns3)
          if (namespaces = isString && typeSpec.replace(namespaceRegex, ''))
            namespaces = namespaces.split('.')
          rm(element, type, fn, namespaces)
        } else if (typeof typeSpec === 'function') {
          // remove(el, fn)
          rm(element, null, typeSpec)
        } else {
          // remove(el, { t1: fn1, t2, fn2 })
          for (k in typeSpec) {
            if (typeSpec.hasOwnProperty(k))
              remove(element, k, typeSpec[k])
          }
        }
        return element
      }

    , add = function (element, events, fn, delfn, $) {
        var type, types, i, args
          , originalFn = fn
          , isDel = fn && typeof fn === 'string'

        if (events && !fn && typeof events === 'object') {
          for (type in events) {
            if (events.hasOwnProperty(type))
              add.apply(this, [ element, type, events[type] ])
          }
        } else {
          args = arguments.length > 3 ? slice.call(arguments, 3) : []
          types = (isDel ? fn : events).split(' ')
          isDel && (fn = del(events, (originalFn = delfn), $)) && (args = slice.call(args, 1))
          // special case for one()
          this === ONE && (fn = once(remove, element, events, fn, originalFn))
          for (i = types.length; i--;) addListener(element, types[i], fn, originalFn, args)
        }
        return element
      }

    , one = function () {
        return add.apply(ONE, arguments)
      }

    , fireListener = W3C_MODEL ? function (isNative, type, element) {
        var evt = doc.createEvent(isNative ? 'HTMLEvents' : 'UIEvents')
        evt[isNative ? 'initEvent' : 'initUIEvent'](type, true, true, win, 1)
        element.dispatchEvent(evt)
      } : function (isNative, type, element) {
        element = targetElement(element, isNative)
        // if not-native then we're using onpropertychange so we just increment a custom property
        isNative ? element.fireEvent('on' + type, doc.createEventObject()) : element['_on' + type]++
      }

    , fire = function (element, type, args) {
        var i, j, l, names, handlers
          , types = type.split(' ')

        for (i = types.length; i--;) {
          type = types[i].replace(nameRegex, '')
          if (names = types[i].replace(namespaceRegex, ''))
            names = names.split('.')
          if (!names && !args && element[eventSupport]) {
            fireListener(nativeEvents[type], type, element)
          } else {
            // non-native event, either because of a namespace, arguments or a non DOM element
            // iterate over all listeners and manually 'fire'
            handlers = registry.get(element, type)
            args = [false].concat(args)
            for (j = 0, l = handlers.length; j < l; j++) {
              if (handlers[j].inNamespaces(names))
                handlers[j].handler.apply(element, args)
            }
          }
        }
        return element
      }

    , clone = function (element, from, type) {
        var i = 0
          , handlers = registry.get(from, type)
          , l = handlers.length
          , args, beanDel

        for (;i < l; i++) {
          if (handlers[i].original) {
            beanDel = handlers[i].handler.__beanDel
            if (beanDel) {
              args = [ element, beanDel.selector, handlers[i].type, handlers[i].original, beanDel.$]
            } else
              args = [ element, handlers[i].type, handlers[i].original ]
            add.apply(null, args)
          }
        }
        return element
      }

    , bean = {
          add: add
        , one: one
        , remove: remove
        , clone: clone
        , fire: fire
        , noConflict: function () {
            context[name] = old
            return this
          }
      }

  if (win[attachEvent]) {
    // for IE, clean up on unload to avoid leaks
    var cleanup = function () {
      var i, entries = registry.entries()
      for (i in entries) {
        if (entries[i].type && entries[i].type !== 'unload')
          remove(entries[i].element, entries[i].type)
      }
      win[detachEvent]('onunload', cleanup)
      win.CollectGarbage && win.CollectGarbage()
    }
    win[attachEvent]('onunload', cleanup)
  }

  return bean
})

});

require.define("/node_modules/bonzo/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"./bonzo.js"}
});

require.define("/node_modules/bonzo/bonzo.js", function (require, module, exports, __dirname, __filename) {
/*!
  * Bonzo: DOM Utility (c) Dustin Diaz 2012
  * https://github.com/ded/bonzo
  * License MIT
  */
(function (name, definition) {
  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(name, definition)
  else this[name] = definition()
})('bonzo', function() {
  var context = this
    , win = window
    , doc = win.document
    , html = doc.documentElement
    , parentNode = 'parentNode'
    , query = null
    , specialAttributes = /^(checked|value|selected)$/i
    , specialTags = /^(select|fieldset|table|tbody|tfoot|td|tr|colgroup)$/i // tags that we have trouble inserting *into*
    , table = [ '<table>', '</table>', 1 ]
    , td = [ '<table><tbody><tr>', '</tr></tbody></table>', 3 ]
    , option = [ '<select>', '</select>', 1 ]
    , noscope = [ '_', '', 0, 1 ]
    , tagMap = { // tags that we have trouble *inserting*
          thead: table, tbody: table, tfoot: table, colgroup: table, caption: table
        , tr: [ '<table><tbody>', '</tbody></table>', 2 ]
        , th: td , td: td
        , col: [ '<table><colgroup>', '</colgroup></table>', 2 ]
        , fieldset: [ '<form>', '</form>', 1 ]
        , legend: [ '<form><fieldset>', '</fieldset></form>', 2 ]
        , option: option, optgroup: option
        , script: noscope, style: noscope, link: noscope, param: noscope, base: noscope
      }
    , stateAttributes = /^(checked|selected)$/
    , ie = /msie/i.test(navigator.userAgent)
    , hasClass, addClass, removeClass
    , uidMap = {}
    , uuids = 0
    , digit = /^-?[\d\.]+$/
    , dattr = /^data-(.+)$/
    , px = 'px'
    , setAttribute = 'setAttribute'
    , getAttribute = 'getAttribute'
    , byTag = 'getElementsByTagName'
    , features = function() {
        var e = doc.createElement('p')
        e.innerHTML = '<a href="#x">x</a><table style="float:left;"></table>'
        return {
          hrefExtended: e[byTag]('a')[0][getAttribute]('href') != '#x' // IE < 8
        , autoTbody: e[byTag]('tbody').length !== 0 // IE < 8
        , computedStyle: doc.defaultView && doc.defaultView.getComputedStyle
        , cssFloat: e[byTag]('table')[0].style.styleFloat ? 'styleFloat' : 'cssFloat'
        , transform: function () {
            var props = ['webkitTransform', 'MozTransform', 'OTransform', 'msTransform', 'Transform'], i
            for (i = 0; i < props.length; i++) {
              if (props[i] in e.style) return props[i]
            }
          }()
        , classList: 'classList' in e
        }
      }()
    , trimReplace = /(^\s*|\s*$)/g
    , whitespaceRegex = /\s+/
    , toString = String.prototype.toString
    , unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1, boxFlex: 1, WebkitBoxFlex: 1, MozBoxFlex: 1 }
    , trim = String.prototype.trim ?
        function (s) {
          return s.trim()
        } :
        function (s) {
          return s.replace(trimReplace, '')
        }

  function classReg(c) {
    return new RegExp("(^|\\s+)" + c + "(\\s+|$)")
  }

  function each(ar, fn, scope) {
    for (var i = 0, l = ar.length; i < l; i++) fn.call(scope || ar[i], ar[i], i, ar)
    return ar
  }

  function deepEach(ar, fn, scope) {
    for (var i = 0, l = ar.length; i < l; i++) {
      if (isNode(ar[i])) {
        deepEach(ar[i].childNodes, fn, scope)
        fn.call(scope || ar[i], ar[i], i, ar)
      }
    }
    return ar
  }

  function camelize(s) {
    return s.replace(/-(.)/g, function (m, m1) {
      return m1.toUpperCase()
    })
  }

  function decamelize(s) {
    return s ? s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() : s
  }

  function data(el) {
    el[getAttribute]('data-node-uid') || el[setAttribute]('data-node-uid', ++uuids)
    uid = el[getAttribute]('data-node-uid')
    return uidMap[uid] || (uidMap[uid] = {})
  }

  function clearData(el) {
    uid = el[getAttribute]('data-node-uid')
    uid && (delete uidMap[uid])
  }

  function dataValue(d, f) {
    try {
      return (d === null || d === undefined) ? undefined :
        d === 'true' ? true :
          d === 'false' ? false :
            d === 'null' ? null :
              (f = parseFloat(d)) == d ? f : d;
    } catch(e) {}
    return undefined
  }

  function isNode(node) {
    return node && node.nodeName && node.nodeType == 1
  }

  function some(ar, fn, scope, i, j) {
    for (i = 0, j = ar.length; i < j; ++i) if (fn.call(scope, ar[i], i, ar)) return true
    return false
  }

  function styleProperty(p) {
      (p == 'transform' && (p = features.transform)) ||
        (/^transform-?[Oo]rigin$/.test(p) && (p = features.transform + "Origin")) ||
        (p == 'float' && (p = features.cssFloat))
      return p ? camelize(p) : null
  }

  var getStyle = features.computedStyle ?
    function (el, property) {
      var value = null
        , computed = doc.defaultView.getComputedStyle(el, '')
      computed && (value = computed[property])
      return el.style[property] || value
    } :

    (ie && html.currentStyle) ?

    function (el, property) {
      if (property == 'opacity') {
        var val = 100
        try {
          val = el.filters['DXImageTransform.Microsoft.Alpha'].opacity
        } catch (e1) {
          try {
            val = el.filters('alpha').opacity
          } catch (e2) {}
        }
        return val / 100
      }
      var value = el.currentStyle ? el.currentStyle[property] : null
      return el.style[property] || value
    } :

    function (el, property) {
      return el.style[property]
    }

  // this insert method is intense
  function insert(target, host, fn) {
    var i = 0, self = host || this, r = []
      // target nodes could be a css selector if it's a string and a selector engine is present
      // otherwise, just use target
      , nodes = query && typeof target == 'string' && target.charAt(0) != '<' ? query(target) : target
    // normalize each node in case it's still a string and we need to create nodes on the fly
    each(normalize(nodes), function (t) {
      each(self, function (el) {
        var n = !el[parentNode] || (el[parentNode] && !el[parentNode][parentNode]) ?
          function () {
            var c = el.cloneNode(true)
              , cloneElems
              , elElems

            // check for existence of an event cloner
            // preferably https://github.com/fat/bean
            // otherwise Bonzo won't do this for you
            if (self.$ && self.cloneEvents) {
              self.$(c).cloneEvents(el)

              // clone events from every child node
              cloneElems = self.$(c).find('*')
              elElems = self.$(el).find('*')

              for (var i = 0; i < elElems.length; i++)
                self.$(cloneElems[i]).cloneEvents(elElems[i])
            }
            return c
          }() : el
        fn(t, n)
        r[i] = n
        i++
      })
    }, this)
    each(r, function (e, i) {
      self[i] = e
    })
    self.length = i
    return self
  }

  function xy(el, x, y) {
    var $el = bonzo(el)
      , style = $el.css('position')
      , offset = $el.offset()
      , rel = 'relative'
      , isRel = style == rel
      , delta = [parseInt($el.css('left'), 10), parseInt($el.css('top'), 10)]

    if (style == 'static') {
      $el.css('position', rel)
      style = rel
    }

    isNaN(delta[0]) && (delta[0] = isRel ? 0 : el.offsetLeft)
    isNaN(delta[1]) && (delta[1] = isRel ? 0 : el.offsetTop)

    x != null && (el.style.left = x - offset.left + delta[0] + px)
    y != null && (el.style.top = y - offset.top + delta[1] + px)

  }

  // classList support for class management
  // altho to be fair, the api sucks because it won't accept multiple classes at once
  // so we iterate down below
  if (features.classList) {
    hasClass = function (el, c) {
      return el.classList.contains(c)
    }
    addClass = function (el, c) {
      el.classList.add(c)
    }
    removeClass = function (el, c) {
      el.classList.remove(c)
    }
  }
  else {
    hasClass = function (el, c) {
      return classReg(c).test(el.className)
    }
    addClass = function (el, c) {
      el.className = trim(el.className + ' ' + c)
    }
    removeClass = function (el, c) {
      el.className = trim(el.className.replace(classReg(c), ' '))
    }
  }


  // this allows method calling for setting values
  // example:
  // bonzo(elements).css('color', function (el) {
  //   return el.getAttribute('data-original-color')
  // })
  function setter(el, v) {
    return typeof v == 'function' ? v(el) : v
  }

  function Bonzo(elements) {
    this.length = 0
    if (elements) {
      elements = typeof elements !== 'string' &&
        !elements.nodeType &&
        typeof elements.length !== 'undefined' ?
          elements :
          [elements]
      this.length = elements.length
      for (var i = 0; i < elements.length; i++) this[i] = elements[i]
    }
  }

  Bonzo.prototype = {

      // indexr method, because jQueriers want this method. Jerks
      get: function (index) {
        return this[index] || null
      }

      // itetators
    , each: function (fn, scope) {
        return each(this, fn, scope)
      }

    , deepEach: function (fn, scope) {
        return deepEach(this, fn, scope)
      }

    , map: function (fn, reject) {
        var m = [], n, i
        for (i = 0; i < this.length; i++) {
          n = fn.call(this, this[i], i)
          reject ? (reject(n) && m.push(n)) : m.push(n)
        }
        return m
      }

    // text and html inserters!
    , html: function (h, text) {
        var method = text ?
          html.textContent === undefined ?
            'innerText' :
            'textContent' :
          'innerHTML';
        function append(el) {
          each(normalize(h), function (node) {
            el.appendChild(node)
          })
        }
        return typeof h !== 'undefined' ?
            this.empty().each(function (el) {
              !text && specialTags.test(el.tagName) ?
                append(el) :
                (function () {
                  try { (el[method] = h) }
                  catch(e) { append(el) }
                }())
            }) :
          this[0] ? this[0][method] : ''
      }

    , text: function (text) {
        return this.html(text, 1)
      }

      // more related insertion methods
    , append: function (node) {
        return this.each(function (el) {
          each(normalize(node), function (i) {
            el.appendChild(i)
          })
        })
      }

    , prepend: function (node) {
        return this.each(function (el) {
          var first = el.firstChild
          each(normalize(node), function (i) {
            el.insertBefore(i, first)
          })
        })
      }

    , appendTo: function (target, host) {
        return insert.call(this, target, host, function (t, el) {
          t.appendChild(el)
        })
      }

    , prependTo: function (target, host) {
        return insert.call(this, target, host, function (t, el) {
          t.insertBefore(el, t.firstChild)
        })
      }

    , before: function (node) {
        return this.each(function (el) {
          each(bonzo.create(node), function (i) {
            el[parentNode].insertBefore(i, el)
          })
        })
      }

    , after: function (node) {
        return this.each(function (el) {
          each(bonzo.create(node), function (i) {
            el[parentNode].insertBefore(i, el.nextSibling)
          })
        })
      }

    , insertBefore: function (target, host) {
        return insert.call(this, target, host, function (t, el) {
          t[parentNode].insertBefore(el, t)
        })
      }

    , insertAfter: function (target, host) {
        return insert.call(this, target, host, function (t, el) {
          var sibling = t.nextSibling
          if (sibling) {
            t[parentNode].insertBefore(el, sibling);
          }
          else {
            t[parentNode].appendChild(el)
          }
        })
      }

    , replaceWith: function(html) {
        this.deepEach(clearData)

        return this.each(function (el) {
          el.parentNode.replaceChild(bonzo.create(html)[0], el)
        })
      }

      // class management
    , addClass: function (c) {
        c = toString.call(c).split(whitespaceRegex)
        return this.each(function (el) {
          // we `each` here so you can do $el.addClass('foo bar')
          each(c, function (c) {
            if (c && !hasClass(el, setter(el, c)))
              addClass(el, setter(el, c))
          })
        })
      }

    , removeClass: function (c) {
        c = toString.call(c).split(whitespaceRegex)
        return this.each(function (el) {
          each(c, function (c) {
            if (c && hasClass(el, setter(el, c)))
              removeClass(el, setter(el, c))
          })
        })
      }

    , hasClass: function (c) {
        c = toString.call(c).split(whitespaceRegex)
        return some(this, function (el) {
          return some(c, function (c) {
            return c && hasClass(el, c)
          })
        })
      }

    , toggleClass: function (c, condition) {
        c = toString.call(c).split(whitespaceRegex)
        return this.each(function (el) {
          each(c, function (c) {
            if (c) {
              typeof condition !== 'undefined' ?
                condition ? addClass(el, c) : removeClass(el, c) :
                hasClass(el, c) ? removeClass(el, c) : addClass(el, c)
            }
          })
        })
      }

      // display togglers
    , show: function (type) {
        return this.each(function (el) {
          el.style.display = type || ''
        })
      }

    , hide: function () {
        return this.each(function (el) {
          el.style.display = 'none'
        })
      }

    , toggle: function (callback, type) {
        this.each(function (el) {
          el.style.display = (el.offsetWidth || el.offsetHeight) ? 'none' : type || ''
        })
        callback && callback()
        return this
      }

      // DOM Walkers & getters
    , first: function () {
        return bonzo(this.length ? this[0] : [])
      }

    , last: function () {
        return bonzo(this.length ? this[this.length - 1] : [])
      }

    , next: function () {
        return this.related('nextSibling')
      }

    , previous: function () {
        return this.related('previousSibling')
      }

    , parent: function() {
        return this.related(parentNode)
      }

    , related: function (method) {
        return this.map(
          function (el) {
            el = el[method]
            while (el && el.nodeType !== 1) {
              el = el[method]
            }
            return el || 0
          },
          function (el) {
            return el
          }
        )
      }

      // meh. use with care. the ones in Bean are better
    , focus: function () {
        this.length && this[0].focus()
        return this
      }

    , blur: function () {
        return this.each(function (el) {
          el.blur()
        })
      }

      // style getter setter & related methods
    , css: function (o, v, p) {
        // is this a request for just getting a style?
        if (v === undefined && typeof o == 'string') {
          // repurpose 'v'
          v = this[0]
          if (!v) {
            return null
          }
          if (v === doc || v === win) {
            p = (v === doc) ? bonzo.doc() : bonzo.viewport()
            return o == 'width' ? p.width : o == 'height' ? p.height : ''
          }
          return (o = styleProperty(o)) ? getStyle(v, o) : null
        }
        var iter = o
        if (typeof o == 'string') {
          iter = {}
          iter[o] = v
        }

        if (ie && iter.opacity) {
          // oh this 'ol gamut
          iter.filter = 'alpha(opacity=' + (iter.opacity * 100) + ')'
          // give it layout
          iter.zoom = o.zoom || 1;
          delete iter.opacity;
        }

        function fn(el, p, v) {
          for (var k in iter) {
            if (iter.hasOwnProperty(k)) {
              v = iter[k];
              // change "5" to "5px" - unless you're line-height, which is allowed
              (p = styleProperty(k)) && digit.test(v) && !(p in unitless) && (v += px)
              el.style[p] = setter(el, v)
            }
          }
        }
        return this.each(fn)
      }

    , offset: function (x, y) {
        if (typeof x == 'number' || typeof y == 'number') {
          return this.each(function (el) {
            xy(el, x, y)
          })
        }
        if (!this[0]) return {
            top: 0
          , left: 0
          , height: 0
          , width: 0
        }
        var el = this[0]
          , width = el.offsetWidth
          , height = el.offsetHeight
          , top = el.offsetTop
          , left = el.offsetLeft
        while (el = el.offsetParent) {
          top = top + el.offsetTop
          left = left + el.offsetLeft
        }

        return {
            top: top
          , left: left
          , height: height
          , width: width
        }
      }

    , dim: function () {
        if (!this.length) return { height: 0, width: 0 }
        var el = this[0]
          , orig = !el.offsetWidth && !el.offsetHeight ?
             // el isn't visible, can't be measured properly, so fix that
             function (t, s) {
                s = {
                    position: el.style.position || ''
                  , visibility: el.style.visibility || ''
                  , display: el.style.display || ''
                }
                t.first().css({
                    position: 'absolute'
                  , visibility: 'hidden'
                  , display: 'block'
                })
                return s
              }(this) : null
          , width = el.offsetWidth
          , height = el.offsetHeight

        orig && this.first().css(orig)
        return {
            height: height
          , width: width
        }
      }

      // attributes are hard. go shopping
    , attr: function (k, v) {
        var el = this[0]
        if (typeof k != 'string' && !(k instanceof String)) {
          for (var n in k) {
            k.hasOwnProperty(n) && this.attr(n, k[n])
          }
          return this
        }
        return typeof v == 'undefined' ?
          !el ? null : specialAttributes.test(k) ?
            stateAttributes.test(k) && typeof el[k] == 'string' ?
              true : el[k] : (k == 'href' || k =='src') && features.hrefExtended ?
                el[getAttribute](k, 2) : el[getAttribute](k) :
          this.each(function (el) {
            specialAttributes.test(k) ? (el[k] = setter(el, v)) : el[setAttribute](k, setter(el, v))
          })
      }

    , removeAttr: function (k) {
        return this.each(function (el) {
          stateAttributes.test(k) ? (el[k] = false) : el.removeAttribute(k)
        })
      }

    , val: function (s) {
        return (typeof s == 'string') ?
          this.attr('value', s) :
          this.length ? this[0].value : null
      }

      // use with care and knowledge. this data() method uses data attributes on the DOM nodes
      // to do this differently costs a lot more code. c'est la vie
    , data: function (k, v) {
        var el = this[0], uid, o, m
        if (typeof v === 'undefined') {
          if (!el) return null
          o = data(el)
          if (typeof k === 'undefined') {
            each(el.attributes, function(a) {
              (m = ('' + a.name).match(dattr)) && (o[camelize(m[1])] = dataValue(a.value))
            })
            return o
          } else {
            if (typeof o[k] === 'undefined')
              o[k] = dataValue(this.attr('data-' + decamelize(k)))
            return o[k]
          }
        } else {
          return this.each(function (el) { data(el)[k] = v })
        }
      }

      // DOM detachment & related
    , remove: function () {
        this.deepEach(clearData)

        return this.each(function (el) {
          el[parentNode] && el[parentNode].removeChild(el)
        })
      }

    , empty: function () {
        return this.each(function (el) {
          deepEach(el.childNodes, clearData)

          while (el.firstChild) {
            el.removeChild(el.firstChild)
          }
        })
      }

    , detach: function () {
        return this.map(function (el) {
          return el[parentNode].removeChild(el)
        })
      }

      // who uses a mouse anyway? oh right.
    , scrollTop: function (y) {
        return scroll.call(this, null, y, 'y')
      }

    , scrollLeft: function (x) {
        return scroll.call(this, x, null, 'x')
      }

  }

  function normalize(node) {
    return typeof node == 'string' ? bonzo.create(node) : isNode(node) ? [node] : node // assume [nodes]
  }

  function scroll(x, y, type) {
    var el = this[0]
    if (!el) return this
    if (x == null && y == null) {
      return (isBody(el) ? getWindowScroll() : { x: el.scrollLeft, y: el.scrollTop })[type]
    }
    if (isBody(el)) {
      win.scrollTo(x, y)
    } else {
      x != null && (el.scrollLeft = x)
      y != null && (el.scrollTop = y)
    }
    return this
  }

  function isBody(element) {
    return element === win || (/^(?:body|html)$/i).test(element.tagName)
  }

  function getWindowScroll() {
    return { x: win.pageXOffset || html.scrollLeft, y: win.pageYOffset || html.scrollTop }
  }

  function bonzo(els, host) {
    return new Bonzo(els, host)
  }

  bonzo.setQueryEngine = function (q) {
    query = q;
    delete bonzo.setQueryEngine
  }

  bonzo.aug = function (o, target) {
    // for those standalone bonzo users. this love is for you.
    for (var k in o) {
      o.hasOwnProperty(k) && ((target || Bonzo.prototype)[k] = o[k])
    }
  }

  bonzo.create = function (node) {
    // hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
    return typeof node == 'string' && node !== '' ?
      function () {
        var tag = /^\s*<([^\s>]+)/.exec(node)
          , el = doc.createElement('div')
          , els = []
          , p = tag ? tagMap[tag[1].toLowerCase()] : null
          , dep = p ? p[2] + 1 : 1
          , ns = p && p[3]
          , pn = parentNode
          , tb = features.autoTbody && p && p[0] == '<table>' && !(/<tbody/i).test(node)

        el.innerHTML = p ? (p[0] + node + p[1]) : node
        while (dep--) el = el.firstChild
        // for IE NoScope, we may insert cruft at the begining just to get it to work
        if (ns && el && el.nodeType !== 1) el = el.nextSibling
        do {
          // tbody special case for IE<8, creates tbody on any empty table
          // we don't want it if we're just after a <thead>, <caption>, etc.
          if ((!tag || el.nodeType == 1) && (!tb || el.tagName.toLowerCase() != 'tbody')) {
            els.push(el)
          }
        } while (el = el.nextSibling)
        // IE < 9 gives us a parentNode which messes up insert() check for cloning
        // `dep` > 1 can also cause problems with the insert() check (must do this last)
        each(els, function(el) { el[pn] && el[pn].removeChild(el) })
        return els

      }() : isNode(node) ? [node.cloneNode(true)] : []
  }

  bonzo.doc = function () {
    var vp = bonzo.viewport()
    return {
        width: Math.max(doc.body.scrollWidth, html.scrollWidth, vp.width)
      , height: Math.max(doc.body.scrollHeight, html.scrollHeight, vp.height)
    }
  }

  bonzo.firstChild = function (el) {
    for (var c = el.childNodes, i = 0, j = (c && c.length) || 0, e; i < j; i++) {
      if (c[i].nodeType === 1) e = c[j = i]
    }
    return e
  }

  bonzo.viewport = function () {
    return {
        width: ie ? html.clientWidth : self.innerWidth
      , height: ie ? html.clientHeight : self.innerHeight
    }
  }

  bonzo.isAncestor = 'compareDocumentPosition' in html ?
    function (container, element) {
      return (container.compareDocumentPosition(element) & 16) == 16
    } : 'contains' in html ?
    function (container, element) {
      return container !== element && container.contains(element);
    } :
    function (container, element) {
      while (element = element[parentNode]) {
        if (element === container) {
          return true
        }
      }
      return false
    }

  return bonzo
}); // the only line we care about using a semi-colon. placed here for concatenation tools

});

require.define("/node_modules/morpheus/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"./morpheus.js"}
});

require.define("/node_modules/morpheus/morpheus.js", function (require, module, exports, __dirname, __filename) {
/*!
  * Morpheus - A Brilliant Animator
  * https://github.com/ded/morpheus - (c) Dustin Diaz 2011
  * License MIT
  */
!function (name, definition) {
  if (typeof define == 'function') define(definition)
  else if (typeof module != 'undefined') module.exports = definition()
  else this[name] = definition()
}('morpheus', function () {

  var context = this
    , doc = document
    , win = window
    , html = doc.documentElement
    , thousand = 1000
    , rgbOhex = /^rgb\(|#/
    , relVal = /^([+\-])=([\d\.]+)/
    , numUnit = /^(?:[\+\-]=)?\d+(?:\.\d+)?(%|in|cm|mm|em|ex|pt|pc|px)$/
    , rotate = /rotate\(((?:[+\-]=)?([\-\d\.]+))deg\)/
    , scale = /scale\(((?:[+\-]=)?([\d\.]+))\)/
    , skew = /skew\(((?:[+\-]=)?([\-\d\.]+))deg, ?((?:[+\-]=)?([\-\d\.]+))deg\)/
    , translate = /translate\(((?:[+\-]=)?([\-\d\.]+))px, ?((?:[+\-]=)?([\-\d\.]+))px\)/
      // these elements do not require 'px'
    , unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1, transform: 1}

      // which property name does this browser use for transform
    , transform = function () {
        var styles = doc.createElement('a').style
          , props = ['webkitTransform','MozTransform','OTransform','msTransform','Transform'], i
        for (i = 0; i < props.length; i++) {
          if (props[i] in styles) return props[i]
        }
      }()

      // does this browser support the opacity property?
    , opasity = function () {
        return typeof doc.createElement('a').style.opacity !== 'undefined'
      }()

      // initial style is determined by the elements themselves
    , getStyle = doc.defaultView && doc.defaultView.getComputedStyle ?
        function (el, property) {
          property = property == 'transform' ? transform : property
          var value = null
            , computed = doc.defaultView.getComputedStyle(el, '')
          computed && (value = computed[camelize(property)])
          return el.style[property] || value
        } : html.currentStyle ?

        function (el, property) {
          property = camelize(property)

          if (property == 'opacity') {
            var val = 100
            try {
              val = el.filters['DXImageTransform.Microsoft.Alpha'].opacity
            } catch (e1) {
              try {
                val = el.filters('alpha').opacity
              } catch (e2) {}
            }
            return val / 100
          }
          var value = el.currentStyle ? el.currentStyle[property] : null
          return el.style[property] || value
        } :
        function (el, property) {
          return el.style[camelize(property)]
        }
    , frame = function () {
        // native animation frames
        // http://webstuff.nfshost.com/anim-timing/Overview.html
        // http://dev.chromium.org/developers/design-documents/requestanimationframe-implementation
        return win.requestAnimationFrame  ||
          win.webkitRequestAnimationFrame ||
          win.mozRequestAnimationFrame    ||
          win.oRequestAnimationFrame      ||
          win.msRequestAnimationFrame     ||
          function (callback) {
            win.setTimeout(function () {
              callback(+new Date())
            }, 11) // these go to eleven
          }
      }()
    , children = []

  function has(array, elem, i) {
    if (Array.prototype.indexOf) return array.indexOf(elem)
    for (i = 0; i < array.length; ++i) {
      if (array[i] === elem) return i
    }
  }

  function render(t) {
    var i, found, count = children.length
    for (i = count; i--;) {
      children[i](t)
      found = true
    }
    found && frame(render)
  }

  function live(f) {
    if (children.push(f) === 1) render()
  }

  function die(f) {
    var i, rest, index = has(children, f)
    if (index >= 0) {
      rest = children.slice(index+1)
      children.length = index
      children = children.concat(rest)
    }
  }

  function parseTransform(style, base) {
    var values = {}, m
    if (m = style.match(rotate)) values.rotate = by(m[1], base ? base.rotate : null)
    if (m = style.match(scale)) values.scale = by(m[1], base ? base.scale : null)
    if (m = style.match(skew)) {values.skewx = by(m[1], base ? base.skewx : null); values.skewy = by(m[3], base ? base.skewy : null)}
    if (m = style.match(translate)) {values.translatex = by(m[1], base ? base.translatex : null); values.translatey = by(m[3], base ? base.translatey : null)}
    return values
  }

  function formatTransform(v) {
    var s = ''
    if ('rotate' in v) s += 'rotate(' + v.rotate + 'deg) '
    if ('scale' in v) s += 'scale(' + v.scale + ') '
    if ('translatex' in v) s += 'translate(' + v.translatex + 'px,' + v.translatey + 'px) '
    if ('skewx' in v) s += 'skew(' + v.skewx + 'deg,' + v.skewy + 'deg)'
    return s
  }

  function rgb(r, g, b) {
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)
  }

  // convert rgb and short hex to long hex
  function toHex(c) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c)
    return (m ? rgb(m[1], m[2], m[3]) : c)
      .replace(/#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3') // short skirt to long jacket
  }

  // change font-size => fontSize etc.
  function camelize(s) {
    return s.replace(/-(.)/g, function (m, m1) {
      return m1.toUpperCase()
    })
  }

  // aren't we having it?
  function fun(f) {
    return typeof f == 'function'
  }

  /**
    * Core tween method that requests each frame
    * @param duration: time in milliseconds. defaults to 1000
    * @param fn: tween frame callback function receiving 'position'
    * @param done {optional}: complete callback function
    * @param ease {optional}: easing method. defaults to easeOut
    * @param from {optional}: integer to start from
    * @param to {optional}: integer to end at
    * @returns method to stop the animation
    */
  function tween(duration, fn, done, ease, from, to) {
    ease = fun(ease) ? ease : morpheus.easings[ease] || function (t) {
      // default to a pleasant-to-the-eye easeOut (like native animations)
      return Math.sin(t * Math.PI / 2)
    }
    var time = duration || thousand
      , self = this
      , diff = to - from
      , start = +new Date()
      , stop = 0
      , end = 0
    live(run)

    function run(t) {
      var delta = t - start
      if (delta > time || stop) {
        to = isFinite(to) ? to : 1
        stop ? end && fn(to) : fn(to)
        die(run)
        return done && done.apply(self)
      }
      // if you don't specify a 'to' you can use tween as a generic delta tweener
      // cool, eh?
      isFinite(to) ?
        fn((diff * ease(delta / time)) + from) :
        fn(ease(delta / time))
    }
    return {
      stop: function (jump) {
        stop = 1
        end = jump // jump to end of animation?
        if (!jump) done = null // remove callback if not jumping to end
      }
    }
  }

  /**
    * generic bezier method for animating x|y coordinates
    * minimum of 2 points required (start and end).
    * first point start, last point end
    * additional control points are optional (but why else would you use this anyway ;)
    * @param points: array containing control points
       [[0, 0], [100, 200], [200, 100]]
    * @param pos: current be(tween) position represented as float  0 - 1
    * @return [x, y]
    */
  function bezier(points, pos) {
    var n = points.length, r = [], i, j
    for (i = 0; i < n; ++i) {
      r[i] = [points[i][0], points[i][1]]
    }
    for (j = 1; j < n; ++j) {
      for (i = 0; i < n - j; ++i) {
        r[i][0] = (1 - pos) * r[i][0] + pos * r[parseInt(i + 1, 10)][0]
        r[i][1] = (1 - pos) * r[i][1] + pos * r[parseInt(i + 1, 10)][1]
      }
    }
    return [r[0][0], r[0][1]]
  }

  // this gets you the next hex in line according to a 'position'
  function nextColor(pos, start, finish) {
    var r = [], i, e, from, to
    for (i = 0; i < 6; i++) {
      from = Math.min(15, parseInt(start.charAt(i),  16))
      to   = Math.min(15, parseInt(finish.charAt(i), 16))
      e = Math.floor((to - from) * pos + from)
      e = e > 15 ? 15 : e < 0 ? 0 : e
      r[i] = e.toString(16)
    }
    return '#' + r.join('')
  }

  // this retreives the frame value within a sequence
  function getTweenVal(pos, units, begin, end, k, i, v) {
    if (k == 'transform') {
      v = {}
      for(var t in begin[i][k]) {
        v[t] = (t in end[i][k]) ? Math.round(((end[i][k][t] - begin[i][k][t]) * pos + begin[i][k][t]) * thousand) / thousand : begin[i][k][t]
      }
      return v
    } else if (typeof begin[i][k] == 'string') {
      return nextColor(pos, begin[i][k], end[i][k])
    } else {
      // round so we don't get crazy long floats
      v = Math.round(((end[i][k] - begin[i][k]) * pos + begin[i][k]) * thousand) / thousand
      // some css properties don't require a unit (like zIndex, lineHeight, opacity)
      if (!(k in unitless)) v += units[i][k] || 'px'
      return v
    }
  }

  // support for relative movement via '+=n' or '-=n'
  function by(val, start, m, r, i) {
    return (m = relVal.exec(val)) ?
      (i = parseFloat(m[2])) && (start + (m[1] == '+' ? 1 : -1) * i) :
      parseFloat(val)
  }

  /**
    * morpheus:
    * @param element(s): HTMLElement(s)
    * @param options: mixed bag between CSS Style properties & animation options
    *  - {n} CSS properties|values
    *     - value can be strings, integers,
    *     - or callback function that receives element to be animated. method must return value to be tweened
    *     - relative animations start with += or -= followed by integer
    *  - duration: time in ms - defaults to 1000(ms)
    *  - easing: a transition method - defaults to an 'easeOut' algorithm
    *  - complete: a callback method for when all elements have finished
    *  - bezier: array of arrays containing x|y coordinates that define the bezier points. defaults to none
    *     - this may also be a function that receives element to be animated. it must return a value
    */
  function morpheus(elements, options) {
    var els = elements ? (els = isFinite(elements.length) ? elements : [elements]) : [], i
      , complete = options.complete
      , duration = options.duration
      , ease = options.easing
      , points = options.bezier
      , begin = []
      , end = []
      , units = []
      , bez = []
      , originalLeft
      , originalTop

    delete options.complete;
    delete options.duration;
    delete options.easing;
    delete options.bezier;

    if (points) {
      // remember the original values for top|left
      originalLeft = options.left;
      originalTop = options.top;
      delete options.right;
      delete options.bottom;
      delete options.left;
      delete options.top;
    }

    for (i = els.length; i--;) {

      // record beginning and end states to calculate positions
      begin[i] = {}
      end[i] = {}
      units[i] = {}

      // are we 'moving'?
      if (points) {

        var left = getStyle(els[i], 'left')
          , top = getStyle(els[i], 'top')
          , xy = [by(fun(originalLeft) ? originalLeft(els[i]) : originalLeft || 0, parseFloat(left)),
                  by(fun(originalTop) ? originalTop(els[i]) : originalTop || 0, parseFloat(top))]

        bez[i] = fun(points) ? points(els[i], xy) : points
        bez[i].push(xy)
        bez[i].unshift([
            parseInt(left, 10)
          , parseInt(top, 10)
        ])
      }

      for (var k in options) {
        var v = getStyle(els[i], k), unit
          , tmp = fun(options[k]) ? options[k](els[i]) : options[k]
        if (typeof tmp == 'string' &&
            rgbOhex.test(tmp) &&
            !rgbOhex.test(v)) {
          delete options[k]; // remove key :(
          continue; // cannot animate colors like 'orange' or 'transparent'
                    // only #xxx, #xxxxxx, rgb(n,n,n)
        }

        begin[i][k] = k == 'transform' ? parseTransform(v) :
          typeof tmp == 'string' && rgbOhex.test(tmp) ?
            toHex(v).slice(1) :
            parseFloat(v)
        end[i][k] = k == 'transform' ? parseTransform(tmp,begin[i][k]) :
          typeof tmp == 'string' && tmp.charAt(0) == '#' ?
            toHex(tmp).slice(1) :
            by(tmp, parseFloat(v));
        // record original unit
        (typeof tmp == 'string') && (unit = tmp.match(numUnit)) && (units[i][k] = unit[1])
      }
    }
    // ONE TWEEN TO RULE THEM ALL
    return tween.apply(els, [duration, function (pos, v, xy) {
      // normally not a fan of optimizing for() loops, but we want something
      // fast for animating
      for (i = els.length; i--;) {
        if (points) {
          xy = bezier(bez[i], pos)
          els[i].style.left = xy[0] + 'px'
          els[i].style.top = xy[1] + 'px'
        }
        for (var k in options) {
          v = getTweenVal(pos, units, begin, end, k, i)
          k == 'transform' ?
            els[i].style[transform] = formatTransform(v) :
            k == 'opacity' && !opasity ?
              (els[i].style.filter = 'alpha(opacity=' + (v * 100) + ')') :
              (els[i].style[camelize(k)] = v)
        }
      }
    }, complete, ease])
  }

  // expose useful methods
  morpheus.tween = tween
  morpheus.getStyle = getStyle
  morpheus.bezier = bezier
  morpheus.transform = transform
  morpheus.parseTransform = parseTransform
  morpheus.formatTransform = formatTransform
  morpheus.easings = {}

  return morpheus

})

});

require.define("/node_modules/cm1-route/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {}
});

require.define("/node_modules/cm1-route/index.js", function (require, module, exports, __dirname, __filename) {
module.exports = require('./lib');

});

require.define("/node_modules/cm1-route/lib/index.js", function (require, module, exports, __dirname, __filename) {
module.exports = module;
module.exports.Cm1Route = require('./cm1-route');

});

require.define("/node_modules/cm1-route/lib/cm1-route.js", function (require, module, exports, __dirname, __filename) {
if(!process.env) process.env = {};

var DirectionsFactory  = require('./directions-factory'),
    FlyingDirections   = require('./directions/flying-directions'),
    GoogleDirections   = require('./directions/google-directions'),
    HopStopDirections  = require('./directions/hop-stop-directions'),
    MapquestDirections = require('./directions/mapquest-directions');

var Cm1Route = module.exports = {
  NumberFormatter: require('./number-formatter'),
  DirectionsFactory: DirectionsFactory,
  FlyingDirections: FlyingDirections,
  GoogleDirections: GoogleDirections,
  HopStopDirections: HopStopDirections,
  MapquestDirections: MapquestDirections
};

});

require.define("/node_modules/cm1-route/lib/directions-factory.js", function (require, module, exports, __dirname, __filename) {
var FlyingDirections = require('./directions/flying-directions'),
    GoogleDirections = require('./directions/google-directions'),
    MapquestDirections = require('./directions/mapquest-directions');

var DirectionsFactory = module.exports = {
  create: function(origin, destination, mode, day, time) {
    if(mode == 'PUBLICTRANSIT' || mode == 'SUBWAYING' || mode == 'BUSSING') {
      return new MapquestDirections(origin, destination, mode, day, time);
    } else if(mode == 'FLYING') {
      return new FlyingDirections(origin, destination, mode);
    } else {
      return new GoogleDirections(origin, destination, mode);
    }
  }
};


});

require.define("/node_modules/cm1-route/lib/directions/flying-directions.js", function (require, module, exports, __dirname, __filename) {
var Directions = require('../directions'),
    DirectionsEvents = require('../directions-events'),
    GoogleDirectionsRoute = require('./google-directions-route'),
    NumberFormatter = require('../number-formatter'),
    TimeFormatter = require('../time-formatter');

var async = require('async');

var FlyingDirections = module.exports = function(origin, destination) {
  this.origin = origin;
  this.destination = destination;
  this.mode = 'FLYING';
  this.geocoder = new google.maps.Geocoder();
  this.parameters = {};
}
FlyingDirections.prototype = new Directions();

FlyingDirections.RouteTooShortError = function (message) {  
  this.prototype = Error.prototype;  
  this.name = 'RouteTooShortError';  
  this.message = (message) ? message : "Route isn't long enough for a flight";  
};

FlyingDirections.events = new DirectionsEvents;

FlyingDirections.prototype.route = function (callback) {
  async.parallel({
    origin: FlyingDirections.events.geocode(this, 'origin', 'originLatLng'),
    destination: FlyingDirections.events.geocode(this, 'destination', 'destinationLatLng')
  }, FlyingDirections.events.onGeocodeFinish(this, callback));
};

FlyingDirections.prototype.calculateDistance = function() {
  this.distanceInMeters = google.maps.geometry.spherical.
    computeDistanceBetween(this.originLatLng, this.destinationLatLng);
  this.distance = this.distanceInMeters / 1000;
};

FlyingDirections.prototype.duration = function() {
  var rate = 0.0056818;  // that's like 400mph
  return rate * this.distance;
}

FlyingDirections.prototype.totalTime = function() {
  return TimeFormatter.format(this.duration());
};

FlyingDirections.prototype.isLongEnough = function() {
  return this.distance > 115;
};


// Events

FlyingDirections.events.onGeocodeFinish = function(directions, callback) {
  return function(err) {
    if(err) return callback(err, directions);

    directions.calculateDistance();

    if(!directions.isLongEnough())
      return callback(new FlyingDirections.RouteTooShortError, directions);

    var steps = [{
      travel_mode: 'FLYING',
      distance: { value: directions.distanceInMeters },
      duration: { value: directions.duration() },
      instructions: NumberFormatter.metersToMiles(directions.distance) + ' mile flight',
      start_location: directions.originLatLng,
      end_location: directions.destinationLatLng
    }];

    var route = {
      overview_path: [directions.originLatLng, directions.destinationLatLng],
      legs: [{
        duration: { value: directions.duration() },
        distance: { value: directions.distanceInMeters },
        steps: steps
      }],
      warnings: []
    };
    route.bounds = GoogleDirectionsRoute.generateBounds(route.overview_path);

    var directionsResult = { routes: [route] };
    directions.storeRoute(directionsResult);

    callback(null, directions);
  };
};

});

require.define("/node_modules/cm1-route/lib/directions.js", function (require, module, exports, __dirname, __filename) {
var _ = require('underscore'),
    async = require('async');

var DirectionsEvents = require('./directions-events'),
    DrivingSegment = require('./segment/driving-segment'),
    SegmentFactory = require('./segment-factory'),
    TimeFormatter = require('./time-formatter'),
    WalkingSegment = require('./segment/walking-segment');

var Directions = function(origin, destination, mode) {
  this.origin = origin;
  this.destination = destination;
  this.mode = mode;
};

Directions.translateAirport = function(locale) {
  if(/^[A-Za-z]{3}$/.test(locale))
    return locale + ' Airport';
  else
    return locale;
};

Directions.events = new DirectionsEvents();

Directions.prototype.isRouted = function() {
  return (typeof this.directionsResult != 'undefined');
};

Directions.prototype.storeRoute = function(result) {
  this.directionsResult = result;
  this.steps = result.routes[0].legs[0].steps;
  this.segments = [];
  _.each(this.steps, function(step, i) {
    this.segments.push(SegmentFactory.create(i, step));
  }, this);
  if(this.calculateDistance)
    this.calculateDistance();
};

Directions.prototype.eachSegment = function(lambda) {
  if(!this.segments) throw new Error("Directions haven't been routed yet.");
  for(var i = 0; i < this.segments.length; i++) {
    lambda(this.segments[i]);
  }
};

Directions.prototype.getEmissions = function(callback, segmentCallback) {
  this.totalEmissions = 0.0;

  if(this.segments && this.segments.length > 0) {
    this.getEmissionsFromSegments(callback, segmentCallback);
  } else if(this.distance) {
    this.getEmissionsFromDistance(callback, segmentCallback);
  }
};

Directions.prototype.getEmissionsFromSegments = function(callback, segmentCallback) {
  var directions = this;
  var segments = this.combineSegments();
  async.forEach(
    segments,
    function(segment, asyncCallback) {
      segment.parameters = directions.parameters;
      segment.getImpacts(
        Directions.events.onSegmentGetEmissionEstimate(directions, segmentCallback, asyncCallback));
    },
    function(err) {
      callback(err, directions);
    }
  );
};

Directions.prototype.combineSegments = function() {
  var drivingDistance = 0,
      computableSegments = [];

  _.each(this.segments, function(segment) {
    if(segment.travel_mode == 'DRIVING') {
      drivingDistance += segment.distance;
    } else {
      computableSegments.push(segment);
    }
  });

  if(drivingDistance > 0) {
    var segment = new DrivingSegment(0, { travel_mode: 'DRIVING' });
    segment.distance = drivingDistance;
    computableSegments.push(segment);
  }

  return computableSegments;
};

Directions.prototype.getEmissionsFromDistance = function(callback, segmentCallback) {
  var distanceInMeters = this.distance * 1000;
  this.segments = [SegmentFactory.create(0, {
    travel_mode: this.mode,
    distance: { value: distanceInMeters },
    instructions: 'travel ' + distanceInMeters + ' meters'
  })];

  this.getEmissions(callback, segmentCallback);
};

Directions.prototype.totalTime = function() {
  var totalTime = 0;
  this.eachSegment(function(segment) {
    totalTime += segment.duration;
  });
  return TimeFormatter.format(totalTime);
};

Directions.prototype.isAllWalkingSegments = function() {
  var result = true;
  this.eachSegment(function(segment) {
    result = result && segment instanceof WalkingSegment;
  });
  return result;
};

module.exports = Directions;

});

require.define("/node_modules/cm1-route/lib/directions-events.js", function (require, module, exports, __dirname, __filename) {
var DirectionsEvents = module.exports = function() {
  // Geocode using GMaps API and assign first result to property
  this.geocode = function(directions, addressProperty, property) {
    return function(callback) {
      var address = directions[addressProperty];

      if(address.lat) {
        directions[property] = address;
        return callback(null, [{geometry: { location: address }}]);
      }

      directions.geocoder.geocode({ address: address }, function(results) {
        if(results.length > 0) {
          directions[property] = results[0].geometry.location;
          callback(null, results);
        } else {
          var err = new DirectionsEvents.GeocodeError('Google returned no geocoding results for ' + address);
          callback(err, directions);
        }
      });
    };
  };

  this.onSegmentGetEmissionEstimate = function(directions, segmentCallback, asyncCallback) {
    return function(err, impacts) {
      if(err) return asyncCallback(err);
      directions.totalEmissions += impacts.carbon;
      if(segmentCallback) segmentCallback(err, impacts);
      asyncCallback(err);
    };
  };
};

DirectionsEvents.GeocodeError = function(message) {
  this.prototype = Error.prototype;
  this.name = 'GeocodeError';
  this.message = (message) ? message : 'Failed to goecode';
};

});

require.define("/node_modules/cm1-route/lib/segment/driving-segment.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('CM1'),
    Segment = require('../segment');

var DrivingSegment = module.exports = function(index, step) {
  this.init(index, step);
  this.mode = 'DRIVING';
}
DrivingSegment.prototype = new Segment();

CM1.extend(DrivingSegment, {
  model: 'automobile_trip',
  provides: ['distance']
});

});

require.define("/node_modules/cm1-route/node_modules/CM1/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"lib/cm1.js"}
});

require.define("/node_modules/cm1-route/node_modules/CM1/lib/cm1.js", function (require, module, exports, __dirname, __filename) {
// Carbon, energy, and other environmental impact calculations for your 
// JavaScript objects. Built for the browser and Node.js.
var _ = require('underscore');

var ImpactEstimate = require('./impact-estimate'),
  ImpactEstimator = require('./impact-estimator');

var CM1 = function() {
  this.attributeMap = {};
};

// ## Usage
// For a quick, **one-off calculation**, you can use `CM1.impacts()`. Here's an example for a flight:
// 
//     var CM1 = require('cm1');
//     CM1.impacts('flight', {
//       origin_airport: 'IAD',
//       destination_airport: 'PDX',
//       airline: 'United',
//       trips: 2,
//       segments_per_trip: 1    // nonstop flight
//     },
//     function(err, impacts) {
//       if(err) return console.log('Argh, falied!', err);
// 
//       console.log('Carbon for my cross-country flight: ',
//                   impacts.carbon);
//       console.log('Methodology: ', impacts.methodology);
//     });
// 
CM1.impacts = function(type, properties, callback) {
  var model = CM1.model(type, properties);
  model.getImpacts(callback);
};

// Alternatively, `CM1.model()` can add impact calculation abilities to an
// **existing object** on which you can run calculations at a later time:
// 
//     var CM1 = require('cm1');
//     var model = CM1.model('flight', {
//       origin_airport: 'JFK',
//       destination_airport: 'Berlin',
//       airline: 'Luftansa'
//     });
// 
//     // later...
//     model.seat_class = 'Business';
// 
//     model.getImpacts(function(err, impacts) {
//       if(err) return console.log('Argh, falied!', err);
// 
//       console.log('Carbon for my international flight: ',
//                   impacts.carbon);
//       console.log('Methodology: ', impacts.methodology);
//     });
// 
CM1.model = function(type, properties) {
  var proto = function() {};
  CM1.extend(proto, {
    model: type,
    provides: _.keys(properties)
  });

  var object = new proto();
  _.each(properties, function(value, key) {
    object[key] = value;
  });

  return object;
};

// You can also **extend any prototype** (class) to become and impact calculating machine. For example, let's
// say we have a class representing a rental car:
// 
// 
//     var RentalCar = function() {};
//     
//     var car = new RentalCar();
//     car.make = 'Honda';
//     car.model = 'Fit';
//     car.fuelEconomy = 36.7;
// 
// If you want to figure out how much CO2 it emits, use `CM1.extend()` to tell
// your prototype how to use CM1 to calculate impacts. The first argument is the
// prototype to extend, the second argument is a object that describes mappings
// between properties of your prototype instance to the characteristics sent to
// CM1. After executing `CM1.extend()`, A new function called `getImpacts()`
// will be added to your class. `CM1.extend()` must be run before instantiating
// the RentalCar.
// 
//     var RentalCar = function() {};
//     
//     CM1.extend(RentalCar, {
//       model: 'automobile',
//       provides: ['make', 'model', {
//         'fuel_efficiency': 'fuelEconomy'
//       }
//     });
// 
// This says "my RentalCar prototype will use the
// [Automobile emitter](http://carbon.brighterplanet.com/models/automobile) to calculate
// impacts. It uses the make property to provide make to the web service, model maps to
// model, and the fuelEconomy property maps to fuel_efficiency on CM1.
//
// Now you can calculate impacts:
// 
//     var car = new RentalCar();
//     car.make = 'Honda';
//     car.model = 'Fit';
//     car.fuelEconomy = 36.7;
// 
//     car.getImpacts(function(err, impacts) {
//       if(err) alert("Oops, something broke: " + err);
//  
//       alert("My emissions are: " + impacts.carbon);
//       alert("My fuel use is: " + impacts.fuelUse);
//     });
//
// There are a whole bunch of [other models](http://carbon.brighterplanet.com/models)
// available, including computer usage, rail trips, and flights.
// 
CM1.extend = function(klass, mapping) {
  klass.cm1 = new CM1();
  klass.cm1.define(mapping);
  klass.prototype.impactEstimator = new ImpactEstimator(klass.cm1);
  klass.prototype.getImpacts = function(callback) {
    return this.impactEstimator.getImpacts(this, callback);
  };
};

// ## Specifying an API Key
// 
// CM1 is free for non-commercial use and available for commercial use. In either 
// case, you need to sign up for a Brighter Planet API key if you haven't already.
// To do so, go to [keys.brighterplanet.com](http://keys.brighterplanet.com).
// 
// Once you have your key, you can specify it with:
// 
//     var CM1 = require('CM1');
//     process.env.CM1_KEY = 'ABC123';
//     
// Note: if using the stand-alone library, `process.env` won't be available in your
// browser until you `require('CM1')`.
// 
CM1.prototype.key = function() {
  if(process && process.env && process.env.CM1_KEY)
    return process.env.CM1_KEY;
  else
    return CM1.key;
};

// ## Connection Adapters: HTTP, Websockets, etc.
// CM1.js can use a **standard RESTful HTTP** adapter (default) or an **HTML5 Websockets** adapter.

// The **standard HTTP** adapter sends a separate HTTP request for each calculation 
// performed. This is ideal for when one or only a few calculations are made at 
// a given time.
CM1.useHttpAdapter = function() {
  CM1.setAdapter('http');
};

// The **Websockets** adapter is ideal for when many calculations need to be made at once.
// You will need to `npm install socket.io-client` to use this.
CM1.useWebsocketAdapter = function() {
  CM1.setAdapter('websocket');
};

// You can define process.env.CM1_ADAPTER to 'http' or 'websocket'. 
// Otherwise, CM1 defaults to the HTTP adapter
CM1.setAdapter = function(type) {
  process.env = process.env || {};
  type = type || process.env.CM1_ADAPTER || 'http';
  var adapter = type == 'http' ? 
    require('./adapters/http-adapter') :
    require('./adapters/websocket-adapter');
  CM1.adapter = new adapter();
};

// ## Etc.
// Apply a mapping to a CM1-enabled object.
CM1.prototype.define = function(mapping) {
  this.emitAs(mapping.model);
  var provisions = mapping.provide || mapping.provides;
  this.provide(provisions);
};

// Set the model (e.g. flight) used for calculation.
CM1.prototype.emitAs = function(model) {
  this.model = model;
};

// Define the properties of the CM1-enabled object that are sent as
// characteristics to CM1's models.
// The format of **attributes** can be:
//
// * `['foo', 'bar', 'baz']`
// * `['foo', 'bar', 'baz', { quux: 'quuxValue' }]`
// * `{ foo: 'fooProperty',  quux: 'quuxValue' }`
//
// When specifying an object parameter, the property name
// is the name of the CM1 characterstic, and the value is
// the name of the property or function on your object that
// holds the data to be sent.
CM1.prototype.provide = function(attributes) {
  for(var i in attributes) {
    if(attributes.hasOwnProperty(i)) {
      var value = attributes[i];
      if(typeof value == 'object') {
        this.provide(value);
      } else if(/^\d+$/.test(i)) {
        this.attributeMap[this.underscore(value)] = value;
      } else {
        this.attributeMap[this.underscore(i)] = value;
      }
    }
  }
};

CM1.prototype.underscore = function(string) {
  return string.replace(/([a-z])([A-Z])/g, function(str, first, second) {
    return first + '_' + second.toLowerCase();
  });
};

CM1.prototype.adapter = function() {
  if(!CM1.adapter) CM1.setAdapter();
  return CM1.adapter;
};

CM1.ImpactEstimate = ImpactEstimate;
CM1.ImpactEstimator = ImpactEstimator;
 
// ## Deploy With Browserify
// 
// CM1.js can be used with [browserify](http://github.com/substack/node-browserify).
// Simply `npm install CM1` and `require('CM1')` in your code.

module.exports = CM1;

});

require.define("/node_modules/cm1-route/node_modules/CM1/lib/impact-estimate.js", function (require, module, exports, __dirname, __filename) {
var ImpactEstimate = module.exports = function(subject, data) {
  this.subject = subject;
  this.data = data;

  if(data.decisions.carbon)
    this.carbon = data.decisions.carbon.object.value;
  proxyDataProperties(this, data);
};

var proxyDataProperties = function(estimate, data) {
  for (var property in data) {
    if(!data.hasOwnProperty(property)) continue;

    estimate[property] = data[property];
  }
};

});

require.define("/node_modules/cm1-route/node_modules/CM1/lib/impact-estimator.js", function (require, module, exports, __dirname, __filename) {
var ImpactEstimate = require('./impact-estimate');

var ImpactEstimator = module.exports = function(cm1) {
  this.cm1 = cm1;
};

ImpactEstimator.callbacks = {
  getImpacts: function(subject, callback) {
    return function(err, impacts) {
      if(err) {
        callback(err);
      } else {
        subject.impacts = impacts;
        callback(null, impacts);
      }
    }
  }
};

ImpactEstimator.prototype.params = function(subject) {
  var params = {};
  for(var cm1_field in this.cm1.attributeMap) {
    var attribute = this.cm1.attributeMap[cm1_field];
    var value = subject[attribute];
    var result = null;
    if(value)
      result = value;
    if(typeof result == 'function')
      result = result.apply(subject);
    if(result)
      params[cm1_field] = result;
  }

  if(this.cm1.key()) {
    params.key = this.cm1.key();
  }

  if(subject.parameters) {
    for(var i in subject.parameters) {
      params[i] = subject.parameters[i];
    }
  }

  return params;
};

ImpactEstimator.prototype.getImpacts = function(subject, callback) {
  this.cm1.adapter().getImpacts(this.cm1, subject, this.params(subject),
                                ImpactEstimator.callbacks.getImpacts(subject, callback));
};

});

require.define("/node_modules/cm1-route/node_modules/CM1/lib/adapters/http-adapter.js", function (require, module, exports, __dirname, __filename) {
var http = require('http'),
    querystring = require('querystring'),
    _ = require('underscore');

if(typeof JSON == 'undefined')
  JSON = require('JSON');

var ImpactEstimate = require('../impact-estimate'),
    Util = require('../util');

var HttpAdapter = module.exports = function() {
  this.host = 'impact.brighterplanet.com';
};

HttpAdapter.prototype.path = function(cm1) {
  return '/' + Util.pluralize(cm1.model) + '.json';
};

HttpAdapter.prototype.getImpacts = function(cm1, subject, params, callback) {
  var stringParams = _.reduce(params, function(obj, value, key) {
    obj[key] = value.toString();
    return obj;
  }, {});
  var body = querystring.stringify(stringParams);
  var req = http.request({
    host: this.host, port: 80, path: this.path(cm1),
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': body.length
    }
  }, function (res) {
    var data = '';
    res.on('data', function (buf) {
      data += buf;
    });

    res.on('error', function() {
      var err = new Error('Failed to get impact estimate: ' + data);
      callback(err);
    });

    res.on('end', function () {
      if(data.length == 0)
        callback(new Error('No data received'));

      var json = JSON.parse(data);
      subject.impacts = new ImpactEstimate(subject, json);
      callback(null, subject.impacts);
    });
  });
  req.end(body);
};

});

require.define("querystring", function (require, module, exports, __dirname, __filename) {
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    };

var objectKeys = Object.keys || function objectKeys(object) {
    if (object !== Object(object)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in object) if (object.hasOwnProperty(key)) keys[keys.length] = key;
    return keys;
}


/*!
 * querystring
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Library version.
 */

exports.version = '0.3.1';

/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Cache non-integer test regexp.
 */

var notint = /[^0-9]/;

/**
 * Parse the given query `str`, returning an object.
 *
 * @param {String} str
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};

  function promote(parent, key) {
    if (parent[key].length == 0) return parent[key] = {};
    var t = {};
    for (var i in parent[key]) t[i] = parent[key][i];
    parent[key] = t;
    return t;
  }

  return String(str)
    .split('&')
    .reduce(function(ret, pair){
      try{ 
        pair = decodeURIComponent(pair.replace(/\+/g, ' '));
      } catch(e) {
        // ignore
      }

      var eql = pair.indexOf('=')
        , brace = lastBraceInKey(pair)
        , key = pair.substr(0, brace || eql)
        , val = pair.substr(brace || eql, pair.length)
        , val = val.substr(val.indexOf('=') + 1, val.length)
        , parent = ret;

      // ?foo
      if ('' == key) key = pair, val = '';

      // nested
      if (~key.indexOf(']')) {
        var parts = key.split('[')
          , len = parts.length
          , last = len - 1;

        function parse(parts, parent, key) {
          var part = parts.shift();

          // end
          if (!part) {
            if (isArray(parent[key])) {
              parent[key].push(val);
            } else if ('object' == typeof parent[key]) {
              parent[key] = val;
            } else if ('undefined' == typeof parent[key]) {
              parent[key] = val;
            } else {
              parent[key] = [parent[key], val];
            }
          // array
          } else {
            obj = parent[key] = parent[key] || [];
            if (']' == part) {
              if (isArray(obj)) {
                if ('' != val) obj.push(val);
              } else if ('object' == typeof obj) {
                obj[objectKeys(obj).length] = val;
              } else {
                obj = parent[key] = [parent[key], val];
              }
            // prop
            } else if (~part.indexOf(']')) {
              part = part.substr(0, part.length - 1);
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            // key
            } else {
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            }
          }
        }

        parse(parts, parent, 'base');
      // optimize
      } else {
        if (notint.test(key) && isArray(parent.base)) {
          var t = {};
          for(var k in parent.base) t[k] = parent.base[k];
          parent.base = t;
        }
        set(parent.base, key, val);
      }

      return ret;
    }, {base: {}}).base;
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix;
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[]'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;
  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    ret.push(stringify(obj[key], prefix
      ? prefix + '[' + encodeURIComponent(key) + ']'
      : encodeURIComponent(key)));
  }
  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

});

require.define("/node_modules/cm1-route/node_modules/JSON/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"json2.js"}
});

require.define("/node_modules/cm1-route/node_modules/JSON/json2.js", function (require, module, exports, __dirname, __filename) {
/*
    http://www.JSON.org/json2.js
    2011-02-23

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON;
if (!JSON) {
    JSON = {};
}

(function () {
    "use strict";

    var global = Function('return this')()
      , JSON = global.JSON
      ;

    if (!JSON) {
      JSON = {};
    }

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                this.getUTCFullYear()     + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())      + 'T' +
                f(this.getUTCHours())     + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }

    global.JSON = JSON;
    module.exports = JSON;
}());

});

require.define("/node_modules/cm1-route/node_modules/CM1/lib/util.js", function (require, module, exports, __dirname, __filename) {
var Util = module.exports = {
  pluralize: function(str) {
    return str + 's';
  }
};

});

require.define("/node_modules/cm1-route/node_modules/CM1/lib/adapters/websocket-adapter.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('../cm1');

var ImpactEstimate = require('../impact-estimate'),
    Util = require('../util');

var WebsocketAdapter = module.exports = function() {
  process.env = process.env || {};
  var hostname = process.env.CM1_WEBSOCKET_HOST || CM1.websocketHost || 'push-brighterplanet.no.de:80';
  if(!/^http:/.test(hostname)) hostname = 'http://' + hostname;
  this.host = hostname;
};

WebsocketAdapter.callbacks = {
  getImpacts: function(subject, callback) {
    return function(response) {
      if(response.statusCode < 300) {
        var body = JSON.parse(response.body);
        subject.impacts = new ImpactEstimate(subject, body);
        callback(null, subject.impacts);
      } else {
        callback(response.body);
      }
    };
  }
};

WebsocketAdapter.prototype.connect = function() {
  var socketIo = 'socket.io-client';
  this.socket = require(socketIo).connect(this.host);
};

WebsocketAdapter.prototype.getImpacts = function(cm1, subject, params, callback) {
  var request = {
    'PATH_INFO': '/' + Util.pluralize(cm1.model) + '.json',
    'body': JSON.stringify(params)
  };
  if(!this.socket) this.connect();
  this.socket.emit('impacts', request,
                   WebsocketAdapter.callbacks.getImpacts(subject, callback));
};

});

require.define("/node_modules/cm1-route/lib/segment.js", function (require, module, exports, __dirname, __filename) {
var Segment = function() {};

Segment.prototype.init = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  if(step.travel_mode)
    this.travel_mode = step.travel_mode;
  this.instructions = step.instructions;
};

module.exports = Segment;

});

require.define("/node_modules/cm1-route/lib/segment-factory.js", function (require, module, exports, __dirname, __filename) {
var AmtrakingSegment = require('./segment/amtraking-segment'),
    BicyclingSegment = require('./segment/bicycling-segment'),
    BussingSegment = require('./segment/bussing-segment'),
    CommuterRailingSegment = require('./segment/commuter-railing-segment'),
    DrivingSegment = require('./segment/driving-segment'),
    FlyingSegment = require('./segment/flying-segment'),
    LightRailingSegment = require('./segment/light-railing-segment'),
    SubwayingSegment = require('./segment/subwaying-segment'),
    WalkingSegment = require('./segment/walking-segment');

var SegmentFactory = module.exports = {
  create: function(index, step) {
    if(step.travel_mode == 'DRIVING') {
      return new DrivingSegment(index, step);
    } else if(step.travel_mode == 'WALKING' || step.travel_mode == 'ENTRANCEEXIT') {
      return new WalkingSegment(index, step);
    } else if(step.travel_mode == 'BICYCLING') {
      return new BicyclingSegment(index, step);
    } else if(step.travel_mode == 'PUBLICTRANSIT') {
      return new SubwayingSegment(index, step);
    } else if(step.travel_mode == 'SUBWAYING') {
      return new SubwayingSegment(index, step);
    } else if(step.travel_mode == 'RAIL') {
      return new SubwayingSegment(index, step);
    } else if(step.travel_mode == 'AUTO') {
      return new WalkingSegment(index, step);
    } else if(step.travel_mode == 'BUSSING') {
      return new BussingSegment(index, step);
    } else if(step.travel_mode == 'LIGHTRAILING') {
      return new LightRailingSegment(index, step);
    } else if(step.travel_mode == 'FLYING') {
      return new FlyingSegment(index, step);
    } else if(step.travel_mode == 'AMTRAKING') {
      return new AmtrakingSegment(index, step);
    } else if(step.travel_mode == 'COMMUTERRAILING') {
      return new CommuterRailingSegment(index, step);
    } else {
      throw "Could not create a Segment for travel_mode: " + step.travel_mode;
    }
  }
};

});

require.define("/node_modules/cm1-route/lib/segment/amtraking-segment.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('CM1'),
    Segment = require('../segment');

var AmtrakingSegment = module.exports = function(index, step) {
  this.init(index, step);
  this.rail_class = 'intercity rail';
}
AmtrakingSegment.prototype = new Segment();

CM1.extend(AmtrakingSegment, {
  model: 'rail_trip',
  provides: ['distance', 'duration', 'rail_class']
});

});

require.define("/node_modules/cm1-route/lib/segment/bicycling-segment.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('CM1'),
    Segment = require('../segment');

var BicyclingSegment = module.exports = function(index, step) {
  this.init(index, step);
  this.mode = 'BICYCLING';
}
BicyclingSegment.prototype = new Segment();

BicyclingSegment.prototype.getImpacts = function(callback) {
  var estimate = new CM1.ImpactEstimate(this, {
    decisions: { carbon: { object: { value: 0 } } },
    methodology: ''
  });
  callback(null, estimate);
};

});

require.define("/node_modules/cm1-route/lib/segment/bussing-segment.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('CM1'),
    Segment = require('../segment');

var BussingSegment = module.exports = function(index, step) {
  this.init(index, step);
  this.bus_class = 'city transit';
  this.mode = 'BUSSING';
}
BussingSegment.prototype = new Segment();

CM1.extend(BussingSegment, {
  model: 'bus_trip',
  provides: ['distance', 'bus_class', 'duration']
});

});

require.define("/node_modules/cm1-route/lib/segment/commuter-railing-segment.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('CM1'),
    Segment = require('../segment');

var CommuterRailingSegment = module.exports = function(index, step) {
  this.init(index, step);
  this.rail_class = 'commuter rail';
}
CommuterRailingSegment.prototype = new Segment();

CM1.extend(CommuterRailingSegment, {
  model: 'rail_trip',
  provides: ['distance', 'duration', 'rail_class']
});

});

require.define("/node_modules/cm1-route/lib/segment/flying-segment.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('CM1'),
    Segment = require('../segment');

var FlyingSegment = module.exports = function(index, step) {
  this.init(index, step);
  this.trips = 1;
  this.mode = 'FLYING';
}
FlyingSegment.prototype = new Segment();

CM1.extend(FlyingSegment, {
  model: 'flight',
  provides: ['trips', { 'distance_estimate': 'distance' }]
});

});

require.define("/node_modules/cm1-route/lib/segment/light-railing-segment.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('CM1'),
    Segment = require('../segment');

var LightRailingSegment = module.exports = function(index, step) {
  this.init(index, step);
  this.rail_class = 'light rail';
}
LightRailingSegment.prototype = new Segment();

CM1.extend(LightRailingSegment, {
  model: 'rail_trip',
  provides: ['duration', 'rail_class', { 'distance_estimate': 'distance' }]
});

});

require.define("/node_modules/cm1-route/lib/segment/subwaying-segment.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('CM1'),
    Segment = require('../segment');

var SubwayingSegment = module.exports = function(index, step) {
  this.init(index, step);
  this.rail_class = 'heavy rail';
  this.mode = 'SUBWAYING';
}
SubwayingSegment.prototype = new Segment();

CM1.extend(SubwayingSegment, {
  model: 'rail_trip',
  provides: ['rail_class', 'distance', 'duration']
});

});

require.define("/node_modules/cm1-route/lib/segment/walking-segment.js", function (require, module, exports, __dirname, __filename) {
var CM1 = require('CM1'),
    Segment = require('../segment');

var WalkingSegment = module.exports = function(index, step) {
  this.init(index, step);
  this.mode = 'WALKING';
};
WalkingSegment.prototype = new Segment();

WalkingSegment.prototype.getImpacts = function(callback) {
  var estimate = new CM1.ImpactEstimate(this, {
    decisions: { carbon: { object: { value: 0 } } },
    methodology: ''
  });
  callback(null, estimate);
};

});

require.define("/node_modules/cm1-route/lib/time-formatter.js", function (require, module, exports, __dirname, __filename) {
var TimeFormatter = module.exports = {
  format: function(seconds) {
    if(seconds == 0)
      return '';

    var parts = this.getParts(seconds);
    var output = [];
    if(parts.hours > 0) {
      output.push(parts.hours + ' hrs');
    }

    if(parts.minutes != null) {
      if(parts.minutes != 1) {
        output.push(parts.minutes + ' mins');
      } else {
        output.push(parts.minutes + ' min');
      }
    }

    return output.join(', ');
  },

  getParts: function(seconds) {
    var result = {};
    var hours = Math.floor(seconds / 3600);
    if(hours > 0)
      result.hours = hours;

    var minutes = Math.ceil((seconds - (hours * 3600)) / 60);
    if(hours == 0 || minutes > 0)
      result.minutes = minutes;
    
    return result;
  }
};

});

require.define("/node_modules/cm1-route/lib/directions/google-directions-route.js", function (require, module, exports, __dirname, __filename) {
var _ = require('underscore');

var GoogleDirectionsRoute = {
  generateBounds: function(pairs) {
    var corners = {};

    _.each(pairs, function(pair) {
      corners = GoogleDirectionsRoute.recordCoords(pair, corners);
    });

    if(corners.sWLat != null && corners.sWLng != null && 
       corners.nELat != null && corners.nELng != null) {
      var southWest = new google.maps.LatLng(corners.sWLat, corners.sWLng);
      var northEast = new google.maps.LatLng(corners.nELat, corners.nELng);
      return new google.maps.LatLngBounds(southWest, northEast);
    } else {
      return null;
    }
  },

  recordCoords: function(location, corners) {
    if(location) {
      var lat = location.lat();
      var lng = location.lng();
      corners.sWLat = (corners.sWLat == null ? lat : Math.min(corners.sWLat, lat));
      corners.sWLng = (corners.sWLng == null ? lng : Math.min(corners.sWLng, lng));
      corners.nELat = (corners.nELat == null ? lat : Math.max(corners.nELat, lat));
      corners.nELng = (corners.nELng == null ? lng : Math.max(corners.nELng, lng));
    }

    return corners;
  }
};

module.exports = GoogleDirectionsRoute;

});

require.define("/node_modules/cm1-route/lib/number-formatter.js", function (require, module, exports, __dirname, __filename) {
var NumberFormatter = module.exports  = {
  kilogramsToPounds: function(num, significantDigits) {
    if(!significantDigits) significantDigits = 2;
    var magnitude = Math.pow(10.0, significantDigits);
    return (Math.round(num * magnitude * 2.2046) / magnitude);
  },
  metersToMiles: function(num) {
    return (Math.round((num / 1609.3) * 100) / 100);
  }
};

});

require.define("/node_modules/cm1-route/lib/directions/google-directions.js", function (require, module, exports, __dirname, __filename) {
var Directions = require('../directions');

var GoogleDirections = module.exports = function(origin, destination, mode) {
  this.origin = origin
  this.destination = destination
  this.mode = mode
  this.geocoder = new google.maps.Geocoder();
  this.parameters = {};
}
GoogleDirections.prototype = new Directions

GoogleDirections.GoogleRouteError = function(message) {
  this.prototype = Error.prototype;  
  this.name = 'GoogleRouteError';  
  this.message = (message) ? message : 'Google failed to get a route';  
};

GoogleDirections.prototype.directionsService = function() {
  if(!this._directionsService) {
    this._directionsService = new google.maps.DirectionsService()
  }

  return this._directionsService
};

GoogleDirections.prototype.route = function(callback) {
  var request = {
    origin: this.origin || this.originLatLng,
    destination: this.destination || this.destinationLatLng,
    travelMode: this.mode
  };
  this.directionsService().
    route(request,
          GoogleDirections.events.directionsServiceRouteCallback(this, callback));
};

GoogleDirections.prototype.calculateDistance = function() {
  this.distanceInMeters = this.directionsResult.routes[0].legs[0].distance.value;
  this.distance = this.distanceInMeters / 1000;
};

// Events

GoogleDirections.events = {
  directionsServiceRouteCallback: function(directions, callback) {
    return function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        directions.storeRoute(result);
        callback(null, directions)
      } else {
        var err = new GoogleDirections.GoogleRouteError('Failed to get route from google: ' + status);
        callback(err);
      }
    };
  }
};

});

require.define("/node_modules/cm1-route/lib/directions/mapquest-directions.js", function (require, module, exports, __dirname, __filename) {
var Directions = require('../directions'),
    DirectionsEvents = require('../directions-events'),
    GoogleDirectionsRoute = require('./google-directions-route'),
    WalkingSegment = require('../segment/walking-segment'),
    MapquestApi = require('../mapquest-api');

var async = require('async'),
    _ = require('underscore');

var MapquestDirections = module.exports = function(origin, destination, mode, when) {
  this.origin = origin;
  this.destination = destination;
  this.mode = mode || 'PUBLICTRANSIT';
  this.when = when || 'now';
  this.geocoder = new google.maps.Geocoder();
  this.parameters = {};
}
MapquestDirections.prototype = new Directions();

MapquestDirections.events = new DirectionsEvents();

MapquestDirections.prototype.route = function(callback) {
  var directions = this;

  async.parallel({
    origin: MapquestDirections.events.geocode(this, 'origin', 'originLatLng'),
    destination: MapquestDirections.events.geocode(this, 'destination', 'destinationLatLng')
  }, function(err, geocodes) {
    if(err) callback(err, directions);

    directions.fetchMapquest(callback);
  });
};

MapquestDirections.prototype.originLatLngString = function() {
  return this.originLatLng.lat() + ',' + this.originLatLng.lng();
};
MapquestDirections.prototype.destinationLatLngString = function() {
  return this.destinationLatLng.lat() + ',' + this.destinationLatLng.lng();
};

MapquestDirections.prototype.fetchMapquest = function(callback) {
  MapquestApi.fetch(this.originLatLngString(), this.destinationLatLngString(),
    MapquestDirections.events.processMapquest(this, callback));
};

MapquestDirections.translateRoute = function(result) {
  var route = {
    copyrights: result.info.copyright.text,
    overview_path: MapquestDirections.generateOverviewPath(result.route.shape.shapePoints)
  };
  route.legs = [{
    duration: { value: result.route.time },
    distance: { value: result.route.distance * 1.609344 }, // mi => km
    start_address: '',
    start_location: _.first(route.overview_path),
    end_address: '',
    end_location: _.last(route.overview_path),
    steps: MapquestDirections.generateGoogleSteps(
        result.route.legs[0].maneuvers,
        result.route.shape.maneuverIndexes,
        route.overview_path),
    via_waypoints: []
  }];
  route.warnings = [];
  route.bounds = MapquestDirections.generateBounds(result.route.boundingBox);

  this.distance = route.legs[0].distance.value;
  this.distanceInMeters = this.distance * 1000;

  return {
    Ib: {
      travelMode: 'DRIVING'
    },
    routes: [route],
    status: 'OK'
  };
};

MapquestDirections.generateOverviewPath = function(decimals) {
  var path = [];
  var lat;
  _.each(decimals, function(decimal, i) {
    if(i % 2 == 0) {
      lat = decimal;
    } else {
      path.push(new google.maps.LatLng(lat, decimal));
    }
  });

  return path;
};

MapquestDirections.generateGoogleSteps = function(maneuvers, pathIndexes, overviewPath) {
  return _.map(maneuvers, function(maneuver, i) {
    var startIndex = pathIndexes[i] / 2,
        stopIndex = (pathIndexes[i + 1] - 2) / 2,
        chunk = _.filter(overviewPath, function(latLng, i) {
          return startIndex <= i && i <= (stopIndex || overviewPath.length);
        });

    return {
      duration: { value: maneuver.time },
      distance: { value: maneuver.distance * 1609.344 },  // mi => m
      instructions: maneuver.narrative,
      travel_mode: maneuver.transportMode,
      path: chunk
    };
  });
};

MapquestDirections.generateBounds = function(boundingBox) {
  var southWest = new google.maps.LatLng(boundingBox.lr.lat, boundingBox.ul.lng),
      northEast = new google.maps.LatLng(boundingBox.ul.lat, boundingBox.lr.lng);

  return new google.maps.LatLngBounds(southWest, northEast);
};


// Events

MapquestDirections.events.processMapquest = function(directions, callback) {
  return function(err, route) {
    if(err) return callback(err, directions);
    if(route.info.statuscode >= 400)
      return callback(new Error('No viable transit route.'), directions);

    var directionsRoute = MapquestDirections.translateRoute(route);
    directions.storeRoute(directionsRoute);

    err = null;
    if(directions.isAllWalkingSegments()) {
      err = new MapquestDirections.AllWalkingSegmentsError('Invalid Mapquest route: all segments are walking segments');
    }
    callback(err, directions);
  };
};

});

require.define("/node_modules/cm1-route/lib/mapquest-api.js", function (require, module, exports, __dirname, __filename) {
var http = require('http'),
    JSON = require('JSON'),
    querystring = require('querystring');

var MapquestApi = {
  fetch: function(from, to, callback) {
    var query = querystring.stringify({
      from: from, to: to
    });
    var request = http.request({
      path: '/mapquest?' + query,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, function (response) {
      if(response.statusCode >= 300) {
        callback(new Error('HTTP request for Hopstop failed: ' + response.statusCode));
      } else {
        var data = '';
        response.on('data', function (buf) {
          data += buf;
        });
        response.on('error', function() { callback('HTTP request for Hopstop failed: ' + data) });

        response.on('end', function () {
          var json = JSON.parse(data);
          callback(null, json);
        });
      }
    });
    request.end();
  }
};

module.exports = MapquestApi;

});

require.define("/node_modules/cm1-route/lib/directions/hop-stop-directions.js", function (require, module, exports, __dirname, __filename) {
var _ = require('underscore');

var Directions = require('../directions'),
    DirectionsEvents = require('../directions-events'),
    DirectBusDirections = require('./direct-bus-directions'),
    DirectRailDirections = require('./direct-rail-directions'),
    GoogleDirectionsRoute = require('./google-directions-route'),
    HootrootApi = require('../hootroot-api'),
    WalkingSegment = require('../segment/walking-segment');
var async = require('async');

var HopStopDirections = function(origin, destination, mode, when) {
  this.origin = origin;
  this.destination = destination;
  this.mode = mode || 'PUBLICTRANSIT';
  this.when = when || 'now';
  this.geocoder = new google.maps.Geocoder();
  this.parameters = {};
}
HopStopDirections.prototype = new Directions;

HopStopDirections.AllWalkingSegmentsError = function(message) {
  this.prototype = Error.prototype;
  this.name = 'AllWalkingSegmentsError';
  this.message = (message) ? message : 'All segments are walking segments';
};

HopStopDirections.events = new DirectionsEvents();

HopStopDirections.shouldDefaultTransitToDirectRoute = function(err) {
  err = err ? err : false;
  var walkingError = (err && err.name == 'AllWalkingSegmentsError'),
      hopStopError = (err && err.name == 'HopStopError');
  return ((walkingError || hopStopError) && process.env.TRANSIT_DIRECT_DEFAULT.toString() == 'true');
};

HopStopDirections.prototype.route = function(callback) {
  var directions = this;

  if(this.mode == 'SUBWAYING')
    callback = HopStopDirections.events.railFallbackCallback(callback);
  else if(this.mode == 'BUSSING')
    callback = HopStopDirections.events.busFallbackCallback(callback);

  async.parallel({
    origin: HopStopDirections.events.geocode(this, 'origin', 'originLatLng'),
    destination: HopStopDirections.events.geocode(this, 'destination', 'destinationLatLng')
  }, function(err, geocodes) {
    if(err) callback(err, directions);

    directions.fetchHopStop(callback);
  });
};

HopStopDirections.prototype.params = function() {
  return {
    x1: this.originLatLng.lng(), 
    y1: this.originLatLng.lat(), 
    x2: this.destinationLatLng.lng(), 
    y2: this.destinationLatLng.lat(), 
    mode: this.mode,
    when: this.when
  };
};

HopStopDirections.prototype.fetchHopStop = function(callback) {
  HootrootApi.hopstop(this.params(),
    HopStopDirections.events.processHopStop(this, callback));
};

HopStopDirections.prototype.calculateDistance = function() {
  this.distanceInMeters = google.maps.geometry.spherical.
    computeDistanceBetween(this.originLatLng, this.destinationLatLng);
  this.distance = this.distanceInMeters / 1000;
};

HopStopDirections.translateRoute = function(hopstopData) {
  var route = {
    hopstopData: hopstopData,
    copyrights: 'Copyright HopStop.com, Inc.',
    overview_path: HopStopDirections.generateOverviewPath(hopstopData.steps)
  };
  route.legs = [{
    duration: { value: hopstopData.duration },
    start_address: '',
    start_location: route.overview_path[0],
    end_address: '',
    end_location: route.overview_path[route.overview_path.length - 1],
    steps: HopStopDirections.generateGoogleSteps(hopstopData.steps),
    via_waypoints: []
  }];
  route.warnings = [];
  route.bounds = GoogleDirectionsRoute.generateBounds(route.overview_path);

  return { routes: [route] };
};

HopStopDirections.generateOverviewPath = function(steps) {
  var path = [];
  _.each(steps, function(step) {
    if(step.start_location) {
      var startLatLng = new google.maps.LatLng(
        step.start_location.lat, step.start_location.lon );
      path.push(startLatLng);
      var endLatLng = new google.maps.LatLng(
          step.end_location.lat, step.end_location.lon);
      path.push(endLatLng);
    }
  });

  return path;
};

HopStopDirections.generateGoogleSteps = function(steps) {
  var googleSteps = [];

  _.each(steps, function(step) {
    var googleStep = {};

    googleStep.duration = step.duration;
    googleStep.instructions = step.instructions;
    googleStep.travel_mode = step.travel_mode;
    googleStep.path = [];

    if(step.start_location) {
      googleStep.start_location = new google.maps.LatLng(step.start_location.lat, step.start_location.lon);
      googleStep.path.push(googleStep.start_location);
    }
    if(step.end_location) {
      googleStep.end_location = new google.maps.LatLng(step.end_location.lat, step.end_location.lon);
      googleStep.path.push(googleStep.end_location);
    }

    googleSteps.push(googleStep);
  });

  return googleSteps;
};


// Events

HopStopDirections.events.processHopStop = function(directions, callback) {
  return function(err, results) {
    if(err) return callback(err, directions);

    directions.storeRoute(HopStopDirections.translateRoute(results));

    err = null;
    if(directions.isAllWalkingSegments()) {
      err = new HopStopDirections.AllWalkingSegmentsError('Invalid Hopstop route: all segments are walking segments');
    }
    callback(err, directions);
  };
};

HopStopDirections.events.railFallbackCallback = function(callback) {
  return function(err, hopStopDirections) {
    if(HopStopDirections.shouldDefaultTransitToDirectRoute(err)) {
      console.log('falling back to direct rail');
      var directDirections = new DirectRailDirections(
          hopStopDirections.origin, hopStopDirections.destination);
      directDirections.route(
        HopStopDirections.events.copyRoutedDirections(hopStopDirections, callback));
    } else {
      callback(err, hopStopDirections);
    }
  };
};

HopStopDirections.events.busFallbackCallback = function(callback) {
  return function(err, hopStopDirections) {
    if(HopStopDirections.shouldDefaultTransitToDirectRoute(err)) {
      console.log('falling back to google directions for bus');
      var drivingDirections = new DirectBusDirections(
          hopStopDirections.origin, hopStopDirections.destination);
      drivingDirections.route(
        HopStopDirections.events.copyRoutedDirections(hopStopDirections, callback));
    } else {
      callback(err, hopStopDirections);
    }
  };
};

HopStopDirections.events.copyRoutedDirections = function(originalDirections, callback) {
  return function(err, newDirections) {
    if(err) return callback(err, newDirections);

    originalDirections.storeRoute(newDirections.directionsResult);
    callback(null, originalDirections);
  };
};

module.exports = HopStopDirections;

});

require.define("/node_modules/cm1-route/lib/directions/direct-bus-directions.js", function (require, module, exports, __dirname, __filename) {
var Directions = require('../directions'),
    DirectionsEvents = require('../directions-events'),
    GoogleDirectionsRoute = require('./google-directions-route'),
    NumberFormatter = require('../number-formatter');

var async = require('async');

var DirectBusDirections = function(origin, destination) {
  this.origin = origin;
  this.destination = destination;
  this.mode = 'BUSSING';
  this.geocoder = new google.maps.Geocoder();
  this.parameters = {};
}
DirectBusDirections.prototype = new Directions();

DirectBusDirections.events = new DirectionsEvents;

DirectBusDirections.prototype.route = function (callback) {
  async.parallel({
    origin: DirectBusDirections.events.geocode(this, 'origin', 'originLatLng'),
    destination: DirectBusDirections.events.geocode(this, 'destination', 'destinationLatLng')
  }, DirectBusDirections.events.onGeocodeFinish(this, callback));
};

DirectBusDirections.prototype.calculateDistance = function() {
  this.distanceInMeters = google.maps.geometry.spherical.
    computeDistanceBetween(this.originLatLng, this.destinationLatLng);
  this.distance = this.distanceInMeters / 1000;
};

DirectBusDirections.prototype.duration = function() {
  var rate = 0.0008067;  // that's like 55mph
  return rate * this.distance;
};

DirectBusDirections.prototype.totalTime = function() {
  return TimeFormatter.format(this.duration());
};


// Events

DirectBusDirections.events.onGeocodeFinish = function(directions, callback) {
  return function(err) {
    if(err) return callback(err, directions);

    directions.calculateDistance();

    var steps = [{
      travel_mode: 'BUSSING',
      distance: { value: directions.distanceInMeters },
      duration: { value: directions.duration() },
      instructions: NumberFormatter.metersToMiles(directions.distanceInMeters) + ' mile bus trip',
      start_location: directions.originLatLng,
      end_location: directions.destinationLatLng
    }];

    var route = {
      overview_path: [directions.originLatLng, directions.destinationLatLng],
      legs: [{
        duration: { value: directions.duration() },
        distance: { value: directions.distanceInMeters },
        steps: steps
      }],
      warnings: []
    };
    route.bounds = GoogleDirectionsRoute.generateBounds(route.overview_path);

    var directionsResult = { routes: [route]};
    directions.storeRoute(directionsResult);

    callback(null, directions);
  };
};

module.exports = DirectBusDirections;

});

require.define("/node_modules/cm1-route/lib/directions/direct-rail-directions.js", function (require, module, exports, __dirname, __filename) {
var Directions = require('../directions'),
    DirectionsEvents = require('../directions-events'),
    GoogleDirectionsRoute = require('./google-directions-route'),
    NumberFormatter = require('../number-formatter');

var async = require('async');

var DirectRailDirections = function(origin, destination) {
  this.origin = origin;
  this.destination = destination;
  this.mode = 'SUBWAYING';
  this.geocoder = new google.maps.Geocoder();
  this.parameters = {};
}
DirectRailDirections.prototype = new Directions();

DirectRailDirections.events = new DirectionsEvents;

DirectRailDirections.prototype.route = function (callback) {
  async.parallel({
    origin: DirectRailDirections.events.geocode(this, 'origin', 'originLatLng'),
    destination: DirectRailDirections.events.geocode(this, 'destination', 'destinationLatLng')
  }, DirectRailDirections.events.onGeocodeFinish(this, callback));
};

DirectRailDirections.prototype.calculateDistance = function() {
  this.distanceInMeters = google.maps.geometry.spherical.
    computeDistanceBetween(this.originLatLng, this.destinationLatLng);
  this.distance = this.distanceInMeters / 1000;
};

DirectRailDirections.prototype.duration = function() {
  var rate = 0.0011;  // that's like 75mph
  return rate * this.distance;
}

DirectRailDirections.prototype.totalTime = function() {
  return TimeFormatter.format(this.duration());
};


// Events

DirectRailDirections.events.onGeocodeFinish = function(directions, callback) {
  return function(err) {
    if(err) return callback(err, directions);

    directions.calculateDistance();

    var steps = [{
      travel_mode: 'AMTRAKING',
      distance: { value: directions.distanceInMeters },
      duration: { value: directions.duration() },
      instructions: NumberFormatter.metersToMiles(directions.distance) + ' km rail trip',
      start_location: directions.originLatLng,
      end_location: directions.destinationLatLng
    }];

    var route = {
      overview_path: [directions.originLatLng, directions.destinationLatLng],
      legs: [{
        duration: { value: directions.duration() },
        distance: { value: directions.distanceInMeters },
        steps: steps
      }],
      warnings: []
    };
    route.bounds = GoogleDirectionsRoute.generateBounds(route.overview_path);

    var directionsResult = { routes: [route]};
    directions.storeRoute(directionsResult);

    callback(null, directions);
  };
};

module.exports = DirectRailDirections;

});

require.define("/node_modules/cm1-route/lib/hootroot-api.js", function (require, module, exports, __dirname, __filename) {
var http = require('http');

var HootrootApi = {};

HootrootApi.HopStopError = function(message) {
  this.prototype = Error.prototype;
  this.name = 'HopStopError';
  this.message = message;
};

HootrootApi.hopstop = function(params, callback) {
  var query  = '?x1=' + params.x1;
      query += '&y1=' + params.y1;
      query += '&x2=' + params.x2;
      query += '&y2=' + params.y2;
      query += '&mode=' + params.mode;
      query += '&when=' + params.when;
  var request = http.request({
    host: 'cm1-route.brighterplanet.com', port: 80, path: '/hopstops' + query,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  }, function (response) {
    if(response.statusCode >= 300) {
      callback(new HootrootApi.HopStopError('Hopstop routing failed: ' + response.statusCode));
    } else {
      var data = '';
      response.on('data', function (buf) {
        data += buf;
      });
      response.on('error', function() {
        callback(new HootrootApi.HopStopError('Hopstop routing failed: ' + data));
      });

      response.on('end', function () {
        var json = JSON.parse(data);
        callback(null, json);
      });
    }
  });
  request.end();
};

module.exports = HootrootApi;

});

require.define("/lib/google.js", function (require, module, exports, __dirname, __filename) {
if(typeof google == 'undefined') {
  module.exports = Google = {
    maps: {
      DirectionsRenderer: function() {}
    }
  };
} else {
  module.exports = Google = google;
}


});

require.define("/models/flight-path.js", function (require, module, exports, __dirname, __filename) {
var Google = require('../lib/google');

var FlightPath = module.exports = function(controller, directions) {
  this.controller = controller;
  this.directions = directions;
};

FlightPath.prototype.originLatLng = function() {
  return this.directions.originLatLng;
}
FlightPath.prototype.destinationLatLng = function() {
  return this.directions.destinationLatLng;
}

FlightPath.prototype.polyLine = function() {
  if(!this._polyLine && this.originLatLng() && this.destinationLatLng()) {
    this._polyLine = new Google.maps.Polyline({
      path: [this.originLatLng(),this.destinationLatLng()],
      geodesic: true,
      strokeColor: '#89E',
      strokeWeight: 4,
      strokeOpacity: 0.85
    });
  }

  return this._polyLine;
};

FlightPath.prototype.markers = function() {
  if(!this._markers && this.originLatLng() && this.destinationLatLng()) {
    this._markers = [];
    this._markers.push(new Google.maps.Marker({ position: this.originLatLng(), icon: 'http://maps.gstatic.com/intl/en_us/mapfiles/marker_greenA.png' }));
    this._markers.push(new Google.maps.Marker({ position: this.destinationLatLng(), icon: 'http://maps.gstatic.com/intl/en_us/mapfiles/marker_greenB.png' }));
  }

  return this._markers;
};

FlightPath.prototype.display = function() {
  this.polyLine().setMap(this.controller.mapView.googleMap);
  for(var i in this.markers()) {
    this.markers()[i].setMap(this.controller.mapView.googleMap);
  }
};
FlightPath.prototype.hide = function() {
  if(this.polyLine())
    this.polyLine().setMap(null);
  for(var i in this.markers()) {
    this.markers()[i].setMap(null);
  }
};


});

require.define("/controllers/hoot-bar-controller.js", function (require, module, exports, __dirname, __filename) {
var $ = require('qwery'),
    ajax = require('reqwest'),
    dom = require('bonzo'),
    events = require('bean'),
    morpheus = require('morpheus'),
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
    var about = $$('#about');
    if(about.css('display') == 'none') {
      about.show();
      morpheus($('#about')[0], { opacity: '+=1' });
    } else {
      morpheus($('#about')[0], { opacity: '-=1', complete: function() {
        about.hide();
      }});
    }
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
      controller.indexController.fadeOutModes();
      return false;
    };
  }
};

module.exports = HootBarController;

});

require.define("/node_modules/reqwest/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"./reqwest.js"}
});

require.define("/node_modules/reqwest/reqwest.js", function (require, module, exports, __dirname, __filename) {
/*!
  * Reqwest! A general purpose XHR connection manager
  * (c) Dustin Diaz 2011
  * https://github.com/ded/reqwest
  * license MIT
  */
!function (name, definition) {
  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(name, definition)
  else this[name] = definition()
}('reqwest', function () {

  var context = this
    , win = window
    , doc = document
    , old = context.reqwest
    , twoHundo = /^20\d$/
    , byTag = 'getElementsByTagName'
    , readyState = 'readyState'
    , contentType = 'Content-Type'
    , requestedWith = 'X-Requested-With'
    , head = doc[byTag]('head')[0]
    , uniqid = 0
    , lastValue // data stored by the most recent JSONP callback
    , xmlHttpRequest = 'XMLHttpRequest'
    , isArray = typeof Array.isArray == 'function' ? Array.isArray : function (a) {
        return a instanceof Array
      }
    , defaultHeaders = {
          contentType: 'application/x-www-form-urlencoded'
        , accept: {
              '*':  'text/javascript, text/html, application/xml, text/xml, */*'
            , xml:  'application/xml, text/xml'
            , html: 'text/html'
            , text: 'text/plain'
            , json: 'application/json, text/javascript'
            , js:   'application/javascript, text/javascript'
          }
        , requestedWith: xmlHttpRequest
      }
    , xhr = win[xmlHttpRequest] ?
        function () {
          return new XMLHttpRequest()
        } :
        function () {
          return new ActiveXObject('Microsoft.XMLHTTP')
        }

  function handleReadyState(o, success, error) {
    return function () {
      if (o && o[readyState] == 4) {
        if (twoHundo.test(o.status)) {
          success(o)
        } else {
          error(o)
        }
      }
    }
  }

  function setHeaders(http, o) {
    var headers = o.headers || {}, h
    headers.Accept = headers.Accept || defaultHeaders.accept[o.type] || defaultHeaders.accept['*']
    // breaks cross-origin requests with legacy browsers
    if (!o.crossOrigin && !headers[requestedWith]) headers[requestedWith] = defaultHeaders.requestedWith
    if (!headers[contentType]) headers[contentType] = o.contentType || defaultHeaders.contentType
    for (h in headers) {
      headers.hasOwnProperty(h) && http.setRequestHeader(h, headers[h])
    }
  }

  function generalCallback(data) {
    lastValue = data
  }

  function urlappend(url, s) {
    return url + (/\?/.test(url) ? '&' : '?') + s
  }

  function handleJsonp(o, fn, err, url) {
    var reqId = uniqid++
      , cbkey = o.jsonpCallback || 'callback' // the 'callback' key
      , cbval = o.jsonpCallbackName || ('reqwest_' + reqId) // the 'callback' value
      , cbreg = new RegExp('((^|\\?|&)' + cbkey + ')=([^&]+)')
      , match = url.match(cbreg)
      , script = doc.createElement('script')
      , loaded = 0

    if (match) {
      if (match[3] === '?') {
        url = url.replace(cbreg, '$1=' + cbval) // wildcard callback func name
      } else {
        cbval = match[3] // provided callback func name
      }
    } else {
      url = urlappend(url, cbkey + '=' + cbval) // no callback details, add 'em
    }

    win[cbval] = generalCallback

    script.type = 'text/javascript'
    script.src = url
    script.async = true
    if (typeof script.onreadystatechange !== 'undefined') {
        // need this for IE due to out-of-order onreadystatechange(), binding script
        // execution to an event listener gives us control over when the script
        // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
        script.event = 'onclick'
        script.htmlFor = script.id = '_reqwest_' + reqId
    }

    script.onload = script.onreadystatechange = function () {
      if ((script[readyState] && script[readyState] !== 'complete' && script[readyState] !== 'loaded') || loaded) {
        return false
      }
      script.onload = script.onreadystatechange = null
      script.onclick && script.onclick()
      // Call the user callback with the last value stored and clean up values and scripts.
      o.success && o.success(lastValue)
      lastValue = undefined
      head.removeChild(script)
      loaded = 1
    }

    // Add the script to the DOM head
    head.appendChild(script)
  }

  function getRequest(o, fn, err) {
    var method = (o.method || 'GET').toUpperCase()
      , url = typeof o === 'string' ? o : o.url
      // convert non-string objects to query-string form unless o.processData is false
      , data = (o.processData !== false && o.data && typeof o.data !== 'string')
        ? reqwest.toQueryString(o.data)
        : (o.data || null)
      , http

    // if we're working on a GET request and we have data then we should append
    // query string to end of URL and not post data
    if ((o.type == 'jsonp' || method == 'GET') && data) {
      url = urlappend(url, data)
      data = null
    }

    if (o.type == 'jsonp') return handleJsonp(o, fn, err, url)

    http = xhr()
    http.open(method, url, true)
    setHeaders(http, o)
    http.onreadystatechange = handleReadyState(http, fn, err)
    o.before && o.before(http)
    http.send(data)
    return http
  }

  function Reqwest(o, fn) {
    this.o = o
    this.fn = fn
    init.apply(this, arguments)
  }

  function setType(url) {
    var m = url.match(/\.(json|jsonp|html|xml)(\?|$)/)
    return m ? m[1] : 'js'
  }

  function init(o, fn) {
    this.url = typeof o == 'string' ? o : o.url
    this.timeout = null
    var type = o.type || setType(this.url)
      , self = this
    fn = fn || function () {}

    if (o.timeout) {
      this.timeout = setTimeout(function () {
        self.abort()
      }, o.timeout)
    }

    function complete(resp) {
      o.timeout && clearTimeout(self.timeout)
      self.timeout = null
      o.complete && o.complete(resp)
    }

    function success(resp) {
      var r = resp.responseText
      if (r) {
        switch (type) {
        case 'json':
          try {
            resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')')
          } catch (err) {
            return error(resp, 'Could not parse JSON in response', err)
          }
          break;
        case 'js':
          resp = eval(r)
          break;
        case 'html':
          resp = r
          break;
        }
      }

      fn(resp)
      o.success && o.success(resp)

      complete(resp)
    }

    function error(resp, msg, t) {
      o.error && o.error(resp, msg, t)
      complete(resp)
    }

    this.request = getRequest(o, success, error)
  }

  Reqwest.prototype = {
    abort: function () {
      this.request.abort()
    }

  , retry: function () {
      init.call(this, this.o, this.fn)
    }
  }

  function reqwest(o, fn) {
    return new Reqwest(o, fn)
  }

  // normalize newline variants according to spec -> CRLF
  function normalize(s) {
    return s ? s.replace(/\r?\n/g, '\r\n') : ''
  }

  function serial(el, cb) {
    var n = el.name
      , t = el.tagName.toLowerCase()
      , optCb = function(o) {
          // IE gives value="" even where there is no value attribute
          // 'specified' ref: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-862529273
          if (o && !o.disabled)
            cb(n, normalize(o.attributes.value && o.attributes.value.specified ? o.value : o.text))
        }

    // don't serialize elements that are disabled or without a name
    if (el.disabled || !n) return;

    switch (t) {
    case 'input':
      if (!/reset|button|image|file/i.test(el.type)) {
        var ch = /checkbox/i.test(el.type)
          , ra = /radio/i.test(el.type)
          , val = el.value;
        // WebKit gives us "" instead of "on" if a checkbox has no value, so correct it here
        (!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
      }
      break;
    case 'textarea':
      cb(n, normalize(el.value))
      break;
    case 'select':
      if (el.type.toLowerCase() === 'select-one') {
        optCb(el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null)
      } else {
        for (var i = 0; el.length && i < el.length; i++) {
          el.options[i].selected && optCb(el.options[i])
        }
      }
      break;
    }
  }

  // collect up all form elements found from the passed argument elements all
  // the way down to child elements; pass a '<form>' or form fields.
  // called with 'this'=callback to use for serial() on each element
  function eachFormElement() {
    var cb = this
      , e, i, j
      , serializeSubtags = function(e, tags) {
        for (var i = 0; i < tags.length; i++) {
          var fa = e[byTag](tags[i])
          for (j = 0; j < fa.length; j++) serial(fa[j], cb)
        }
      }

    for (i = 0; i < arguments.length; i++) {
      e = arguments[i]
      if (/input|select|textarea/i.test(e.tagName)) serial(e, cb)
      serializeSubtags(e, [ 'input', 'select', 'textarea' ])
    }
  }

  // standard query string style serialization
  function serializeQueryString() {
    return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
  }

  // { 'name': 'value', ... } style serialization
  function serializeHash() {
    var hash = {}
    eachFormElement.apply(function (name, value) {
      if (name in hash) {
        hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
        hash[name].push(value)
      } else hash[name] = value
    }, arguments)
    return hash
  }

  // [ { name: 'name', value: 'value' }, ... ] style serialization
  reqwest.serializeArray = function () {
    var arr = []
    eachFormElement.apply(function(name, value) {
      arr.push({name: name, value: value})
    }, arguments)
    return arr
  }

  reqwest.serialize = function () {
    if (arguments.length === 0) return ''
    var opt, fn
      , args = Array.prototype.slice.call(arguments, 0)

    opt = args.pop()
    opt && opt.nodeType && args.push(opt) && (opt = null)
    opt && (opt = opt.type)

    if (opt == 'map') fn = serializeHash
    else if (opt == 'array') fn = reqwest.serializeArray
    else fn = serializeQueryString

    return fn.apply(null, args)
  }

  reqwest.toQueryString = function (o) {
    var qs = '', i
      , enc = encodeURIComponent
      , push = function (k, v) {
          qs += enc(k) + '=' + enc(v) + '&'
        }

    if (isArray(o)) {
      for (i = 0; o && i < o.length; i++) push(o[i].name, o[i].value)
    } else {
      for (var k in o) {
        if (!Object.hasOwnProperty.call(o, k)) continue;
        var v = o[k]
        if (isArray(v)) {
          for (i = 0; i < v.length; i++) push(k, v[i])
        } else push(k, o[k])
      }
    }

    // spaces should be + according to spec
    return qs.replace(/&$/, '').replace(/%20/g,'+')
  }

  // jQuery and Zepto compatibility, differences can be remapped here so you can call
  // .ajax.compat(options, callback)
  reqwest.compat = function (o, fn) {
    if (o) {
      o.type && (o.method = o.type) && delete o.type
      o.dataType && (o.type = o.dataType)
      o.jsonpCallback && (o.jsonpCallbackName = o.jsonpCallback) && delete o.jsonpCallback
      o.jsonp && (o.jsonpCallback = o.jsonp)
    }
    return new Reqwest(o, fn)
  }

  return reqwest
})

});

require.define("/views/map-view.js", function (require, module, exports, __dirname, __filename) {
var $ = require('qwery'),
    bonzo = require('bonzo'),
    Google = require('../lib/google');

var MapView = module.exports = function(mapId) {
  this.mapId = mapId;
  var ll = new Google.maps.LatLng(39.57, -97.82);
  this.options = {
    zoom: 4,
    center: ll,
    mapTypeId: Google.maps.MapTypeId.ROADMAP,
    scaleControl: true,
    scaleControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    }
  };

  this.canvas = $(this.mapId);
  this.googleMap = new Google.maps.Map(this.canvas[0], this.options);

  return true;
}

MapView.prototype.resize = function() {
  bonzo(this.canvas).css({
    width: '100%',
    height: '100%'
  });
}

});

require.define("/views/route-view.js", function (require, module, exports, __dirname, __filename) {
var $ = require('qwery'),
    events = require('bean'),
    dom = require('bonzo'),
    $$ = function(selector, parent) { return dom($(selector, parent)); };

var NumberFormatter = require('cm1-route').Cm1Route.NumberFormatter;

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

});

require.define("/lib/spi.js", function (require, module, exports, __dirname, __filename) {
var url = require('url');

var SPI = module.exports = function(urlString) {
  this.urlString = urlString;
  this.url = url.parse(this.urlString, true);
  this.path = this.parseSpiPath();
  this.origin = this.getSpiPathParameter('from');
  this.destination = this.getSpiPathParameter('to');
};

SPI.current = function() {
  return new SPI(window.location.href);
};

SPI.generate = function(from, to) {
  var currentSpi = SPI.current();
  var newUrl = currentSpi.url.protocol + '//' +
               currentSpi.url.host +
               currentSpi.url.pathname +
               '#!/from/' + encodeURIComponent(from) +
               '/to/' + encodeURIComponent(to);
  return new SPI(newUrl);
};

SPI.go = function(destination) {
  document.location.href = destination;
};

SPI.prototype.parseSpiPath = function() {
  if(/#!/.test(this.url.hash)) {
    return decodeURIComponent(this.url.hash.substr(2));
  } else {
    return null;
  }
};

SPI.prototype.getSpiPathParameter = function(name) {
  if(this.path) {
    var parts = this.path.split('/');
    if(parts[0] == '') parts.shift();
    i = 0;
    while(i + 1 <= parts.length) {
      var part_name = parts[i];
      if(part_name == name) {
        return parts[i + 1];
      }
      i += 2;
    }
  }
  return null;
};

});

require.define("url", function (require, module, exports, __dirname, __filename) {
var punycode = { encode : function (s) { return s } };

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

function arrayIndexOf(array, subject) {
    for (var i = 0, j = array.length; i < j; i++) {
        if(array[i] == subject) return i;
    }
    return -1;
}

var objectKeys = Object.keys || function objectKeys(object) {
    if (object !== Object(object)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in object) if (object.hasOwnProperty(key)) keys[keys.length] = key;
    return keys;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]+$/,
    // RFC 2396: characters reserved for delimiting URLs.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],
    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '~', '[', ']', '`'].concat(delims),
    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''],
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#']
      .concat(unwise).concat(autoEscape),
    nonAuthChars = ['/', '@', '?', '#'].concat(delims),
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-zA-Z0-9][a-z0-9A-Z_-]{0,62}$/,
    hostnamePartStart = /^([a-zA-Z0-9][a-z0-9A-Z_-]{0,62})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always have a path component.
    pathedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && typeof(url) === 'object' && url.href) return url;

  if (typeof url !== 'string') {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var out = {},
      rest = url;

  // cut off any delimiters.
  // This is to support parse stuff like "<http://foo.com>"
  for (var i = 0, l = rest.length; i < l; i++) {
    if (arrayIndexOf(delims, rest.charAt(i)) === -1) break;
  }
  if (i !== 0) rest = rest.substr(i);


  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    out.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      out.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {
    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    // don't enforce full RFC correctness, just be unstupid about it.

    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the first @ sign, unless some non-auth character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    var atSign = arrayIndexOf(rest, '@');
    if (atSign !== -1) {
      // there *may be* an auth
      var hasAuth = true;
      for (var i = 0, l = nonAuthChars.length; i < l; i++) {
        var index = arrayIndexOf(rest, nonAuthChars[i]);
        if (index !== -1 && index < atSign) {
          // not a valid auth.  Something like http://foo.com/bar@baz/
          hasAuth = false;
          break;
        }
      }
      if (hasAuth) {
        // pluck off the auth portion.
        out.auth = rest.substr(0, atSign);
        rest = rest.substr(atSign + 1);
      }
    }

    var firstNonHost = -1;
    for (var i = 0, l = nonHostChars.length; i < l; i++) {
      var index = arrayIndexOf(rest, nonHostChars[i]);
      if (index !== -1 &&
          (firstNonHost < 0 || index < firstNonHost)) firstNonHost = index;
    }

    if (firstNonHost !== -1) {
      out.host = rest.substr(0, firstNonHost);
      rest = rest.substr(firstNonHost);
    } else {
      out.host = rest;
      rest = '';
    }

    // pull out port.
    var p = parseHost(out.host);
    var keys = objectKeys(p);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      out[key] = p[key];
    }

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    out.hostname = out.hostname || '';

    // validate a little.
    if (out.hostname.length > hostnameMaxLen) {
      out.hostname = '';
    } else {
      var hostparts = out.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            out.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    // hostnames are always lower case.
    out.hostname = out.hostname.toLowerCase();

    // IDNA Support: Returns a puny coded representation of "domain".
    // It only converts the part of the domain name that
    // has non ASCII characters. I.e. it dosent matter if
    // you call it with a domain that already is in ASCII.
    var domainArray = out.hostname.split('.');
    var newOut = [];
    for (var i = 0; i < domainArray.length; ++i) {
      var s = domainArray[i];
      newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
          'xn--' + punycode.encode(s) : s);
    }
    out.hostname = newOut.join('.');

    out.host = (out.hostname || '') +
        ((out.port) ? ':' + out.port : '');
    out.href += out.host;
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }

    // Now make sure that delims never appear in a url.
    var chop = rest.length;
    for (var i = 0, l = delims.length; i < l; i++) {
      var c = arrayIndexOf(rest, delims[i]);
      if (c !== -1) {
        chop = Math.min(c, chop);
      }
    }
    rest = rest.substr(0, chop);
  }


  // chop off from the tail first.
  var hash = arrayIndexOf(rest, '#');
  if (hash !== -1) {
    // got a fragment string.
    out.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = arrayIndexOf(rest, '?');
  if (qm !== -1) {
    out.search = rest.substr(qm);
    out.query = rest.substr(qm + 1);
    if (parseQueryString) {
      out.query = querystring.parse(out.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    out.search = '';
    out.query = {};
  }
  if (rest) out.pathname = rest;
  if (slashedProtocol[proto] &&
      out.hostname && !out.pathname) {
    out.pathname = '/';
  }

  //to support http.request
  if (out.pathname || out.search) {
    out.path = (out.pathname ? out.pathname : '') +
               (out.search ? out.search : '');
  }

  // finally, reconstruct the href based on what has been validated.
  out.href = urlFormat(out);
  return out;
}

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (typeof(obj) === 'string') obj = urlParse(obj);

  var auth = obj.auth || '';
  if (auth) {
    auth = auth.split('@').join('%40');
    for (var i = 0, l = nonAuthChars.length; i < l; i++) {
      var nAC = nonAuthChars[i];
      auth = auth.split(nAC).join(encodeURIComponent(nAC));
    }
    auth += '@';
  }

  var protocol = obj.protocol || '',
      host = (obj.host !== undefined) ? auth + obj.host :
          obj.hostname !== undefined ? (
              auth + obj.hostname +
              (obj.port ? ':' + obj.port : '')
          ) :
          false,
      pathname = obj.pathname || '',
      query = obj.query &&
              ((typeof obj.query === 'object' &&
                objectKeys(obj.query).length) ?
                 querystring.stringify(obj.query) :
                 '') || '',
      search = obj.search || (query && ('?' + query)) || '',
      hash = obj.hash || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (obj.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  return protocol + host + pathname + search + hash;
}

function urlResolve(source, relative) {
  return urlFormat(urlResolveObject(source, relative));
}

function urlResolveObject(source, relative) {
  if (!source) return relative;

  source = urlParse(urlFormat(source), false, true);
  relative = urlParse(urlFormat(relative), false, true);

  // hash is always overridden, no matter what.
  source.hash = relative.hash;

  if (relative.href === '') {
    source.href = urlFormat(source);
    return source;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    relative.protocol = source.protocol;
    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[relative.protocol] &&
        relative.hostname && !relative.pathname) {
      relative.path = relative.pathname = '/';
    }
    relative.href = urlFormat(relative);
    return relative;
  }

  if (relative.protocol && relative.protocol !== source.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      relative.href = urlFormat(relative);
      return relative;
    }
    source.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      relative.pathname = relPath.join('/');
    }
    source.pathname = relative.pathname;
    source.search = relative.search;
    source.query = relative.query;
    source.host = relative.host || '';
    source.auth = relative.auth;
    source.hostname = relative.hostname || relative.host;
    source.port = relative.port;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.slashes = source.slashes || relative.slashes;
    source.href = urlFormat(source);
    return source;
  }

  var isSourceAbs = (source.pathname && source.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host !== undefined ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (source.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = source.pathname && source.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = source.protocol &&
          !slashedProtocol[source.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // source.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {

    delete source.hostname;
    delete source.port;
    if (source.host) {
      if (srcPath[0] === '') srcPath[0] = source.host;
      else srcPath.unshift(source.host);
    }
    delete source.host;
    if (relative.protocol) {
      delete relative.hostname;
      delete relative.port;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      delete relative.host;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    source.host = (relative.host || relative.host === '') ?
                      relative.host : source.host;
    source.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : source.hostname;
    source.search = relative.search;
    source.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    source.search = relative.search;
    source.query = relative.query;
  } else if ('search' in relative) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      source.hostname = source.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = source.host && arrayIndexOf(source.host, '@') > 0 ?
                       source.host.split('@') : false;
      if (authInHost) {
        source.auth = authInHost.shift();
        source.host = source.hostname = authInHost.shift();
      }
    }
    source.search = relative.search;
    source.query = relative.query;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.href = urlFormat(source);
    return source;
  }
  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    delete source.pathname;
    //to support http.request
    if (!source.search) {
      source.path = '/' + source.search;
    } else {
      delete source.path;
    }
    source.href = urlFormat(source);
    return source;
  }
  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (source.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    source.hostname = source.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = source.host && arrayIndexOf(source.host, '@') > 0 ?
                     source.host.split('@') : false;
    if (authInHost) {
      source.auth = authInHost.shift();
      source.host = source.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (source.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  source.pathname = srcPath.join('/');
  //to support request.http
  if (source.pathname !== undefined || source.search !== undefined) {
    source.path = (source.pathname ? source.pathname : '') +
                  (source.search ? source.search : '');
  }
  source.auth = relative.auth || source.auth;
  source.slashes = source.slashes || relative.slashes;
  source.href = urlFormat(source);
  return source;
}

function parseHost(host) {
  var out = {};
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    out.port = port.substr(1);
    host = host.substr(0, host.length - port.length);
  }
  if (host) out.hostname = host;
  return out;
}

});

require.alias("http-browserify", "/node_modules/http");

require.define("/application.js.tmp", function (require, module, exports, __dirname, __filename) {
    var domready = require('domready'),
    IndexController = require('./controllers/index-controller');

domready(function() {
  mc = new IndexController('#map_canvas');
  mc.init();
});

});
require("/application.js.tmp");
