var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}
var __require = require;

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
        var y = cwd || '.';
        
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
    
    var keys = Object_keys(require.modules);
    
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
    
    var require_ = function (file) { return require(file, dirname) };
    require_.resolve = function (name) {
      return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
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

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key)
    return res;
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = function (fn) {
    setTimeout(fn, 0);
};

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

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

require.define("/node_modules/jquery-browserify/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"jquery-browserify","description":"jQuery: The Write Less, Do More, JavaScript Library, packaged for browserify","url":"jquery.com","keywords":["util","dom","jquery"],"author":"John Resig <jeresig@gmail.com>","contributors":[],"dependencies":{},"lib":"lib","main":"./lib/jquery-1.6.2.js","version":"1.6.2","repository":"git://github.com/jmars/jquery-browserify.git","homepage":"http://www.jQuery.com","browserify":{"dependencies":"","main":"lib/jquery-1.6.2.js"}}
});

require.define("/node_modules/jquery-browserify/lib/jquery-1.6.2.js", function (require, module, exports, __dirname, __filename) {
    -function(){
  function create(){
    /*!
     * jQuery JavaScript Library v1.6.2
     * http://jquery.com/
     *
     * Copyright 2011, John Resig
     * Dual licensed under the MIT or GPL Version 2 licenses.
     * http://jquery.org/license
     *
     * Includes Sizzle.js
     * http://sizzlejs.com/
     * Copyright 2011, The Dojo Foundation
     * Released under the MIT, BSD, and GPL Licenses.
     *
     * Date: Thu Jun 30 14:16:56 2011 -0400
     */

    // Use the correct document accordingly with window argument (sandbox)
    var document = window.document,
    	navigator = window.navigator,
    	location = window.location;
    var jQuery = (function() {

    // Define a local copy of jQuery
    var jQuery = function( selector, context ) {
    		// The jQuery object is actually just the init constructor 'enhanced'
    		return new jQuery.fn.init( selector, context, rootjQuery );
    	},

    	// Map over jQuery in case of overwrite
    	_jQuery = window.jQuery,

    	// Map over the $ in case of overwrite
    	_$ = window.$,

    	// A central reference to the root jQuery(document)
    	rootjQuery,

    	// A simple way to check for HTML strings or ID strings
    	// (both of which we optimize for)
    	quickExpr = /^(?:[^<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,

    	// Check if a string has a non-whitespace character in it
    	rnotwhite = /\S/,

    	// Used for trimming whitespace
    	trimLeft = /^\s+/,
    	trimRight = /\s+$/,

    	// Check for digits
    	rdigit = /\d/,

    	// Match a standalone tag
    	rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>)?$/,

    	// JSON RegExp
    	rvalidchars = /^[\],:{}\s]*$/,
    	rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
    	rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
    	rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,

    	// Useragent RegExp
    	rwebkit = /(webkit)[ \/]([\w.]+)/,
    	ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/,
    	rmsie = /(msie) ([\w.]+)/,
    	rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/,

    	// Matches dashed string for camelizing
    	rdashAlpha = /-([a-z])/ig,

    	// Used by jQuery.camelCase as callback to replace()
    	fcamelCase = function( all, letter ) {
    		return letter.toUpperCase();
    	},

    	// Keep a UserAgent string for use with jQuery.browser
    	userAgent = navigator.userAgent,

    	// For matching the engine and version of the browser
    	browserMatch,

    	// The deferred used on DOM ready
    	readyList,

    	// The ready event handler
    	DOMContentLoaded,

    	// Save a reference to some core methods
    	toString = Object.prototype.toString,
    	hasOwn = Object.prototype.hasOwnProperty,
    	push = Array.prototype.push,
    	slice = Array.prototype.slice,
    	trim = String.prototype.trim,
    	indexOf = Array.prototype.indexOf,

    	// [[Class]] -> type pairs
    	class2type = {};

    jQuery.fn = jQuery.prototype = {
    	constructor: jQuery,
    	init: function( selector, context, rootjQuery ) {
    		var match, elem, ret, doc;

    		// Handle $(""), $(null), or $(undefined)
    		if ( !selector ) {
    			return this;
    		}

    		// Handle $(DOMElement)
    		if ( selector.nodeType ) {
    			this.context = this[0] = selector;
    			this.length = 1;
    			return this;
    		}

    		// The body element only exists once, optimize finding it
    		if ( selector === "body" && !context && document.body ) {
    			this.context = document;
    			this[0] = document.body;
    			this.selector = selector;
    			this.length = 1;
    			return this;
    		}

    		// Handle HTML strings
    		if ( typeof selector === "string" ) {
    			// Are we dealing with HTML string or an ID?
    			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
    				// Assume that strings that start and end with <> are HTML and skip the regex check
    				match = [ null, selector, null ];

    			} else {
    				match = quickExpr.exec( selector );
    			}

    			// Verify a match, and that no context was specified for #id
    			if ( match && (match[1] || !context) ) {

    				// HANDLE: $(html) -> $(array)
    				if ( match[1] ) {
    					context = context instanceof jQuery ? context[0] : context;
    					doc = (context ? context.ownerDocument || context : document);

    					// If a single string is passed in and it's a single tag
    					// just do a createElement and skip the rest
    					ret = rsingleTag.exec( selector );

    					if ( ret ) {
    						if ( jQuery.isPlainObject( context ) ) {
    							selector = [ document.createElement( ret[1] ) ];
    							jQuery.fn.attr.call( selector, context, true );

    						} else {
    							selector = [ doc.createElement( ret[1] ) ];
    						}

    					} else {
    						ret = jQuery.buildFragment( [ match[1] ], [ doc ] );
    						selector = (ret.cacheable ? jQuery.clone(ret.fragment) : ret.fragment).childNodes;
    					}

    					return jQuery.merge( this, selector );

    				// HANDLE: $("#id")
    				} else {
    					elem = document.getElementById( match[2] );

    					// Check parentNode to catch when Blackberry 4.6 returns
    					// nodes that are no longer in the document #6963
    					if ( elem && elem.parentNode ) {
    						// Handle the case where IE and Opera return items
    						// by name instead of ID
    						if ( elem.id !== match[2] ) {
    							return rootjQuery.find( selector );
    						}

    						// Otherwise, we inject the element directly into the jQuery object
    						this.length = 1;
    						this[0] = elem;
    					}

    					this.context = document;
    					this.selector = selector;
    					return this;
    				}

    			// HANDLE: $(expr, $(...))
    			} else if ( !context || context.jquery ) {
    				return (context || rootjQuery).find( selector );

    			// HANDLE: $(expr, context)
    			// (which is just equivalent to: $(context).find(expr)
    			} else {
    				return this.constructor( context ).find( selector );
    			}

    		// HANDLE: $(function)
    		// Shortcut for document ready
    		} else if ( jQuery.isFunction( selector ) ) {
    			return rootjQuery.ready( selector );
    		}

    		if (selector.selector !== undefined) {
    			this.selector = selector.selector;
    			this.context = selector.context;
    		}

    		return jQuery.makeArray( selector, this );
    	},

    	// Start with an empty selector
    	selector: "",

    	// The current version of jQuery being used
    	jquery: "1.6.2",

    	// The default length of a jQuery object is 0
    	length: 0,

    	// The number of elements contained in the matched element set
    	size: function() {
    		return this.length;
    	},

    	toArray: function() {
    		return slice.call( this, 0 );
    	},

    	// Get the Nth element in the matched element set OR
    	// Get the whole matched element set as a clean array
    	get: function( num ) {
    		return num == null ?

    			// Return a 'clean' array
    			this.toArray() :

    			// Return just the object
    			( num < 0 ? this[ this.length + num ] : this[ num ] );
    	},

    	// Take an array of elements and push it onto the stack
    	// (returning the new matched element set)
    	pushStack: function( elems, name, selector ) {
    		// Build a new jQuery matched element set
    		var ret = this.constructor();

    		if ( jQuery.isArray( elems ) ) {
    			push.apply( ret, elems );

    		} else {
    			jQuery.merge( ret, elems );
    		}

    		// Add the old object onto the stack (as a reference)
    		ret.prevObject = this;

    		ret.context = this.context;

    		if ( name === "find" ) {
    			ret.selector = this.selector + (this.selector ? " " : "") + selector;
    		} else if ( name ) {
    			ret.selector = this.selector + "." + name + "(" + selector + ")";
    		}

    		// Return the newly-formed element set
    		return ret;
    	},

    	// Execute a callback for every element in the matched set.
    	// (You can seed the arguments with an array of args, but this is
    	// only used internally.)
    	each: function( callback, args ) {
    		return jQuery.each( this, callback, args );
    	},

    	ready: function( fn ) {
    		// Attach the listeners
    		jQuery.bindReady();

    		// Add the callback
    		readyList.done( fn );

    		return this;
    	},

    	eq: function( i ) {
    		return i === -1 ?
    			this.slice( i ) :
    			this.slice( i, +i + 1 );
    	},

    	first: function() {
    		return this.eq( 0 );
    	},

    	last: function() {
    		return this.eq( -1 );
    	},

    	slice: function() {
    		return this.pushStack( slice.apply( this, arguments ),
    			"slice", slice.call(arguments).join(",") );
    	},

    	map: function( callback ) {
    		return this.pushStack( jQuery.map(this, function( elem, i ) {
    			return callback.call( elem, i, elem );
    		}));
    	},

    	end: function() {
    		return this.prevObject || this.constructor(null);
    	},

    	// For internal use only.
    	// Behaves like an Array's method, not like a jQuery method.
    	push: push,
    	sort: [].sort,
    	splice: [].splice
    };

    // Give the init function the jQuery prototype for later instantiation
    jQuery.fn.init.prototype = jQuery.fn;

    jQuery.extend = jQuery.fn.extend = function() {
    	var options, name, src, copy, copyIsArray, clone,
    		target = arguments[0] || {},
    		i = 1,
    		length = arguments.length,
    		deep = false;

    	// Handle a deep copy situation
    	if ( typeof target === "boolean" ) {
    		deep = target;
    		target = arguments[1] || {};
    		// skip the boolean and the target
    		i = 2;
    	}

    	// Handle case when target is a string or something (possible in deep copy)
    	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
    		target = {};
    	}

    	// extend jQuery itself if only one argument is passed
    	if ( length === i ) {
    		target = this;
    		--i;
    	}

    	for ( ; i < length; i++ ) {
    		// Only deal with non-null/undefined values
    		if ( (options = arguments[ i ]) != null ) {
    			// Extend the base object
    			for ( name in options ) {
    				src = target[ name ];
    				copy = options[ name ];

    				// Prevent never-ending loop
    				if ( target === copy ) {
    					continue;
    				}

    				// Recurse if we're merging plain objects or arrays
    				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
    					if ( copyIsArray ) {
    						copyIsArray = false;
    						clone = src && jQuery.isArray(src) ? src : [];

    					} else {
    						clone = src && jQuery.isPlainObject(src) ? src : {};
    					}

    					// Never move original objects, clone them
    					target[ name ] = jQuery.extend( deep, clone, copy );

    				// Don't bring in undefined values
    				} else if ( copy !== undefined ) {
    					target[ name ] = copy;
    				}
    			}
    		}
    	}

    	// Return the modified object
    	return target;
    };

    jQuery.extend({
    	noConflict: function( deep ) {
    		if ( window.$ === jQuery ) {
    			window.$ = _$;
    		}

    		if ( deep && window.jQuery === jQuery ) {
    			window.jQuery = _jQuery;
    		}

    		return jQuery;
    	},

    	// Is the DOM ready to be used? Set to true once it occurs.
    	isReady: false,

    	// A counter to track how many items to wait for before
    	// the ready event fires. See #6781
    	readyWait: 1,

    	// Hold (or release) the ready event
    	holdReady: function( hold ) {
    		if ( hold ) {
    			jQuery.readyWait++;
    		} else {
    			jQuery.ready( true );
    		}
    	},

    	// Handle when the DOM is ready
    	ready: function( wait ) {
    		// Either a released hold or an DOMready/load event and not yet ready
    		if ( (wait === true && !--jQuery.readyWait) || (wait !== true && !jQuery.isReady) ) {
    			// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
    			if ( !document.body ) {
    				return setTimeout( jQuery.ready, 1 );
    			}

    			// Remember that the DOM is ready
    			jQuery.isReady = true;

    			// If a normal DOM Ready event fired, decrement, and wait if need be
    			if ( wait !== true && --jQuery.readyWait > 0 ) {
    				return;
    			}

    			// If there are functions bound, to execute
    			readyList.resolveWith( document, [ jQuery ] );

    			// Trigger any bound ready events
    			if ( jQuery.fn.trigger ) {
    				jQuery( document ).trigger( "ready" ).unbind( "ready" );
    			}
    		}
    	},

    	bindReady: function() {
    		if ( readyList ) {
    			return;
    		}

    		readyList = jQuery._Deferred();

    		// Catch cases where $(document).ready() is called after the
    		// browser event has already occurred.
    		if ( document.readyState === "complete" ) {
    			// Handle it asynchronously to allow scripts the opportunity to delay ready
    			return setTimeout( jQuery.ready, 1 );
    		}

    		// Mozilla, Opera and webkit nightlies currently support this event
    		if ( document.addEventListener ) {
    			// Use the handy event callback
    			document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );

    			// A fallback to window.onload, that will always work
    			window.addEventListener( "load", jQuery.ready, false );

    		// If IE event model is used
    		} else if ( document.attachEvent ) {
    			// ensure firing before onload,
    			// maybe late but safe also for iframes
    			document.attachEvent( "onreadystatechange", DOMContentLoaded );

    			// A fallback to window.onload, that will always work
    			window.attachEvent( "onload", jQuery.ready );

    			// If IE and not a frame
    			// continually check to see if the document is ready
    			var toplevel = false;

    			try {
    				toplevel = window.frameElement == null;
    			} catch(e) {}

    			if ( document.documentElement.doScroll && toplevel ) {
    				doScrollCheck();
    			}
    		}
    	},

    	// See test/unit/core.js for details concerning isFunction.
    	// Since version 1.3, DOM methods and functions like alert
    	// aren't supported. They return false on IE (#2968).
    	isFunction: function( obj ) {
    		return jQuery.type(obj) === "function";
    	},

    	isArray: Array.isArray || function( obj ) {
    		return jQuery.type(obj) === "array";
    	},

    	// A crude way of determining if an object is a window
    	isWindow: function( obj ) {
    		return obj && typeof obj === "object" && "setInterval" in obj;
    	},

    	isNaN: function( obj ) {
    		return obj == null || !rdigit.test( obj ) || isNaN( obj );
    	},

    	type: function( obj ) {
    		return obj == null ?
    			String( obj ) :
    			class2type[ toString.call(obj) ] || "object";
    	},

    	isPlainObject: function( obj ) {
    		// Must be an Object.
    		// Because of IE, we also have to check the presence of the constructor property.
    		// Make sure that DOM nodes and window objects don't pass through, as well
    		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
    			return false;
    		}

    		// Not own constructor property must be Object
    		if ( obj.constructor &&
    			!hasOwn.call(obj, "constructor") &&
    			!hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
    			return false;
    		}

    		// Own properties are enumerated firstly, so to speed up,
    		// if last one is own, then all properties are own.

    		var key;
    		for ( key in obj ) {}

    		return key === undefined || hasOwn.call( obj, key );
    	},

    	isEmptyObject: function( obj ) {
    		for ( var name in obj ) {
    			return false;
    		}
    		return true;
    	},

    	error: function( msg ) {
    		throw msg;
    	},

    	parseJSON: function( data ) {
    		if ( typeof data !== "string" || !data ) {
    			return null;
    		}

    		// Make sure leading/trailing whitespace is removed (IE can't handle it)
    		data = jQuery.trim( data );

    		// Attempt to parse using the native JSON parser first
    		if ( window.JSON && window.JSON.parse ) {
    			return window.JSON.parse( data );
    		}

    		// Make sure the incoming data is actual JSON
    		// Logic borrowed from http://json.org/json2.js
    		if ( rvalidchars.test( data.replace( rvalidescape, "@" )
    			.replace( rvalidtokens, "]" )
    			.replace( rvalidbraces, "")) ) {

    			return (new Function( "return " + data ))();

    		}
    		jQuery.error( "Invalid JSON: " + data );
    	},

    	// Cross-browser xml parsing
    	// (xml & tmp used internally)
    	parseXML: function( data , xml , tmp ) {

    		if ( window.DOMParser ) { // Standard
    			tmp = new DOMParser();
    			xml = tmp.parseFromString( data , "text/xml" );
    		} else { // IE
    			xml = new ActiveXObject( "Microsoft.XMLDOM" );
    			xml.async = "false";
    			xml.loadXML( data );
    		}

    		tmp = xml.documentElement;

    		if ( ! tmp || ! tmp.nodeName || tmp.nodeName === "parsererror" ) {
    			jQuery.error( "Invalid XML: " + data );
    		}

    		return xml;
    	},

    	noop: function() {},

    	// Evaluates a script in a global context
    	// Workarounds based on findings by Jim Driscoll
    	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
    	globalEval: function( data ) {
    		if ( data && rnotwhite.test( data ) ) {
    			// We use execScript on Internet Explorer
    			// We use an anonymous function so that context is window
    			// rather than jQuery in Firefox
    			( window.execScript || function( data ) {
    				window[ "eval" ].call( window, data );
    			} )( data );
    		}
    	},

    	// Converts a dashed string to camelCased string;
    	// Used by both the css and data modules
    	camelCase: function( string ) {
    		return string.replace( rdashAlpha, fcamelCase );
    	},

    	nodeName: function( elem, name ) {
    		return elem.nodeName && elem.nodeName.toUpperCase() === name.toUpperCase();
    	},

    	// args is for internal usage only
    	each: function( object, callback, args ) {
    		var name, i = 0,
    			length = object.length,
    			isObj = length === undefined || jQuery.isFunction( object );

    		if ( args ) {
    			if ( isObj ) {
    				for ( name in object ) {
    					if ( callback.apply( object[ name ], args ) === false ) {
    						break;
    					}
    				}
    			} else {
    				for ( ; i < length; ) {
    					if ( callback.apply( object[ i++ ], args ) === false ) {
    						break;
    					}
    				}
    			}

    		// A special, fast, case for the most common use of each
    		} else {
    			if ( isObj ) {
    				for ( name in object ) {
    					if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
    						break;
    					}
    				}
    			} else {
    				for ( ; i < length; ) {
    					if ( callback.call( object[ i ], i, object[ i++ ] ) === false ) {
    						break;
    					}
    				}
    			}
    		}

    		return object;
    	},

    	// Use native String.trim function wherever possible
    	trim: trim ?
    		function( text ) {
    			return text == null ?
    				"" :
    				trim.call( text );
    		} :

    		// Otherwise use our own trimming functionality
    		function( text ) {
    			return text == null ?
    				"" :
    				text.toString().replace( trimLeft, "" ).replace( trimRight, "" );
    		},

    	// results is for internal usage only
    	makeArray: function( array, results ) {
    		var ret = results || [];

    		if ( array != null ) {
    			// The window, strings (and functions) also have 'length'
    			// The extra typeof function check is to prevent crashes
    			// in Safari 2 (See: #3039)
    			// Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
    			var type = jQuery.type( array );

    			if ( array.length == null || type === "string" || type === "function" || type === "regexp" || jQuery.isWindow( array ) ) {
    				push.call( ret, array );
    			} else {
    				jQuery.merge( ret, array );
    			}
    		}

    		return ret;
    	},

    	inArray: function( elem, array ) {

    		if ( indexOf ) {
    			return indexOf.call( array, elem );
    		}

    		for ( var i = 0, length = array.length; i < length; i++ ) {
    			if ( array[ i ] === elem ) {
    				return i;
    			}
    		}

    		return -1;
    	},

    	merge: function( first, second ) {
    		var i = first.length,
    			j = 0;

    		if ( typeof second.length === "number" ) {
    			for ( var l = second.length; j < l; j++ ) {
    				first[ i++ ] = second[ j ];
    			}

    		} else {
    			while ( second[j] !== undefined ) {
    				first[ i++ ] = second[ j++ ];
    			}
    		}

    		first.length = i;

    		return first;
    	},

    	grep: function( elems, callback, inv ) {
    		var ret = [], retVal;
    		inv = !!inv;

    		// Go through the array, only saving the items
    		// that pass the validator function
    		for ( var i = 0, length = elems.length; i < length; i++ ) {
    			retVal = !!callback( elems[ i ], i );
    			if ( inv !== retVal ) {
    				ret.push( elems[ i ] );
    			}
    		}

    		return ret;
    	},

    	// arg is for internal usage only
    	map: function( elems, callback, arg ) {
    		var value, key, ret = [],
    			i = 0,
    			length = elems.length,
    			// jquery objects are treated as arrays
    			isArray = elems instanceof jQuery || length !== undefined && typeof length === "number" && ( ( length > 0 && elems[ 0 ] && elems[ length -1 ] ) || length === 0 || jQuery.isArray( elems ) ) ;

    		// Go through the array, translating each of the items to their
    		if ( isArray ) {
    			for ( ; i < length; i++ ) {
    				value = callback( elems[ i ], i, arg );

    				if ( value != null ) {
    					ret[ ret.length ] = value;
    				}
    			}

    		// Go through every key on the object,
    		} else {
    			for ( key in elems ) {
    				value = callback( elems[ key ], key, arg );

    				if ( value != null ) {
    					ret[ ret.length ] = value;
    				}
    			}
    		}

    		// Flatten any nested arrays
    		return ret.concat.apply( [], ret );
    	},

    	// A global GUID counter for objects
    	guid: 1,

    	// Bind a function to a context, optionally partially applying any
    	// arguments.
    	proxy: function( fn, context ) {
    		if ( typeof context === "string" ) {
    			var tmp = fn[ context ];
    			context = fn;
    			fn = tmp;
    		}

    		// Quick check to determine if target is callable, in the spec
    		// this throws a TypeError, but we will just return undefined.
    		if ( !jQuery.isFunction( fn ) ) {
    			return undefined;
    		}

    		// Simulated bind
    		var args = slice.call( arguments, 2 ),
    			proxy = function() {
    				return fn.apply( context, args.concat( slice.call( arguments ) ) );
    			};

    		// Set the guid of unique handler to the same of original handler, so it can be removed
    		proxy.guid = fn.guid = fn.guid || proxy.guid || jQuery.guid++;

    		return proxy;
    	},

    	// Mutifunctional method to get and set values to a collection
    	// The value/s can optionally be executed if it's a function
    	access: function( elems, key, value, exec, fn, pass ) {
    		var length = elems.length;

    		// Setting many attributes
    		if ( typeof key === "object" ) {
    			for ( var k in key ) {
    				jQuery.access( elems, k, key[k], exec, fn, value );
    			}
    			return elems;
    		}

    		// Setting one attribute
    		if ( value !== undefined ) {
    			// Optionally, function values get executed if exec is true
    			exec = !pass && exec && jQuery.isFunction(value);

    			for ( var i = 0; i < length; i++ ) {
    				fn( elems[i], key, exec ? value.call( elems[i], i, fn( elems[i], key ) ) : value, pass );
    			}

    			return elems;
    		}

    		// Getting an attribute
    		return length ? fn( elems[0], key ) : undefined;
    	},

    	now: function() {
    		return (new Date()).getTime();
    	},

    	// Use of jQuery.browser is frowned upon.
    	// More details: http://docs.jquery.com/Utilities/jQuery.browser
    	uaMatch: function( ua ) {
    		ua = ua.toLowerCase();

    		var match = rwebkit.exec( ua ) ||
    			ropera.exec( ua ) ||
    			rmsie.exec( ua ) ||
    			ua.indexOf("compatible") < 0 && rmozilla.exec( ua ) ||
    			[];

    		return { browser: match[1] || "", version: match[2] || "0" };
    	},

    	sub: function() {
    		function jQuerySub( selector, context ) {
    			return new jQuerySub.fn.init( selector, context );
    		}
    		jQuery.extend( true, jQuerySub, this );
    		jQuerySub.superclass = this;
    		jQuerySub.fn = jQuerySub.prototype = this();
    		jQuerySub.fn.constructor = jQuerySub;
    		jQuerySub.sub = this.sub;
    		jQuerySub.fn.init = function init( selector, context ) {
    			if ( context && context instanceof jQuery && !(context instanceof jQuerySub) ) {
    				context = jQuerySub( context );
    			}

    			return jQuery.fn.init.call( this, selector, context, rootjQuerySub );
    		};
    		jQuerySub.fn.init.prototype = jQuerySub.fn;
    		var rootjQuerySub = jQuerySub(document);
    		return jQuerySub;
    	},

    	browser: {}
    });

    // Populate the class2type map
    jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) {
    	class2type[ "[object " + name + "]" ] = name.toLowerCase();
    });

    browserMatch = jQuery.uaMatch( userAgent );
    if ( browserMatch.browser ) {
    	jQuery.browser[ browserMatch.browser ] = true;
    	jQuery.browser.version = browserMatch.version;
    }

    // Deprecated, use jQuery.browser.webkit instead
    if ( jQuery.browser.webkit ) {
    	jQuery.browser.safari = true;
    }

    // IE doesn't match non-breaking spaces with \s
    if ( rnotwhite.test( "\xA0" ) ) {
    	trimLeft = /^[\s\xA0]+/;
    	trimRight = /[\s\xA0]+$/;
    }

    // All jQuery objects should point back to these
    rootjQuery = jQuery(document);

    // Cleanup functions for the document ready method
    if ( document.addEventListener ) {
    	DOMContentLoaded = function() {
    		document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
    		jQuery.ready();
    	};

    } else if ( document.attachEvent ) {
    	DOMContentLoaded = function() {
    		// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
    		if ( document.readyState === "complete" ) {
    			document.detachEvent( "onreadystatechange", DOMContentLoaded );
    			jQuery.ready();
    		}
    	};
    }

    // The DOM ready check for Internet Explorer
    function doScrollCheck() {
    	if ( jQuery.isReady ) {
    		return;
    	}

    	try {
    		// If IE is used, use the trick by Diego Perini
    		// http://javascript.nwbox.com/IEContentLoaded/
    		document.documentElement.doScroll("left");
    	} catch(e) {
    		setTimeout( doScrollCheck, 1 );
    		return;
    	}

    	// and execute any waiting functions
    	jQuery.ready();
    }

    return jQuery;

    })();


    var // Promise methods
    	promiseMethods = "done fail isResolved isRejected promise then always pipe".split( " " ),
    	// Static reference to slice
    	sliceDeferred = [].slice;

    jQuery.extend({
    	// Create a simple deferred (one callbacks list)
    	_Deferred: function() {
    		var // callbacks list
    			callbacks = [],
    			// stored [ context , args ]
    			fired,
    			// to avoid firing when already doing so
    			firing,
    			// flag to know if the deferred has been cancelled
    			cancelled,
    			// the deferred itself
    			deferred  = {

    				// done( f1, f2, ...)
    				done: function() {
    					if ( !cancelled ) {
    						var args = arguments,
    							i,
    							length,
    							elem,
    							type,
    							_fired;
    						if ( fired ) {
    							_fired = fired;
    							fired = 0;
    						}
    						for ( i = 0, length = args.length; i < length; i++ ) {
    							elem = args[ i ];
    							type = jQuery.type( elem );
    							if ( type === "array" ) {
    								deferred.done.apply( deferred, elem );
    							} else if ( type === "function" ) {
    								callbacks.push( elem );
    							}
    						}
    						if ( _fired ) {
    							deferred.resolveWith( _fired[ 0 ], _fired[ 1 ] );
    						}
    					}
    					return this;
    				},

    				// resolve with given context and args
    				resolveWith: function( context, args ) {
    					if ( !cancelled && !fired && !firing ) {
    						// make sure args are available (#8421)
    						args = args || [];
    						firing = 1;
    						try {
    							while( callbacks[ 0 ] ) {
    								callbacks.shift().apply( context, args );
    							}
    						}
    						finally {
    							fired = [ context, args ];
    							firing = 0;
    						}
    					}
    					return this;
    				},

    				// resolve with this as context and given arguments
    				resolve: function() {
    					deferred.resolveWith( this, arguments );
    					return this;
    				},

    				// Has this deferred been resolved?
    				isResolved: function() {
    					return !!( firing || fired );
    				},

    				// Cancel
    				cancel: function() {
    					cancelled = 1;
    					callbacks = [];
    					return this;
    				}
    			};

    		return deferred;
    	},

    	// Full fledged deferred (two callbacks list)
    	Deferred: function( func ) {
    		var deferred = jQuery._Deferred(),
    			failDeferred = jQuery._Deferred(),
    			promise;
    		// Add errorDeferred methods, then and promise
    		jQuery.extend( deferred, {
    			then: function( doneCallbacks, failCallbacks ) {
    				deferred.done( doneCallbacks ).fail( failCallbacks );
    				return this;
    			},
    			always: function() {
    				return deferred.done.apply( deferred, arguments ).fail.apply( this, arguments );
    			},
    			fail: failDeferred.done,
    			rejectWith: failDeferred.resolveWith,
    			reject: failDeferred.resolve,
    			isRejected: failDeferred.isResolved,
    			pipe: function( fnDone, fnFail ) {
    				return jQuery.Deferred(function( newDefer ) {
    					jQuery.each( {
    						done: [ fnDone, "resolve" ],
    						fail: [ fnFail, "reject" ]
    					}, function( handler, data ) {
    						var fn = data[ 0 ],
    							action = data[ 1 ],
    							returned;
    						if ( jQuery.isFunction( fn ) ) {
    							deferred[ handler ](function() {
    								returned = fn.apply( this, arguments );
    								if ( returned && jQuery.isFunction( returned.promise ) ) {
    									returned.promise().then( newDefer.resolve, newDefer.reject );
    								} else {
    									newDefer[ action ]( returned );
    								}
    							});
    						} else {
    							deferred[ handler ]( newDefer[ action ] );
    						}
    					});
    				}).promise();
    			},
    			// Get a promise for this deferred
    			// If obj is provided, the promise aspect is added to the object
    			promise: function( obj ) {
    				if ( obj == null ) {
    					if ( promise ) {
    						return promise;
    					}
    					promise = obj = {};
    				}
    				var i = promiseMethods.length;
    				while( i-- ) {
    					obj[ promiseMethods[i] ] = deferred[ promiseMethods[i] ];
    				}
    				return obj;
    			}
    		});
    		// Make sure only one callback list will be used
    		deferred.done( failDeferred.cancel ).fail( deferred.cancel );
    		// Unexpose cancel
    		delete deferred.cancel;
    		// Call given func if any
    		if ( func ) {
    			func.call( deferred, deferred );
    		}
    		return deferred;
    	},

    	// Deferred helper
    	when: function( firstParam ) {
    		var args = arguments,
    			i = 0,
    			length = args.length,
    			count = length,
    			deferred = length <= 1 && firstParam && jQuery.isFunction( firstParam.promise ) ?
    				firstParam :
    				jQuery.Deferred();
    		function resolveFunc( i ) {
    			return function( value ) {
    				args[ i ] = arguments.length > 1 ? sliceDeferred.call( arguments, 0 ) : value;
    				if ( !( --count ) ) {
    					// Strange bug in FF4:
    					// Values changed onto the arguments object sometimes end up as undefined values
    					// outside the $.when method. Cloning the object into a fresh array solves the issue
    					deferred.resolveWith( deferred, sliceDeferred.call( args, 0 ) );
    				}
    			};
    		}
    		if ( length > 1 ) {
    			for( ; i < length; i++ ) {
    				if ( args[ i ] && jQuery.isFunction( args[ i ].promise ) ) {
    					args[ i ].promise().then( resolveFunc(i), deferred.reject );
    				} else {
    					--count;
    				}
    			}
    			if ( !count ) {
    				deferred.resolveWith( deferred, args );
    			}
    		} else if ( deferred !== firstParam ) {
    			deferred.resolveWith( deferred, length ? [ firstParam ] : [] );
    		}
    		return deferred.promise();
    	}
    });



    jQuery.support = (function() {

    	var div = document.createElement( "div" ),
    		documentElement = document.documentElement,
    		all,
    		a,
    		select,
    		opt,
    		input,
    		marginDiv,
    		support,
    		fragment,
    		body,
    		testElementParent,
    		testElement,
    		testElementStyle,
    		tds,
    		events,
    		eventName,
    		i,
    		isSupported;

    	// Preliminary tests
    	div.setAttribute("className", "t");
    	div.innerHTML = "   <link/><table></table><a href='/a' style='top:1px;float:left;opacity:.55;'>a</a><input type='checkbox'/>";

    	all = div.getElementsByTagName( "*" );
    	a = div.getElementsByTagName( "a" )[ 0 ];

    	// Can't get basic test support
    	if ( !all || !all.length || !a ) {
    		return {};
    	}

    	// First batch of supports tests
    	select = document.createElement( "select" );
    	opt = select.appendChild( document.createElement("option") );
    	input = div.getElementsByTagName( "input" )[ 0 ];

    	support = {
    		// IE strips leading whitespace when .innerHTML is used
    		leadingWhitespace: ( div.firstChild.nodeType === 3 ),

    		// Make sure that tbody elements aren't automatically inserted
    		// IE will insert them into empty tables
    		tbody: !div.getElementsByTagName( "tbody" ).length,

    		// Make sure that link elements get serialized correctly by innerHTML
    		// This requires a wrapper element in IE
    		htmlSerialize: !!div.getElementsByTagName( "link" ).length,

    		// Get the style information from getAttribute
    		// (IE uses .cssText instead)
    		style: /top/.test( a.getAttribute("style") ),

    		// Make sure that URLs aren't manipulated
    		// (IE normalizes it by default)
    		hrefNormalized: ( a.getAttribute( "href" ) === "/a" ),

    		// Make sure that element opacity exists
    		// (IE uses filter instead)
    		// Use a regex to work around a WebKit issue. See #5145
    		opacity: /^0.55$/.test( a.style.opacity ),

    		// Verify style float existence
    		// (IE uses styleFloat instead of cssFloat)
    		cssFloat: !!a.style.cssFloat,

    		// Make sure that if no value is specified for a checkbox
    		// that it defaults to "on".
    		// (WebKit defaults to "" instead)
    		checkOn: ( input.value === "on" ),

    		// Make sure that a selected-by-default option has a working selected property.
    		// (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
    		optSelected: opt.selected,

    		// Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
    		getSetAttribute: div.className !== "t",

    		// Will be defined later
    		submitBubbles: true,
    		changeBubbles: true,
    		focusinBubbles: false,
    		deleteExpando: true,
    		noCloneEvent: true,
    		inlineBlockNeedsLayout: false,
    		shrinkWrapBlocks: false,
    		reliableMarginRight: true
    	};

    	// Make sure checked status is properly cloned
    	input.checked = true;
    	support.noCloneChecked = input.cloneNode( true ).checked;

    	// Make sure that the options inside disabled selects aren't marked as disabled
    	// (WebKit marks them as disabled)
    	select.disabled = true;
    	support.optDisabled = !opt.disabled;

    	// Test to see if it's possible to delete an expando from an element
    	// Fails in Internet Explorer
    	try {
    		delete div.test;
    	} catch( e ) {
    		support.deleteExpando = false;
    	}

    	if ( !div.addEventListener && div.attachEvent && div.fireEvent ) {
    		div.attachEvent( "onclick", function() {
    			// Cloning a node shouldn't copy over any
    			// bound event handlers (IE does this)
    			support.noCloneEvent = false;
    		});
    		div.cloneNode( true ).fireEvent( "onclick" );
    	}

    	// Check if a radio maintains it's value
    	// after being appended to the DOM
    	input = document.createElement("input");
    	input.value = "t";
    	input.setAttribute("type", "radio");
    	support.radioValue = input.value === "t";

    	input.setAttribute("checked", "checked");
    	div.appendChild( input );
    	fragment = document.createDocumentFragment();
    	fragment.appendChild( div.firstChild );

    	// WebKit doesn't clone checked state correctly in fragments
    	support.checkClone = fragment.cloneNode( true ).cloneNode( true ).lastChild.checked;

    	div.innerHTML = "";

    	// Figure out if the W3C box model works as expected
    	div.style.width = div.style.paddingLeft = "1px";

    	body = document.getElementsByTagName( "body" )[ 0 ];
    	// We use our own, invisible, body unless the body is already present
    	// in which case we use a div (#9239)
    	testElement = document.createElement( body ? "div" : "body" );
    	testElementStyle = {
    		visibility: "hidden",
    		width: 0,
    		height: 0,
    		border: 0,
    		margin: 0
    	};
    	if ( body ) {
    		jQuery.extend( testElementStyle, {
    			position: "absolute",
    			left: -1000,
    			top: -1000
    		});
    	}
    	for ( i in testElementStyle ) {
    		testElement.style[ i ] = testElementStyle[ i ];
    	}
    	testElement.appendChild( div );
    	testElementParent = body || documentElement;
    	testElementParent.insertBefore( testElement, testElementParent.firstChild );

    	// Check if a disconnected checkbox will retain its checked
    	// value of true after appended to the DOM (IE6/7)
    	support.appendChecked = input.checked;

    	support.boxModel = div.offsetWidth === 2;

    	if ( "zoom" in div.style ) {
    		// Check if natively block-level elements act like inline-block
    		// elements when setting their display to 'inline' and giving
    		// them layout
    		// (IE < 8 does this)
    		div.style.display = "inline";
    		div.style.zoom = 1;
    		support.inlineBlockNeedsLayout = ( div.offsetWidth === 2 );

    		// Check if elements with layout shrink-wrap their children
    		// (IE 6 does this)
    		div.style.display = "";
    		div.innerHTML = "<div style='width:4px;'></div>";
    		support.shrinkWrapBlocks = ( div.offsetWidth !== 2 );
    	}

    	div.innerHTML = "<table><tr><td style='padding:0;border:0;display:none'></td><td>t</td></tr></table>";
    	tds = div.getElementsByTagName( "td" );

    	// Check if table cells still have offsetWidth/Height when they are set
    	// to display:none and there are still other visible table cells in a
    	// table row; if so, offsetWidth/Height are not reliable for use when
    	// determining if an element has been hidden directly using
    	// display:none (it is still safe to use offsets if a parent element is
    	// hidden; don safety goggles and see bug #4512 for more information).
    	// (only IE 8 fails this test)
    	isSupported = ( tds[ 0 ].offsetHeight === 0 );

    	tds[ 0 ].style.display = "";
    	tds[ 1 ].style.display = "none";

    	// Check if empty table cells still have offsetWidth/Height
    	// (IE < 8 fail this test)
    	support.reliableHiddenOffsets = isSupported && ( tds[ 0 ].offsetHeight === 0 );
    	div.innerHTML = "";

    	// Check if div with explicit width and no margin-right incorrectly
    	// gets computed margin-right based on width of container. For more
    	// info see bug #3333
    	// Fails in WebKit before Feb 2011 nightlies
    	// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
    	if ( document.defaultView && document.defaultView.getComputedStyle ) {
    		marginDiv = document.createElement( "div" );
    		marginDiv.style.width = "0";
    		marginDiv.style.marginRight = "0";
    		div.appendChild( marginDiv );
    		support.reliableMarginRight =
    			( parseInt( ( document.defaultView.getComputedStyle( marginDiv, null ) || { marginRight: 0 } ).marginRight, 10 ) || 0 ) === 0;
    	}

    	// Remove the body element we added
    	testElement.innerHTML = "";
    	testElementParent.removeChild( testElement );

    	// Technique from Juriy Zaytsev
    	// http://thinkweb2.com/projects/prototype/detecting-event-support-without-browser-sniffing/
    	// We only care about the case where non-standard event systems
    	// are used, namely in IE. Short-circuiting here helps us to
    	// avoid an eval call (in setAttribute) which can cause CSP
    	// to go haywire. See: https://developer.mozilla.org/en/Security/CSP
    	if ( div.attachEvent ) {
    		for( i in {
    			submit: 1,
    			change: 1,
    			focusin: 1
    		} ) {
    			eventName = "on" + i;
    			isSupported = ( eventName in div );
    			if ( !isSupported ) {
    				div.setAttribute( eventName, "return;" );
    				isSupported = ( typeof div[ eventName ] === "function" );
    			}
    			support[ i + "Bubbles" ] = isSupported;
    		}
    	}

    	// Null connected elements to avoid leaks in IE
    	testElement = fragment = select = opt = body = marginDiv = div = input = null;

    	return support;
    })();

    // Keep track of boxModel
    jQuery.boxModel = jQuery.support.boxModel;




    var rbrace = /^(?:\{.*\}|\[.*\])$/,
    	rmultiDash = /([a-z])([A-Z])/g;

    jQuery.extend({
    	cache: {},

    	// Please use with caution
    	uuid: 0,

    	// Unique for each copy of jQuery on the page
    	// Non-digits removed to match rinlinejQuery
    	expando: "jQuery" + ( jQuery.fn.jquery + Math.random() ).replace( /\D/g, "" ),

    	// The following elements throw uncatchable exceptions if you
    	// attempt to add expando properties to them.
    	noData: {
    		"embed": true,
    		// Ban all objects except for Flash (which handle expandos)
    		"object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",
    		"applet": true
    	},

    	hasData: function( elem ) {
    		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];

    		return !!elem && !isEmptyDataObject( elem );
    	},

    	data: function( elem, name, data, pvt /* Internal Use Only */ ) {
    		if ( !jQuery.acceptData( elem ) ) {
    			return;
    		}

    		var internalKey = jQuery.expando, getByName = typeof name === "string", thisCache,

    			// We have to handle DOM nodes and JS objects differently because IE6-7
    			// can't GC object references properly across the DOM-JS boundary
    			isNode = elem.nodeType,

    			// Only DOM nodes need the global jQuery cache; JS object data is
    			// attached directly to the object so GC can occur automatically
    			cache = isNode ? jQuery.cache : elem,

    			// Only defining an ID for JS objects if its cache already exists allows
    			// the code to shortcut on the same path as a DOM node with no cache
    			id = isNode ? elem[ jQuery.expando ] : elem[ jQuery.expando ] && jQuery.expando;

    		// Avoid doing any more work than we need to when trying to get data on an
    		// object that has no data at all
    		if ( (!id || (pvt && id && !cache[ id ][ internalKey ])) && getByName && data === undefined ) {
    			return;
    		}

    		if ( !id ) {
    			// Only DOM nodes need a new unique ID for each element since their data
    			// ends up in the global cache
    			if ( isNode ) {
    				elem[ jQuery.expando ] = id = ++jQuery.uuid;
    			} else {
    				id = jQuery.expando;
    			}
    		}

    		if ( !cache[ id ] ) {
    			cache[ id ] = {};

    			// TODO: This is a hack for 1.5 ONLY. Avoids exposing jQuery
    			// metadata on plain JS objects when the object is serialized using
    			// JSON.stringify
    			if ( !isNode ) {
    				cache[ id ].toJSON = jQuery.noop;
    			}
    		}

    		// An object can be passed to jQuery.data instead of a key/value pair; this gets
    		// shallow copied over onto the existing cache
    		if ( typeof name === "object" || typeof name === "function" ) {
    			if ( pvt ) {
    				cache[ id ][ internalKey ] = jQuery.extend(cache[ id ][ internalKey ], name);
    			} else {
    				cache[ id ] = jQuery.extend(cache[ id ], name);
    			}
    		}

    		thisCache = cache[ id ];

    		// Internal jQuery data is stored in a separate object inside the object's data
    		// cache in order to avoid key collisions between internal data and user-defined
    		// data
    		if ( pvt ) {
    			if ( !thisCache[ internalKey ] ) {
    				thisCache[ internalKey ] = {};
    			}

    			thisCache = thisCache[ internalKey ];
    		}

    		if ( data !== undefined ) {
    			thisCache[ jQuery.camelCase( name ) ] = data;
    		}

    		// TODO: This is a hack for 1.5 ONLY. It will be removed in 1.6. Users should
    		// not attempt to inspect the internal events object using jQuery.data, as this
    		// internal data object is undocumented and subject to change.
    		if ( name === "events" && !thisCache[name] ) {
    			return thisCache[ internalKey ] && thisCache[ internalKey ].events;
    		}

    		return getByName ? 
    			// Check for both converted-to-camel and non-converted data property names
    			thisCache[ jQuery.camelCase( name ) ] || thisCache[ name ] :
    			thisCache;
    	},

    	removeData: function( elem, name, pvt /* Internal Use Only */ ) {
    		if ( !jQuery.acceptData( elem ) ) {
    			return;
    		}

    		var internalKey = jQuery.expando, isNode = elem.nodeType,

    			// See jQuery.data for more information
    			cache = isNode ? jQuery.cache : elem,

    			// See jQuery.data for more information
    			id = isNode ? elem[ jQuery.expando ] : jQuery.expando;

    		// If there is already no cache entry for this object, there is no
    		// purpose in continuing
    		if ( !cache[ id ] ) {
    			return;
    		}

    		if ( name ) {
    			var thisCache = pvt ? cache[ id ][ internalKey ] : cache[ id ];

    			if ( thisCache ) {
    				delete thisCache[ name ];

    				// If there is no data left in the cache, we want to continue
    				// and let the cache object itself get destroyed
    				if ( !isEmptyDataObject(thisCache) ) {
    					return;
    				}
    			}
    		}

    		// See jQuery.data for more information
    		if ( pvt ) {
    			delete cache[ id ][ internalKey ];

    			// Don't destroy the parent cache unless the internal data object
    			// had been the only thing left in it
    			if ( !isEmptyDataObject(cache[ id ]) ) {
    				return;
    			}
    		}

    		var internalCache = cache[ id ][ internalKey ];

    		// Browsers that fail expando deletion also refuse to delete expandos on
    		// the window, but it will allow it on all other JS objects; other browsers
    		// don't care
    		if ( jQuery.support.deleteExpando || cache != window ) {
    			delete cache[ id ];
    		} else {
    			cache[ id ] = null;
    		}

    		// We destroyed the entire user cache at once because it's faster than
    		// iterating through each key, but we need to continue to persist internal
    		// data if it existed
    		if ( internalCache ) {
    			cache[ id ] = {};
    			// TODO: This is a hack for 1.5 ONLY. Avoids exposing jQuery
    			// metadata on plain JS objects when the object is serialized using
    			// JSON.stringify
    			if ( !isNode ) {
    				cache[ id ].toJSON = jQuery.noop;
    			}

    			cache[ id ][ internalKey ] = internalCache;

    		// Otherwise, we need to eliminate the expando on the node to avoid
    		// false lookups in the cache for entries that no longer exist
    		} else if ( isNode ) {
    			// IE does not allow us to delete expando properties from nodes,
    			// nor does it have a removeAttribute function on Document nodes;
    			// we must handle all of these cases
    			if ( jQuery.support.deleteExpando ) {
    				delete elem[ jQuery.expando ];
    			} else if ( elem.removeAttribute ) {
    				elem.removeAttribute( jQuery.expando );
    			} else {
    				elem[ jQuery.expando ] = null;
    			}
    		}
    	},

    	// For internal use only.
    	_data: function( elem, name, data ) {
    		return jQuery.data( elem, name, data, true );
    	},

    	// A method for determining if a DOM node can handle the data expando
    	acceptData: function( elem ) {
    		if ( elem.nodeName ) {
    			var match = jQuery.noData[ elem.nodeName.toLowerCase() ];

    			if ( match ) {
    				return !(match === true || elem.getAttribute("classid") !== match);
    			}
    		}

    		return true;
    	}
    });

    jQuery.fn.extend({
    	data: function( key, value ) {
    		var data = null;

    		if ( typeof key === "undefined" ) {
    			if ( this.length ) {
    				data = jQuery.data( this[0] );

    				if ( this[0].nodeType === 1 ) {
    			    var attr = this[0].attributes, name;
    					for ( var i = 0, l = attr.length; i < l; i++ ) {
    						name = attr[i].name;

    						if ( name.indexOf( "data-" ) === 0 ) {
    							name = jQuery.camelCase( name.substring(5) );

    							dataAttr( this[0], name, data[ name ] );
    						}
    					}
    				}
    			}

    			return data;

    		} else if ( typeof key === "object" ) {
    			return this.each(function() {
    				jQuery.data( this, key );
    			});
    		}

    		var parts = key.split(".");
    		parts[1] = parts[1] ? "." + parts[1] : "";

    		if ( value === undefined ) {
    			data = this.triggerHandler("getData" + parts[1] + "!", [parts[0]]);

    			// Try to fetch any internally stored data first
    			if ( data === undefined && this.length ) {
    				data = jQuery.data( this[0], key );
    				data = dataAttr( this[0], key, data );
    			}

    			return data === undefined && parts[1] ?
    				this.data( parts[0] ) :
    				data;

    		} else {
    			return this.each(function() {
    				var $this = jQuery( this ),
    					args = [ parts[0], value ];

    				$this.triggerHandler( "setData" + parts[1] + "!", args );
    				jQuery.data( this, key, value );
    				$this.triggerHandler( "changeData" + parts[1] + "!", args );
    			});
    		}
    	},

    	removeData: function( key ) {
    		return this.each(function() {
    			jQuery.removeData( this, key );
    		});
    	}
    });

    function dataAttr( elem, key, data ) {
    	// If nothing was found internally, try to fetch any
    	// data from the HTML5 data-* attribute
    	if ( data === undefined && elem.nodeType === 1 ) {
    		var name = "data-" + key.replace( rmultiDash, "$1-$2" ).toLowerCase();

    		data = elem.getAttribute( name );

    		if ( typeof data === "string" ) {
    			try {
    				data = data === "true" ? true :
    				data === "false" ? false :
    				data === "null" ? null :
    				!jQuery.isNaN( data ) ? parseFloat( data ) :
    					rbrace.test( data ) ? jQuery.parseJSON( data ) :
    					data;
    			} catch( e ) {}

    			// Make sure we set the data so it isn't changed later
    			jQuery.data( elem, key, data );

    		} else {
    			data = undefined;
    		}
    	}

    	return data;
    }

    // TODO: This is a hack for 1.5 ONLY to allow objects with a single toJSON
    // property to be considered empty objects; this property always exists in
    // order to make sure JSON.stringify does not expose internal metadata
    function isEmptyDataObject( obj ) {
    	for ( var name in obj ) {
    		if ( name !== "toJSON" ) {
    			return false;
    		}
    	}

    	return true;
    }




    function handleQueueMarkDefer( elem, type, src ) {
    	var deferDataKey = type + "defer",
    		queueDataKey = type + "queue",
    		markDataKey = type + "mark",
    		defer = jQuery.data( elem, deferDataKey, undefined, true );
    	if ( defer &&
    		( src === "queue" || !jQuery.data( elem, queueDataKey, undefined, true ) ) &&
    		( src === "mark" || !jQuery.data( elem, markDataKey, undefined, true ) ) ) {
    		// Give room for hard-coded callbacks to fire first
    		// and eventually mark/queue something else on the element
    		setTimeout( function() {
    			if ( !jQuery.data( elem, queueDataKey, undefined, true ) &&
    				!jQuery.data( elem, markDataKey, undefined, true ) ) {
    				jQuery.removeData( elem, deferDataKey, true );
    				defer.resolve();
    			}
    		}, 0 );
    	}
    }

    jQuery.extend({

    	_mark: function( elem, type ) {
    		if ( elem ) {
    			type = (type || "fx") + "mark";
    			jQuery.data( elem, type, (jQuery.data(elem,type,undefined,true) || 0) + 1, true );
    		}
    	},

    	_unmark: function( force, elem, type ) {
    		if ( force !== true ) {
    			type = elem;
    			elem = force;
    			force = false;
    		}
    		if ( elem ) {
    			type = type || "fx";
    			var key = type + "mark",
    				count = force ? 0 : ( (jQuery.data( elem, key, undefined, true) || 1 ) - 1 );
    			if ( count ) {
    				jQuery.data( elem, key, count, true );
    			} else {
    				jQuery.removeData( elem, key, true );
    				handleQueueMarkDefer( elem, type, "mark" );
    			}
    		}
    	},

    	queue: function( elem, type, data ) {
    		if ( elem ) {
    			type = (type || "fx") + "queue";
    			var q = jQuery.data( elem, type, undefined, true );
    			// Speed up dequeue by getting out quickly if this is just a lookup
    			if ( data ) {
    				if ( !q || jQuery.isArray(data) ) {
    					q = jQuery.data( elem, type, jQuery.makeArray(data), true );
    				} else {
    					q.push( data );
    				}
    			}
    			return q || [];
    		}
    	},

    	dequeue: function( elem, type ) {
    		type = type || "fx";

    		var queue = jQuery.queue( elem, type ),
    			fn = queue.shift(),
    			defer;

    		// If the fx queue is dequeued, always remove the progress sentinel
    		if ( fn === "inprogress" ) {
    			fn = queue.shift();
    		}

    		if ( fn ) {
    			// Add a progress sentinel to prevent the fx queue from being
    			// automatically dequeued
    			if ( type === "fx" ) {
    				queue.unshift("inprogress");
    			}

    			fn.call(elem, function() {
    				jQuery.dequeue(elem, type);
    			});
    		}

    		if ( !queue.length ) {
    			jQuery.removeData( elem, type + "queue", true );
    			handleQueueMarkDefer( elem, type, "queue" );
    		}
    	}
    });

    jQuery.fn.extend({
    	queue: function( type, data ) {
    		if ( typeof type !== "string" ) {
    			data = type;
    			type = "fx";
    		}

    		if ( data === undefined ) {
    			return jQuery.queue( this[0], type );
    		}
    		return this.each(function() {
    			var queue = jQuery.queue( this, type, data );

    			if ( type === "fx" && queue[0] !== "inprogress" ) {
    				jQuery.dequeue( this, type );
    			}
    		});
    	},
    	dequeue: function( type ) {
    		return this.each(function() {
    			jQuery.dequeue( this, type );
    		});
    	},
    	// Based off of the plugin by Clint Helfers, with permission.
    	// http://blindsignals.com/index.php/2009/07/jquery-delay/
    	delay: function( time, type ) {
    		time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
    		type = type || "fx";

    		return this.queue( type, function() {
    			var elem = this;
    			setTimeout(function() {
    				jQuery.dequeue( elem, type );
    			}, time );
    		});
    	},
    	clearQueue: function( type ) {
    		return this.queue( type || "fx", [] );
    	},
    	// Get a promise resolved when queues of a certain type
    	// are emptied (fx is the type by default)
    	promise: function( type, object ) {
    		if ( typeof type !== "string" ) {
    			object = type;
    			type = undefined;
    		}
    		type = type || "fx";
    		var defer = jQuery.Deferred(),
    			elements = this,
    			i = elements.length,
    			count = 1,
    			deferDataKey = type + "defer",
    			queueDataKey = type + "queue",
    			markDataKey = type + "mark",
    			tmp;
    		function resolve() {
    			if ( !( --count ) ) {
    				defer.resolveWith( elements, [ elements ] );
    			}
    		}
    		while( i-- ) {
    			if (( tmp = jQuery.data( elements[ i ], deferDataKey, undefined, true ) ||
    					( jQuery.data( elements[ i ], queueDataKey, undefined, true ) ||
    						jQuery.data( elements[ i ], markDataKey, undefined, true ) ) &&
    					jQuery.data( elements[ i ], deferDataKey, jQuery._Deferred(), true ) )) {
    				count++;
    				tmp.done( resolve );
    			}
    		}
    		resolve();
    		return defer.promise();
    	}
    });




    var rclass = /[\n\t\r]/g,
    	rspace = /\s+/,
    	rreturn = /\r/g,
    	rtype = /^(?:button|input)$/i,
    	rfocusable = /^(?:button|input|object|select|textarea)$/i,
    	rclickable = /^a(?:rea)?$/i,
    	rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,
    	rinvalidChar = /\:|^on/,
    	formHook, boolHook;

    jQuery.fn.extend({
    	attr: function( name, value ) {
    		return jQuery.access( this, name, value, true, jQuery.attr );
    	},

    	removeAttr: function( name ) {
    		return this.each(function() {
    			jQuery.removeAttr( this, name );
    		});
    	},

    	prop: function( name, value ) {
    		return jQuery.access( this, name, value, true, jQuery.prop );
    	},

    	removeProp: function( name ) {
    		name = jQuery.propFix[ name ] || name;
    		return this.each(function() {
    			// try/catch handles cases where IE balks (such as removing a property on window)
    			try {
    				this[ name ] = undefined;
    				delete this[ name ];
    			} catch( e ) {}
    		});
    	},

    	addClass: function( value ) {
    		var classNames, i, l, elem,
    			setClass, c, cl;

    		if ( jQuery.isFunction( value ) ) {
    			return this.each(function( j ) {
    				jQuery( this ).addClass( value.call(this, j, this.className) );
    			});
    		}

    		if ( value && typeof value === "string" ) {
    			classNames = value.split( rspace );

    			for ( i = 0, l = this.length; i < l; i++ ) {
    				elem = this[ i ];

    				if ( elem.nodeType === 1 ) {
    					if ( !elem.className && classNames.length === 1 ) {
    						elem.className = value;

    					} else {
    						setClass = " " + elem.className + " ";

    						for ( c = 0, cl = classNames.length; c < cl; c++ ) {
    							if ( !~setClass.indexOf( " " + classNames[ c ] + " " ) ) {
    								setClass += classNames[ c ] + " ";
    							}
    						}
    						elem.className = jQuery.trim( setClass );
    					}
    				}
    			}
    		}

    		return this;
    	},

    	removeClass: function( value ) {
    		var classNames, i, l, elem, className, c, cl;

    		if ( jQuery.isFunction( value ) ) {
    			return this.each(function( j ) {
    				jQuery( this ).removeClass( value.call(this, j, this.className) );
    			});
    		}

    		if ( (value && typeof value === "string") || value === undefined ) {
    			classNames = (value || "").split( rspace );

    			for ( i = 0, l = this.length; i < l; i++ ) {
    				elem = this[ i ];

    				if ( elem.nodeType === 1 && elem.className ) {
    					if ( value ) {
    						className = (" " + elem.className + " ").replace( rclass, " " );
    						for ( c = 0, cl = classNames.length; c < cl; c++ ) {
    							className = className.replace(" " + classNames[ c ] + " ", " ");
    						}
    						elem.className = jQuery.trim( className );

    					} else {
    						elem.className = "";
    					}
    				}
    			}
    		}

    		return this;
    	},

    	toggleClass: function( value, stateVal ) {
    		var type = typeof value,
    			isBool = typeof stateVal === "boolean";

    		if ( jQuery.isFunction( value ) ) {
    			return this.each(function( i ) {
    				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
    			});
    		}

    		return this.each(function() {
    			if ( type === "string" ) {
    				// toggle individual class names
    				var className,
    					i = 0,
    					self = jQuery( this ),
    					state = stateVal,
    					classNames = value.split( rspace );

    				while ( (className = classNames[ i++ ]) ) {
    					// check each className given, space seperated list
    					state = isBool ? state : !self.hasClass( className );
    					self[ state ? "addClass" : "removeClass" ]( className );
    				}

    			} else if ( type === "undefined" || type === "boolean" ) {
    				if ( this.className ) {
    					// store className if set
    					jQuery._data( this, "__className__", this.className );
    				}

    				// toggle whole className
    				this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
    			}
    		});
    	},

    	hasClass: function( selector ) {
    		var className = " " + selector + " ";
    		for ( var i = 0, l = this.length; i < l; i++ ) {
    			if ( (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) > -1 ) {
    				return true;
    			}
    		}

    		return false;
    	},

    	val: function( value ) {
    		var hooks, ret,
    			elem = this[0];

    		if ( !arguments.length ) {
    			if ( elem ) {
    				hooks = jQuery.valHooks[ elem.nodeName.toLowerCase() ] || jQuery.valHooks[ elem.type ];

    				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
    					return ret;
    				}

    				ret = elem.value;

    				return typeof ret === "string" ? 
    					// handle most common string cases
    					ret.replace(rreturn, "") : 
    					// handle cases where value is null/undef or number
    					ret == null ? "" : ret;
    			}

    			return undefined;
    		}

    		var isFunction = jQuery.isFunction( value );

    		return this.each(function( i ) {
    			var self = jQuery(this), val;

    			if ( this.nodeType !== 1 ) {
    				return;
    			}

    			if ( isFunction ) {
    				val = value.call( this, i, self.val() );
    			} else {
    				val = value;
    			}

    			// Treat null/undefined as ""; convert numbers to string
    			if ( val == null ) {
    				val = "";
    			} else if ( typeof val === "number" ) {
    				val += "";
    			} else if ( jQuery.isArray( val ) ) {
    				val = jQuery.map(val, function ( value ) {
    					return value == null ? "" : value + "";
    				});
    			}

    			hooks = jQuery.valHooks[ this.nodeName.toLowerCase() ] || jQuery.valHooks[ this.type ];

    			// If set returns undefined, fall back to normal setting
    			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
    				this.value = val;
    			}
    		});
    	}
    });

    jQuery.extend({
    	valHooks: {
    		option: {
    			get: function( elem ) {
    				// attributes.value is undefined in Blackberry 4.7 but
    				// uses .value. See #6932
    				var val = elem.attributes.value;
    				return !val || val.specified ? elem.value : elem.text;
    			}
    		},
    		select: {
    			get: function( elem ) {
    				var value,
    					index = elem.selectedIndex,
    					values = [],
    					options = elem.options,
    					one = elem.type === "select-one";

    				// Nothing was selected
    				if ( index < 0 ) {
    					return null;
    				}

    				// Loop through all the selected options
    				for ( var i = one ? index : 0, max = one ? index + 1 : options.length; i < max; i++ ) {
    					var option = options[ i ];

    					// Don't return options that are disabled or in a disabled optgroup
    					if ( option.selected && (jQuery.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) &&
    							(!option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" )) ) {

    						// Get the specific value for the option
    						value = jQuery( option ).val();

    						// We don't need an array for one selects
    						if ( one ) {
    							return value;
    						}

    						// Multi-Selects return an array
    						values.push( value );
    					}
    				}

    				// Fixes Bug #2551 -- select.val() broken in IE after form.reset()
    				if ( one && !values.length && options.length ) {
    					return jQuery( options[ index ] ).val();
    				}

    				return values;
    			},

    			set: function( elem, value ) {
    				var values = jQuery.makeArray( value );

    				jQuery(elem).find("option").each(function() {
    					this.selected = jQuery.inArray( jQuery(this).val(), values ) >= 0;
    				});

    				if ( !values.length ) {
    					elem.selectedIndex = -1;
    				}
    				return values;
    			}
    		}
    	},

    	attrFn: {
    		val: true,
    		css: true,
    		html: true,
    		text: true,
    		data: true,
    		width: true,
    		height: true,
    		offset: true
    	},

    	attrFix: {
    		// Always normalize to ensure hook usage
    		tabindex: "tabIndex"
    	},

    	attr: function( elem, name, value, pass ) {
    		var nType = elem.nodeType;

    		// don't get/set attributes on text, comment and attribute nodes
    		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
    			return undefined;
    		}

    		if ( pass && name in jQuery.attrFn ) {
    			return jQuery( elem )[ name ]( value );
    		}

    		// Fallback to prop when attributes are not supported
    		if ( !("getAttribute" in elem) ) {
    			return jQuery.prop( elem, name, value );
    		}

    		var ret, hooks,
    			notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

    		// Normalize the name if needed
    		if ( notxml ) {
    			name = jQuery.attrFix[ name ] || name;

    			hooks = jQuery.attrHooks[ name ];

    			if ( !hooks ) {
    				// Use boolHook for boolean attributes
    				if ( rboolean.test( name ) ) {

    					hooks = boolHook;

    				// Use formHook for forms and if the name contains certain characters
    				} else if ( formHook && name !== "className" &&
    					(jQuery.nodeName( elem, "form" ) || rinvalidChar.test( name )) ) {

    					hooks = formHook;
    				}
    			}
    		}

    		if ( value !== undefined ) {

    			if ( value === null ) {
    				jQuery.removeAttr( elem, name );
    				return undefined;

    			} else if ( hooks && "set" in hooks && notxml && (ret = hooks.set( elem, value, name )) !== undefined ) {
    				return ret;

    			} else {
    				elem.setAttribute( name, "" + value );
    				return value;
    			}

    		} else if ( hooks && "get" in hooks && notxml && (ret = hooks.get( elem, name )) !== null ) {
    			return ret;

    		} else {

    			ret = elem.getAttribute( name );

    			// Non-existent attributes return null, we normalize to undefined
    			return ret === null ?
    				undefined :
    				ret;
    		}
    	},

    	removeAttr: function( elem, name ) {
    		var propName;
    		if ( elem.nodeType === 1 ) {
    			name = jQuery.attrFix[ name ] || name;

    			if ( jQuery.support.getSetAttribute ) {
    				// Use removeAttribute in browsers that support it
    				elem.removeAttribute( name );
    			} else {
    				jQuery.attr( elem, name, "" );
    				elem.removeAttributeNode( elem.getAttributeNode( name ) );
    			}

    			// Set corresponding property to false for boolean attributes
    			if ( rboolean.test( name ) && (propName = jQuery.propFix[ name ] || name) in elem ) {
    				elem[ propName ] = false;
    			}
    		}
    	},

    	attrHooks: {
    		type: {
    			set: function( elem, value ) {
    				// We can't allow the type property to be changed (since it causes problems in IE)
    				if ( rtype.test( elem.nodeName ) && elem.parentNode ) {
    					jQuery.error( "type property can't be changed" );
    				} else if ( !jQuery.support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
    					// Setting the type on a radio button after the value resets the value in IE6-9
    					// Reset value to it's default in case type is set after value
    					// This is for element creation
    					var val = elem.value;
    					elem.setAttribute( "type", value );
    					if ( val ) {
    						elem.value = val;
    					}
    					return value;
    				}
    			}
    		},
    		tabIndex: {
    			get: function( elem ) {
    				// elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
    				// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
    				var attributeNode = elem.getAttributeNode("tabIndex");

    				return attributeNode && attributeNode.specified ?
    					parseInt( attributeNode.value, 10 ) :
    					rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
    						0 :
    						undefined;
    			}
    		},
    		// Use the value property for back compat
    		// Use the formHook for button elements in IE6/7 (#1954)
    		value: {
    			get: function( elem, name ) {
    				if ( formHook && jQuery.nodeName( elem, "button" ) ) {
    					return formHook.get( elem, name );
    				}
    				return name in elem ?
    					elem.value :
    					null;
    			},
    			set: function( elem, value, name ) {
    				if ( formHook && jQuery.nodeName( elem, "button" ) ) {
    					return formHook.set( elem, value, name );
    				}
    				// Does not return so that setAttribute is also used
    				elem.value = value;
    			}
    		}
    	},

    	propFix: {
    		tabindex: "tabIndex",
    		readonly: "readOnly",
    		"for": "htmlFor",
    		"class": "className",
    		maxlength: "maxLength",
    		cellspacing: "cellSpacing",
    		cellpadding: "cellPadding",
    		rowspan: "rowSpan",
    		colspan: "colSpan",
    		usemap: "useMap",
    		frameborder: "frameBorder",
    		contenteditable: "contentEditable"
    	},

    	prop: function( elem, name, value ) {
    		var nType = elem.nodeType;

    		// don't get/set properties on text, comment and attribute nodes
    		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
    			return undefined;
    		}

    		var ret, hooks,
    			notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

    		if ( notxml ) {
    			// Fix name and attach hooks
    			name = jQuery.propFix[ name ] || name;
    			hooks = jQuery.propHooks[ name ];
    		}

    		if ( value !== undefined ) {
    			if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
    				return ret;

    			} else {
    				return (elem[ name ] = value);
    			}

    		} else {
    			if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== undefined ) {
    				return ret;

    			} else {
    				return elem[ name ];
    			}
    		}
    	},

    	propHooks: {}
    });

    // Hook for boolean attributes
    boolHook = {
    	get: function( elem, name ) {
    		// Align boolean attributes with corresponding properties
    		return jQuery.prop( elem, name ) ?
    			name.toLowerCase() :
    			undefined;
    	},
    	set: function( elem, value, name ) {
    		var propName;
    		if ( value === false ) {
    			// Remove boolean attributes when set to false
    			jQuery.removeAttr( elem, name );
    		} else {
    			// value is true since we know at this point it's type boolean and not false
    			// Set boolean attributes to the same name and set the DOM property
    			propName = jQuery.propFix[ name ] || name;
    			if ( propName in elem ) {
    				// Only set the IDL specifically if it already exists on the element
    				elem[ propName ] = true;
    			}

    			elem.setAttribute( name, name.toLowerCase() );
    		}
    		return name;
    	}
    };

    // IE6/7 do not support getting/setting some attributes with get/setAttribute
    if ( !jQuery.support.getSetAttribute ) {

    	// propFix is more comprehensive and contains all fixes
    	jQuery.attrFix = jQuery.propFix;

    	// Use this for any attribute on a form in IE6/7
    	formHook = jQuery.attrHooks.name = jQuery.attrHooks.title = jQuery.valHooks.button = {
    		get: function( elem, name ) {
    			var ret;
    			ret = elem.getAttributeNode( name );
    			// Return undefined if nodeValue is empty string
    			return ret && ret.nodeValue !== "" ?
    				ret.nodeValue :
    				undefined;
    		},
    		set: function( elem, value, name ) {
    			// Check form objects in IE (multiple bugs related)
    			// Only use nodeValue if the attribute node exists on the form
    			var ret = elem.getAttributeNode( name );
    			if ( ret ) {
    				ret.nodeValue = value;
    				return value;
    			}
    		}
    	};

    	// Set width and height to auto instead of 0 on empty string( Bug #8150 )
    	// This is for removals
    	jQuery.each([ "width", "height" ], function( i, name ) {
    		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
    			set: function( elem, value ) {
    				if ( value === "" ) {
    					elem.setAttribute( name, "auto" );
    					return value;
    				}
    			}
    		});
    	});
    }


    // Some attributes require a special call on IE
    if ( !jQuery.support.hrefNormalized ) {
    	jQuery.each([ "href", "src", "width", "height" ], function( i, name ) {
    		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
    			get: function( elem ) {
    				var ret = elem.getAttribute( name, 2 );
    				return ret === null ? undefined : ret;
    			}
    		});
    	});
    }

    if ( !jQuery.support.style ) {
    	jQuery.attrHooks.style = {
    		get: function( elem ) {
    			// Return undefined in the case of empty string
    			// Normalize to lowercase since IE uppercases css property names
    			return elem.style.cssText.toLowerCase() || undefined;
    		},
    		set: function( elem, value ) {
    			return (elem.style.cssText = "" + value);
    		}
    	};
    }

    // Safari mis-reports the default selected property of an option
    // Accessing the parent's selectedIndex property fixes it
    if ( !jQuery.support.optSelected ) {
    	jQuery.propHooks.selected = jQuery.extend( jQuery.propHooks.selected, {
    		get: function( elem ) {
    			var parent = elem.parentNode;

    			if ( parent ) {
    				parent.selectedIndex;

    				// Make sure that it also works with optgroups, see #5701
    				if ( parent.parentNode ) {
    					parent.parentNode.selectedIndex;
    				}
    			}
    		}
    	});
    }

    // Radios and checkboxes getter/setter
    if ( !jQuery.support.checkOn ) {
    	jQuery.each([ "radio", "checkbox" ], function() {
    		jQuery.valHooks[ this ] = {
    			get: function( elem ) {
    				// Handle the case where in Webkit "" is returned instead of "on" if a value isn't specified
    				return elem.getAttribute("value") === null ? "on" : elem.value;
    			}
    		};
    	});
    }
    jQuery.each([ "radio", "checkbox" ], function() {
    	jQuery.valHooks[ this ] = jQuery.extend( jQuery.valHooks[ this ], {
    		set: function( elem, value ) {
    			if ( jQuery.isArray( value ) ) {
    				return (elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0);
    			}
    		}
    	});
    });




    var rnamespaces = /\.(.*)$/,
    	rformElems = /^(?:textarea|input|select)$/i,
    	rperiod = /\./g,
    	rspaces = / /g,
    	rescape = /[^\w\s.|`]/g,
    	fcleanup = function( nm ) {
    		return nm.replace(rescape, "\\$&");
    	};

    /*
     * A number of helper functions used for managing events.
     * Many of the ideas behind this code originated from
     * Dean Edwards' addEvent library.
     */
    jQuery.event = {

    	// Bind an event to an element
    	// Original by Dean Edwards
    	add: function( elem, types, handler, data ) {
    		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
    			return;
    		}

    		if ( handler === false ) {
    			handler = returnFalse;
    		} else if ( !handler ) {
    			// Fixes bug #7229. Fix recommended by jdalton
    			return;
    		}

    		var handleObjIn, handleObj;

    		if ( handler.handler ) {
    			handleObjIn = handler;
    			handler = handleObjIn.handler;
    		}

    		// Make sure that the function being executed has a unique ID
    		if ( !handler.guid ) {
    			handler.guid = jQuery.guid++;
    		}

    		// Init the element's event structure
    		var elemData = jQuery._data( elem );

    		// If no elemData is found then we must be trying to bind to one of the
    		// banned noData elements
    		if ( !elemData ) {
    			return;
    		}

    		var events = elemData.events,
    			eventHandle = elemData.handle;

    		if ( !events ) {
    			elemData.events = events = {};
    		}

    		if ( !eventHandle ) {
    			elemData.handle = eventHandle = function( e ) {
    				// Discard the second event of a jQuery.event.trigger() and
    				// when an event is called after a page has unloaded
    				return typeof jQuery !== "undefined" && (!e || jQuery.event.triggered !== e.type) ?
    					jQuery.event.handle.apply( eventHandle.elem, arguments ) :
    					undefined;
    			};
    		}

    		// Add elem as a property of the handle function
    		// This is to prevent a memory leak with non-native events in IE.
    		eventHandle.elem = elem;

    		// Handle multiple events separated by a space
    		// jQuery(...).bind("mouseover mouseout", fn);
    		types = types.split(" ");

    		var type, i = 0, namespaces;

    		while ( (type = types[ i++ ]) ) {
    			handleObj = handleObjIn ?
    				jQuery.extend({}, handleObjIn) :
    				{ handler: handler, data: data };

    			// Namespaced event handlers
    			if ( type.indexOf(".") > -1 ) {
    				namespaces = type.split(".");
    				type = namespaces.shift();
    				handleObj.namespace = namespaces.slice(0).sort().join(".");

    			} else {
    				namespaces = [];
    				handleObj.namespace = "";
    			}

    			handleObj.type = type;
    			if ( !handleObj.guid ) {
    				handleObj.guid = handler.guid;
    			}

    			// Get the current list of functions bound to this event
    			var handlers = events[ type ],
    				special = jQuery.event.special[ type ] || {};

    			// Init the event handler queue
    			if ( !handlers ) {
    				handlers = events[ type ] = [];

    				// Check for a special event handler
    				// Only use addEventListener/attachEvent if the special
    				// events handler returns false
    				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
    					// Bind the global event handler to the element
    					if ( elem.addEventListener ) {
    						elem.addEventListener( type, eventHandle, false );

    					} else if ( elem.attachEvent ) {
    						elem.attachEvent( "on" + type, eventHandle );
    					}
    				}
    			}

    			if ( special.add ) {
    				special.add.call( elem, handleObj );

    				if ( !handleObj.handler.guid ) {
    					handleObj.handler.guid = handler.guid;
    				}
    			}

    			// Add the function to the element's handler list
    			handlers.push( handleObj );

    			// Keep track of which events have been used, for event optimization
    			jQuery.event.global[ type ] = true;
    		}

    		// Nullify elem to prevent memory leaks in IE
    		elem = null;
    	},

    	global: {},

    	// Detach an event or set of events from an element
    	remove: function( elem, types, handler, pos ) {
    		// don't do events on text and comment nodes
    		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
    			return;
    		}

    		if ( handler === false ) {
    			handler = returnFalse;
    		}

    		var ret, type, fn, j, i = 0, all, namespaces, namespace, special, eventType, handleObj, origType,
    			elemData = jQuery.hasData( elem ) && jQuery._data( elem ),
    			events = elemData && elemData.events;

    		if ( !elemData || !events ) {
    			return;
    		}

    		// types is actually an event object here
    		if ( types && types.type ) {
    			handler = types.handler;
    			types = types.type;
    		}

    		// Unbind all events for the element
    		if ( !types || typeof types === "string" && types.charAt(0) === "." ) {
    			types = types || "";

    			for ( type in events ) {
    				jQuery.event.remove( elem, type + types );
    			}

    			return;
    		}

    		// Handle multiple events separated by a space
    		// jQuery(...).unbind("mouseover mouseout", fn);
    		types = types.split(" ");

    		while ( (type = types[ i++ ]) ) {
    			origType = type;
    			handleObj = null;
    			all = type.indexOf(".") < 0;
    			namespaces = [];

    			if ( !all ) {
    				// Namespaced event handlers
    				namespaces = type.split(".");
    				type = namespaces.shift();

    				namespace = new RegExp("(^|\\.)" +
    					jQuery.map( namespaces.slice(0).sort(), fcleanup ).join("\\.(?:.*\\.)?") + "(\\.|$)");
    			}

    			eventType = events[ type ];

    			if ( !eventType ) {
    				continue;
    			}

    			if ( !handler ) {
    				for ( j = 0; j < eventType.length; j++ ) {
    					handleObj = eventType[ j ];

    					if ( all || namespace.test( handleObj.namespace ) ) {
    						jQuery.event.remove( elem, origType, handleObj.handler, j );
    						eventType.splice( j--, 1 );
    					}
    				}

    				continue;
    			}

    			special = jQuery.event.special[ type ] || {};

    			for ( j = pos || 0; j < eventType.length; j++ ) {
    				handleObj = eventType[ j ];

    				if ( handler.guid === handleObj.guid ) {
    					// remove the given handler for the given type
    					if ( all || namespace.test( handleObj.namespace ) ) {
    						if ( pos == null ) {
    							eventType.splice( j--, 1 );
    						}

    						if ( special.remove ) {
    							special.remove.call( elem, handleObj );
    						}
    					}

    					if ( pos != null ) {
    						break;
    					}
    				}
    			}

    			// remove generic event handler if no more handlers exist
    			if ( eventType.length === 0 || pos != null && eventType.length === 1 ) {
    				if ( !special.teardown || special.teardown.call( elem, namespaces ) === false ) {
    					jQuery.removeEvent( elem, type, elemData.handle );
    				}

    				ret = null;
    				delete events[ type ];
    			}
    		}

    		// Remove the expando if it's no longer used
    		if ( jQuery.isEmptyObject( events ) ) {
    			var handle = elemData.handle;
    			if ( handle ) {
    				handle.elem = null;
    			}

    			delete elemData.events;
    			delete elemData.handle;

    			if ( jQuery.isEmptyObject( elemData ) ) {
    				jQuery.removeData( elem, undefined, true );
    			}
    		}
    	},

    	// Events that are safe to short-circuit if no handlers are attached.
    	// Native DOM events should not be added, they may have inline handlers.
    	customEvent: {
    		"getData": true,
    		"setData": true,
    		"changeData": true
    	},

    	trigger: function( event, data, elem, onlyHandlers ) {
    		// Event object or event type
    		var type = event.type || event,
    			namespaces = [],
    			exclusive;

    		if ( type.indexOf("!") >= 0 ) {
    			// Exclusive events trigger only for the exact event (no namespaces)
    			type = type.slice(0, -1);
    			exclusive = true;
    		}

    		if ( type.indexOf(".") >= 0 ) {
    			// Namespaced trigger; create a regexp to match event type in handle()
    			namespaces = type.split(".");
    			type = namespaces.shift();
    			namespaces.sort();
    		}

    		if ( (!elem || jQuery.event.customEvent[ type ]) && !jQuery.event.global[ type ] ) {
    			// No jQuery handlers for this event type, and it can't have inline handlers
    			return;
    		}

    		// Caller can pass in an Event, Object, or just an event type string
    		event = typeof event === "object" ?
    			// jQuery.Event object
    			event[ jQuery.expando ] ? event :
    			// Object literal
    			new jQuery.Event( type, event ) :
    			// Just the event type (string)
    			new jQuery.Event( type );

    		event.type = type;
    		event.exclusive = exclusive;
    		event.namespace = namespaces.join(".");
    		event.namespace_re = new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.)?") + "(\\.|$)");

    		// triggerHandler() and global events don't bubble or run the default action
    		if ( onlyHandlers || !elem ) {
    			event.preventDefault();
    			event.stopPropagation();
    		}

    		// Handle a global trigger
    		if ( !elem ) {
    			// TODO: Stop taunting the data cache; remove global events and always attach to document
    			jQuery.each( jQuery.cache, function() {
    				// internalKey variable is just used to make it easier to find
    				// and potentially change this stuff later; currently it just
    				// points to jQuery.expando
    				var internalKey = jQuery.expando,
    					internalCache = this[ internalKey ];
    				if ( internalCache && internalCache.events && internalCache.events[ type ] ) {
    					jQuery.event.trigger( event, data, internalCache.handle.elem );
    				}
    			});
    			return;
    		}

    		// Don't do events on text and comment nodes
    		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
    			return;
    		}

    		// Clean up the event in case it is being reused
    		event.result = undefined;
    		event.target = elem;

    		// Clone any incoming data and prepend the event, creating the handler arg list
    		data = data != null ? jQuery.makeArray( data ) : [];
    		data.unshift( event );

    		var cur = elem,
    			// IE doesn't like method names with a colon (#3533, #8272)
    			ontype = type.indexOf(":") < 0 ? "on" + type : "";

    		// Fire event on the current element, then bubble up the DOM tree
    		do {
    			var handle = jQuery._data( cur, "handle" );

    			event.currentTarget = cur;
    			if ( handle ) {
    				handle.apply( cur, data );
    			}

    			// Trigger an inline bound script
    			if ( ontype && jQuery.acceptData( cur ) && cur[ ontype ] && cur[ ontype ].apply( cur, data ) === false ) {
    				event.result = false;
    				event.preventDefault();
    			}

    			// Bubble up to document, then to window
    			cur = cur.parentNode || cur.ownerDocument || cur === event.target.ownerDocument && window;
    		} while ( cur && !event.isPropagationStopped() );

    		// If nobody prevented the default action, do it now
    		if ( !event.isDefaultPrevented() ) {
    			var old,
    				special = jQuery.event.special[ type ] || {};

    			if ( (!special._default || special._default.call( elem.ownerDocument, event ) === false) &&
    				!(type === "click" && jQuery.nodeName( elem, "a" )) && jQuery.acceptData( elem ) ) {

    				// Call a native DOM method on the target with the same name name as the event.
    				// Can't use an .isFunction)() check here because IE6/7 fails that test.
    				// IE<9 dies on focus to hidden element (#1486), may want to revisit a try/catch.
    				try {
    					if ( ontype && elem[ type ] ) {
    						// Don't re-trigger an onFOO event when we call its FOO() method
    						old = elem[ ontype ];

    						if ( old ) {
    							elem[ ontype ] = null;
    						}

    						jQuery.event.triggered = type;
    						elem[ type ]();
    					}
    				} catch ( ieError ) {}

    				if ( old ) {
    					elem[ ontype ] = old;
    				}

    				jQuery.event.triggered = undefined;
    			}
    		}

    		return event.result;
    	},

    	handle: function( event ) {
    		event = jQuery.event.fix( event || window.event );
    		// Snapshot the handlers list since a called handler may add/remove events.
    		var handlers = ((jQuery._data( this, "events" ) || {})[ event.type ] || []).slice(0),
    			run_all = !event.exclusive && !event.namespace,
    			args = Array.prototype.slice.call( arguments, 0 );

    		// Use the fix-ed Event rather than the (read-only) native event
    		args[0] = event;
    		event.currentTarget = this;

    		for ( var j = 0, l = handlers.length; j < l; j++ ) {
    			var handleObj = handlers[ j ];

    			// Triggered event must 1) be non-exclusive and have no namespace, or
    			// 2) have namespace(s) a subset or equal to those in the bound event.
    			if ( run_all || event.namespace_re.test( handleObj.namespace ) ) {
    				// Pass in a reference to the handler function itself
    				// So that we can later remove it
    				event.handler = handleObj.handler;
    				event.data = handleObj.data;
    				event.handleObj = handleObj;

    				var ret = handleObj.handler.apply( this, args );

    				if ( ret !== undefined ) {
    					event.result = ret;
    					if ( ret === false ) {
    						event.preventDefault();
    						event.stopPropagation();
    					}
    				}

    				if ( event.isImmediatePropagationStopped() ) {
    					break;
    				}
    			}
    		}
    		return event.result;
    	},

    	props: "altKey attrChange attrName bubbles button cancelable charCode clientX clientY ctrlKey currentTarget data detail eventPhase fromElement handler keyCode layerX layerY metaKey newValue offsetX offsetY pageX pageY prevValue relatedNode relatedTarget screenX screenY shiftKey srcElement target toElement view wheelDelta which".split(" "),

    	fix: function( event ) {
    		if ( event[ jQuery.expando ] ) {
    			return event;
    		}

    		// store a copy of the original event object
    		// and "clone" to set read-only properties
    		var originalEvent = event;
    		event = jQuery.Event( originalEvent );

    		for ( var i = this.props.length, prop; i; ) {
    			prop = this.props[ --i ];
    			event[ prop ] = originalEvent[ prop ];
    		}

    		// Fix target property, if necessary
    		if ( !event.target ) {
    			// Fixes #1925 where srcElement might not be defined either
    			event.target = event.srcElement || document;
    		}

    		// check if target is a textnode (safari)
    		if ( event.target.nodeType === 3 ) {
    			event.target = event.target.parentNode;
    		}

    		// Add relatedTarget, if necessary
    		if ( !event.relatedTarget && event.fromElement ) {
    			event.relatedTarget = event.fromElement === event.target ? event.toElement : event.fromElement;
    		}

    		// Calculate pageX/Y if missing and clientX/Y available
    		if ( event.pageX == null && event.clientX != null ) {
    			var eventDocument = event.target.ownerDocument || document,
    				doc = eventDocument.documentElement,
    				body = eventDocument.body;

    			event.pageX = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
    			event.pageY = event.clientY + (doc && doc.scrollTop  || body && body.scrollTop  || 0) - (doc && doc.clientTop  || body && body.clientTop  || 0);
    		}

    		// Add which for key events
    		if ( event.which == null && (event.charCode != null || event.keyCode != null) ) {
    			event.which = event.charCode != null ? event.charCode : event.keyCode;
    		}

    		// Add metaKey to non-Mac browsers (use ctrl for PC's and Meta for Macs)
    		if ( !event.metaKey && event.ctrlKey ) {
    			event.metaKey = event.ctrlKey;
    		}

    		// Add which for click: 1 === left; 2 === middle; 3 === right
    		// Note: button is not normalized, so don't use it
    		if ( !event.which && event.button !== undefined ) {
    			event.which = (event.button & 1 ? 1 : ( event.button & 2 ? 3 : ( event.button & 4 ? 2 : 0 ) ));
    		}

    		return event;
    	},

    	// Deprecated, use jQuery.guid instead
    	guid: 1E8,

    	// Deprecated, use jQuery.proxy instead
    	proxy: jQuery.proxy,

    	special: {
    		ready: {
    			// Make sure the ready event is setup
    			setup: jQuery.bindReady,
    			teardown: jQuery.noop
    		},

    		live: {
    			add: function( handleObj ) {
    				jQuery.event.add( this,
    					liveConvert( handleObj.origType, handleObj.selector ),
    					jQuery.extend({}, handleObj, {handler: liveHandler, guid: handleObj.handler.guid}) );
    			},

    			remove: function( handleObj ) {
    				jQuery.event.remove( this, liveConvert( handleObj.origType, handleObj.selector ), handleObj );
    			}
    		},

    		beforeunload: {
    			setup: function( data, namespaces, eventHandle ) {
    				// We only want to do this special case on windows
    				if ( jQuery.isWindow( this ) ) {
    					this.onbeforeunload = eventHandle;
    				}
    			},

    			teardown: function( namespaces, eventHandle ) {
    				if ( this.onbeforeunload === eventHandle ) {
    					this.onbeforeunload = null;
    				}
    			}
    		}
    	}
    };

    jQuery.removeEvent = document.removeEventListener ?
    	function( elem, type, handle ) {
    		if ( elem.removeEventListener ) {
    			elem.removeEventListener( type, handle, false );
    		}
    	} :
    	function( elem, type, handle ) {
    		if ( elem.detachEvent ) {
    			elem.detachEvent( "on" + type, handle );
    		}
    	};

    jQuery.Event = function( src, props ) {
    	// Allow instantiation without the 'new' keyword
    	if ( !this.preventDefault ) {
    		return new jQuery.Event( src, props );
    	}

    	// Event object
    	if ( src && src.type ) {
    		this.originalEvent = src;
    		this.type = src.type;

    		// Events bubbling up the document may have been marked as prevented
    		// by a handler lower down the tree; reflect the correct value.
    		this.isDefaultPrevented = (src.defaultPrevented || src.returnValue === false ||
    			src.getPreventDefault && src.getPreventDefault()) ? returnTrue : returnFalse;

    	// Event type
    	} else {
    		this.type = src;
    	}

    	// Put explicitly provided properties onto the event object
    	if ( props ) {
    		jQuery.extend( this, props );
    	}

    	// timeStamp is buggy for some events on Firefox(#3843)
    	// So we won't rely on the native value
    	this.timeStamp = jQuery.now();

    	// Mark it as fixed
    	this[ jQuery.expando ] = true;
    };

    function returnFalse() {
    	return false;
    }
    function returnTrue() {
    	return true;
    }

    // jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
    // http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
    jQuery.Event.prototype = {
    	preventDefault: function() {
    		this.isDefaultPrevented = returnTrue;

    		var e = this.originalEvent;
    		if ( !e ) {
    			return;
    		}

    		// if preventDefault exists run it on the original event
    		if ( e.preventDefault ) {
    			e.preventDefault();

    		// otherwise set the returnValue property of the original event to false (IE)
    		} else {
    			e.returnValue = false;
    		}
    	},
    	stopPropagation: function() {
    		this.isPropagationStopped = returnTrue;

    		var e = this.originalEvent;
    		if ( !e ) {
    			return;
    		}
    		// if stopPropagation exists run it on the original event
    		if ( e.stopPropagation ) {
    			e.stopPropagation();
    		}
    		// otherwise set the cancelBubble property of the original event to true (IE)
    		e.cancelBubble = true;
    	},
    	stopImmediatePropagation: function() {
    		this.isImmediatePropagationStopped = returnTrue;
    		this.stopPropagation();
    	},
    	isDefaultPrevented: returnFalse,
    	isPropagationStopped: returnFalse,
    	isImmediatePropagationStopped: returnFalse
    };

    // Checks if an event happened on an element within another element
    // Used in jQuery.event.special.mouseenter and mouseleave handlers
    var withinElement = function( event ) {

    	// Check if mouse(over|out) are still within the same parent element
    	var related = event.relatedTarget,
    		inside = false,
    		eventType = event.type;

    	event.type = event.data;

    	if ( related !== this ) {

    		if ( related ) {
    			inside = jQuery.contains( this, related );
    		}

    		if ( !inside ) {

    			jQuery.event.handle.apply( this, arguments );

    			event.type = eventType;
    		}
    	}
    },

    // In case of event delegation, we only need to rename the event.type,
    // liveHandler will take care of the rest.
    delegate = function( event ) {
    	event.type = event.data;
    	jQuery.event.handle.apply( this, arguments );
    };

    // Create mouseenter and mouseleave events
    jQuery.each({
    	mouseenter: "mouseover",
    	mouseleave: "mouseout"
    }, function( orig, fix ) {
    	jQuery.event.special[ orig ] = {
    		setup: function( data ) {
    			jQuery.event.add( this, fix, data && data.selector ? delegate : withinElement, orig );
    		},
    		teardown: function( data ) {
    			jQuery.event.remove( this, fix, data && data.selector ? delegate : withinElement );
    		}
    	};
    });

    // submit delegation
    if ( !jQuery.support.submitBubbles ) {

    	jQuery.event.special.submit = {
    		setup: function( data, namespaces ) {
    			if ( !jQuery.nodeName( this, "form" ) ) {
    				jQuery.event.add(this, "click.specialSubmit", function( e ) {
    					var elem = e.target,
    						type = elem.type;

    					if ( (type === "submit" || type === "image") && jQuery( elem ).closest("form").length ) {
    						trigger( "submit", this, arguments );
    					}
    				});

    				jQuery.event.add(this, "keypress.specialSubmit", function( e ) {
    					var elem = e.target,
    						type = elem.type;

    					if ( (type === "text" || type === "password") && jQuery( elem ).closest("form").length && e.keyCode === 13 ) {
    						trigger( "submit", this, arguments );
    					}
    				});

    			} else {
    				return false;
    			}
    		},

    		teardown: function( namespaces ) {
    			jQuery.event.remove( this, ".specialSubmit" );
    		}
    	};

    }

    // change delegation, happens here so we have bind.
    if ( !jQuery.support.changeBubbles ) {

    	var changeFilters,

    	getVal = function( elem ) {
    		var type = elem.type, val = elem.value;

    		if ( type === "radio" || type === "checkbox" ) {
    			val = elem.checked;

    		} else if ( type === "select-multiple" ) {
    			val = elem.selectedIndex > -1 ?
    				jQuery.map( elem.options, function( elem ) {
    					return elem.selected;
    				}).join("-") :
    				"";

    		} else if ( jQuery.nodeName( elem, "select" ) ) {
    			val = elem.selectedIndex;
    		}

    		return val;
    	},

    	testChange = function testChange( e ) {
    		var elem = e.target, data, val;

    		if ( !rformElems.test( elem.nodeName ) || elem.readOnly ) {
    			return;
    		}

    		data = jQuery._data( elem, "_change_data" );
    		val = getVal(elem);

    		// the current data will be also retrieved by beforeactivate
    		if ( e.type !== "focusout" || elem.type !== "radio" ) {
    			jQuery._data( elem, "_change_data", val );
    		}

    		if ( data === undefined || val === data ) {
    			return;
    		}

    		if ( data != null || val ) {
    			e.type = "change";
    			e.liveFired = undefined;
    			jQuery.event.trigger( e, arguments[1], elem );
    		}
    	};

    	jQuery.event.special.change = {
    		filters: {
    			focusout: testChange,

    			beforedeactivate: testChange,

    			click: function( e ) {
    				var elem = e.target, type = jQuery.nodeName( elem, "input" ) ? elem.type : "";

    				if ( type === "radio" || type === "checkbox" || jQuery.nodeName( elem, "select" ) ) {
    					testChange.call( this, e );
    				}
    			},

    			// Change has to be called before submit
    			// Keydown will be called before keypress, which is used in submit-event delegation
    			keydown: function( e ) {
    				var elem = e.target, type = jQuery.nodeName( elem, "input" ) ? elem.type : "";

    				if ( (e.keyCode === 13 && !jQuery.nodeName( elem, "textarea" ) ) ||
    					(e.keyCode === 32 && (type === "checkbox" || type === "radio")) ||
    					type === "select-multiple" ) {
    					testChange.call( this, e );
    				}
    			},

    			// Beforeactivate happens also before the previous element is blurred
    			// with this event you can't trigger a change event, but you can store
    			// information
    			beforeactivate: function( e ) {
    				var elem = e.target;
    				jQuery._data( elem, "_change_data", getVal(elem) );
    			}
    		},

    		setup: function( data, namespaces ) {
    			if ( this.type === "file" ) {
    				return false;
    			}

    			for ( var type in changeFilters ) {
    				jQuery.event.add( this, type + ".specialChange", changeFilters[type] );
    			}

    			return rformElems.test( this.nodeName );
    		},

    		teardown: function( namespaces ) {
    			jQuery.event.remove( this, ".specialChange" );

    			return rformElems.test( this.nodeName );
    		}
    	};

    	changeFilters = jQuery.event.special.change.filters;

    	// Handle when the input is .focus()'d
    	changeFilters.focus = changeFilters.beforeactivate;
    }

    function trigger( type, elem, args ) {
    	// Piggyback on a donor event to simulate a different one.
    	// Fake originalEvent to avoid donor's stopPropagation, but if the
    	// simulated event prevents default then we do the same on the donor.
    	// Don't pass args or remember liveFired; they apply to the donor event.
    	var event = jQuery.extend( {}, args[ 0 ] );
    	event.type = type;
    	event.originalEvent = {};
    	event.liveFired = undefined;
    	jQuery.event.handle.call( elem, event );
    	if ( event.isDefaultPrevented() ) {
    		args[ 0 ].preventDefault();
    	}
    }

    // Create "bubbling" focus and blur events
    if ( !jQuery.support.focusinBubbles ) {
    	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

    		// Attach a single capturing handler while someone wants focusin/focusout
    		var attaches = 0;

    		jQuery.event.special[ fix ] = {
    			setup: function() {
    				if ( attaches++ === 0 ) {
    					document.addEventListener( orig, handler, true );
    				}
    			},
    			teardown: function() {
    				if ( --attaches === 0 ) {
    					document.removeEventListener( orig, handler, true );
    				}
    			}
    		};

    		function handler( donor ) {
    			// Donor event is always a native one; fix it and switch its type.
    			// Let focusin/out handler cancel the donor focus/blur event.
    			var e = jQuery.event.fix( donor );
    			e.type = fix;
    			e.originalEvent = {};
    			jQuery.event.trigger( e, null, e.target );
    			if ( e.isDefaultPrevented() ) {
    				donor.preventDefault();
    			}
    		}
    	});
    }

    jQuery.each(["bind", "one"], function( i, name ) {
    	jQuery.fn[ name ] = function( type, data, fn ) {
    		var handler;

    		// Handle object literals
    		if ( typeof type === "object" ) {
    			for ( var key in type ) {
    				this[ name ](key, data, type[key], fn);
    			}
    			return this;
    		}

    		if ( arguments.length === 2 || data === false ) {
    			fn = data;
    			data = undefined;
    		}

    		if ( name === "one" ) {
    			handler = function( event ) {
    				jQuery( this ).unbind( event, handler );
    				return fn.apply( this, arguments );
    			};
    			handler.guid = fn.guid || jQuery.guid++;
    		} else {
    			handler = fn;
    		}

    		if ( type === "unload" && name !== "one" ) {
    			this.one( type, data, fn );

    		} else {
    			for ( var i = 0, l = this.length; i < l; i++ ) {
    				jQuery.event.add( this[i], type, handler, data );
    			}
    		}

    		return this;
    	};
    });

    jQuery.fn.extend({
    	unbind: function( type, fn ) {
    		// Handle object literals
    		if ( typeof type === "object" && !type.preventDefault ) {
    			for ( var key in type ) {
    				this.unbind(key, type[key]);
    			}

    		} else {
    			for ( var i = 0, l = this.length; i < l; i++ ) {
    				jQuery.event.remove( this[i], type, fn );
    			}
    		}

    		return this;
    	},

    	delegate: function( selector, types, data, fn ) {
    		return this.live( types, data, fn, selector );
    	},

    	undelegate: function( selector, types, fn ) {
    		if ( arguments.length === 0 ) {
    			return this.unbind( "live" );

    		} else {
    			return this.die( types, null, fn, selector );
    		}
    	},

    	trigger: function( type, data ) {
    		return this.each(function() {
    			jQuery.event.trigger( type, data, this );
    		});
    	},

    	triggerHandler: function( type, data ) {
    		if ( this[0] ) {
    			return jQuery.event.trigger( type, data, this[0], true );
    		}
    	},

    	toggle: function( fn ) {
    		// Save reference to arguments for access in closure
    		var args = arguments,
    			guid = fn.guid || jQuery.guid++,
    			i = 0,
    			toggler = function( event ) {
    				// Figure out which function to execute
    				var lastToggle = ( jQuery.data( this, "lastToggle" + fn.guid ) || 0 ) % i;
    				jQuery.data( this, "lastToggle" + fn.guid, lastToggle + 1 );

    				// Make sure that clicks stop
    				event.preventDefault();

    				// and execute the function
    				return args[ lastToggle ].apply( this, arguments ) || false;
    			};

    		// link all the functions, so any of them can unbind this click handler
    		toggler.guid = guid;
    		while ( i < args.length ) {
    			args[ i++ ].guid = guid;
    		}

    		return this.click( toggler );
    	},

    	hover: function( fnOver, fnOut ) {
    		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
    	}
    });

    var liveMap = {
    	focus: "focusin",
    	blur: "focusout",
    	mouseenter: "mouseover",
    	mouseleave: "mouseout"
    };

    jQuery.each(["live", "die"], function( i, name ) {
    	jQuery.fn[ name ] = function( types, data, fn, origSelector /* Internal Use Only */ ) {
    		var type, i = 0, match, namespaces, preType,
    			selector = origSelector || this.selector,
    			context = origSelector ? this : jQuery( this.context );

    		if ( typeof types === "object" && !types.preventDefault ) {
    			for ( var key in types ) {
    				context[ name ]( key, data, types[key], selector );
    			}

    			return this;
    		}

    		if ( name === "die" && !types &&
    					origSelector && origSelector.charAt(0) === "." ) {

    			context.unbind( origSelector );

    			return this;
    		}

    		if ( data === false || jQuery.isFunction( data ) ) {
    			fn = data || returnFalse;
    			data = undefined;
    		}

    		types = (types || "").split(" ");

    		while ( (type = types[ i++ ]) != null ) {
    			match = rnamespaces.exec( type );
    			namespaces = "";

    			if ( match )  {
    				namespaces = match[0];
    				type = type.replace( rnamespaces, "" );
    			}

    			if ( type === "hover" ) {
    				types.push( "mouseenter" + namespaces, "mouseleave" + namespaces );
    				continue;
    			}

    			preType = type;

    			if ( liveMap[ type ] ) {
    				types.push( liveMap[ type ] + namespaces );
    				type = type + namespaces;

    			} else {
    				type = (liveMap[ type ] || type) + namespaces;
    			}

    			if ( name === "live" ) {
    				// bind live handler
    				for ( var j = 0, l = context.length; j < l; j++ ) {
    					jQuery.event.add( context[j], "live." + liveConvert( type, selector ),
    						{ data: data, selector: selector, handler: fn, origType: type, origHandler: fn, preType: preType } );
    				}

    			} else {
    				// unbind live handler
    				context.unbind( "live." + liveConvert( type, selector ), fn );
    			}
    		}

    		return this;
    	};
    });

    function liveHandler( event ) {
    	var stop, maxLevel, related, match, handleObj, elem, j, i, l, data, close, namespace, ret,
    		elems = [],
    		selectors = [],
    		events = jQuery._data( this, "events" );

    	// Make sure we avoid non-left-click bubbling in Firefox (#3861) and disabled elements in IE (#6911)
    	if ( event.liveFired === this || !events || !events.live || event.target.disabled || event.button && event.type === "click" ) {
    		return;
    	}

    	if ( event.namespace ) {
    		namespace = new RegExp("(^|\\.)" + event.namespace.split(".").join("\\.(?:.*\\.)?") + "(\\.|$)");
    	}

    	event.liveFired = this;

    	var live = events.live.slice(0);

    	for ( j = 0; j < live.length; j++ ) {
    		handleObj = live[j];

    		if ( handleObj.origType.replace( rnamespaces, "" ) === event.type ) {
    			selectors.push( handleObj.selector );

    		} else {
    			live.splice( j--, 1 );
    		}
    	}

    	match = jQuery( event.target ).closest( selectors, event.currentTarget );

    	for ( i = 0, l = match.length; i < l; i++ ) {
    		close = match[i];

    		for ( j = 0; j < live.length; j++ ) {
    			handleObj = live[j];

    			if ( close.selector === handleObj.selector && (!namespace || namespace.test( handleObj.namespace )) && !close.elem.disabled ) {
    				elem = close.elem;
    				related = null;

    				// Those two events require additional checking
    				if ( handleObj.preType === "mouseenter" || handleObj.preType === "mouseleave" ) {
    					event.type = handleObj.preType;
    					related = jQuery( event.relatedTarget ).closest( handleObj.selector )[0];

    					// Make sure not to accidentally match a child element with the same selector
    					if ( related && jQuery.contains( elem, related ) ) {
    						related = elem;
    					}
    				}

    				if ( !related || related !== elem ) {
    					elems.push({ elem: elem, handleObj: handleObj, level: close.level });
    				}
    			}
    		}
    	}

    	for ( i = 0, l = elems.length; i < l; i++ ) {
    		match = elems[i];

    		if ( maxLevel && match.level > maxLevel ) {
    			break;
    		}

    		event.currentTarget = match.elem;
    		event.data = match.handleObj.data;
    		event.handleObj = match.handleObj;

    		ret = match.handleObj.origHandler.apply( match.elem, arguments );

    		if ( ret === false || event.isPropagationStopped() ) {
    			maxLevel = match.level;

    			if ( ret === false ) {
    				stop = false;
    			}
    			if ( event.isImmediatePropagationStopped() ) {
    				break;
    			}
    		}
    	}

    	return stop;
    }

    function liveConvert( type, selector ) {
    	return (type && type !== "*" ? type + "." : "") + selector.replace(rperiod, "`").replace(rspaces, "&");
    }

    jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
    	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
    	"change select submit keydown keypress keyup error").split(" "), function( i, name ) {

    	// Handle event binding
    	jQuery.fn[ name ] = function( data, fn ) {
    		if ( fn == null ) {
    			fn = data;
    			data = null;
    		}

    		return arguments.length > 0 ?
    			this.bind( name, data, fn ) :
    			this.trigger( name );
    	};

    	if ( jQuery.attrFn ) {
    		jQuery.attrFn[ name ] = true;
    	}
    });



    /*!
     * Sizzle CSS Selector Engine
     *  Copyright 2011, The Dojo Foundation
     *  Released under the MIT, BSD, and GPL Licenses.
     *  More information: http://sizzlejs.com/
     */
    (function(){

    var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
    	done = 0,
    	toString = Object.prototype.toString,
    	hasDuplicate = false,
    	baseHasDuplicate = true,
    	rBackslash = /\\/g,
    	rNonWord = /\W/;

    // Here we check if the JavaScript engine is using some sort of
    // optimization where it does not always call our comparision
    // function. If that is the case, discard the hasDuplicate value.
    //   Thus far that includes Google Chrome.
    [0, 0].sort(function() {
    	baseHasDuplicate = false;
    	return 0;
    });

    var Sizzle = function( selector, context, results, seed ) {
    	results = results || [];
    	context = context || document;

    	var origContext = context;

    	if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
    		return [];
    	}

    	if ( !selector || typeof selector !== "string" ) {
    		return results;
    	}

    	var m, set, checkSet, extra, ret, cur, pop, i,
    		prune = true,
    		contextXML = Sizzle.isXML( context ),
    		parts = [],
    		soFar = selector;

    	// Reset the position of the chunker regexp (start from head)
    	do {
    		chunker.exec( "" );
    		m = chunker.exec( soFar );

    		if ( m ) {
    			soFar = m[3];

    			parts.push( m[1] );

    			if ( m[2] ) {
    				extra = m[3];
    				break;
    			}
    		}
    	} while ( m );

    	if ( parts.length > 1 && origPOS.exec( selector ) ) {

    		if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
    			set = posProcess( parts[0] + parts[1], context );

    		} else {
    			set = Expr.relative[ parts[0] ] ?
    				[ context ] :
    				Sizzle( parts.shift(), context );

    			while ( parts.length ) {
    				selector = parts.shift();

    				if ( Expr.relative[ selector ] ) {
    					selector += parts.shift();
    				}

    				set = posProcess( selector, set );
    			}
    		}

    	} else {
    		// Take a shortcut and set the context if the root selector is an ID
    		// (but not if it'll be faster if the inner selector is an ID)
    		if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
    				Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {

    			ret = Sizzle.find( parts.shift(), context, contextXML );
    			context = ret.expr ?
    				Sizzle.filter( ret.expr, ret.set )[0] :
    				ret.set[0];
    		}

    		if ( context ) {
    			ret = seed ?
    				{ expr: parts.pop(), set: makeArray(seed) } :
    				Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );

    			set = ret.expr ?
    				Sizzle.filter( ret.expr, ret.set ) :
    				ret.set;

    			if ( parts.length > 0 ) {
    				checkSet = makeArray( set );

    			} else {
    				prune = false;
    			}

    			while ( parts.length ) {
    				cur = parts.pop();
    				pop = cur;

    				if ( !Expr.relative[ cur ] ) {
    					cur = "";
    				} else {
    					pop = parts.pop();
    				}

    				if ( pop == null ) {
    					pop = context;
    				}

    				Expr.relative[ cur ]( checkSet, pop, contextXML );
    			}

    		} else {
    			checkSet = parts = [];
    		}
    	}

    	if ( !checkSet ) {
    		checkSet = set;
    	}

    	if ( !checkSet ) {
    		Sizzle.error( cur || selector );
    	}

    	if ( toString.call(checkSet) === "[object Array]" ) {
    		if ( !prune ) {
    			results.push.apply( results, checkSet );

    		} else if ( context && context.nodeType === 1 ) {
    			for ( i = 0; checkSet[i] != null; i++ ) {
    				if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && Sizzle.contains(context, checkSet[i])) ) {
    					results.push( set[i] );
    				}
    			}

    		} else {
    			for ( i = 0; checkSet[i] != null; i++ ) {
    				if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
    					results.push( set[i] );
    				}
    			}
    		}

    	} else {
    		makeArray( checkSet, results );
    	}

    	if ( extra ) {
    		Sizzle( extra, origContext, results, seed );
    		Sizzle.uniqueSort( results );
    	}

    	return results;
    };

    Sizzle.uniqueSort = function( results ) {
    	if ( sortOrder ) {
    		hasDuplicate = baseHasDuplicate;
    		results.sort( sortOrder );

    		if ( hasDuplicate ) {
    			for ( var i = 1; i < results.length; i++ ) {
    				if ( results[i] === results[ i - 1 ] ) {
    					results.splice( i--, 1 );
    				}
    			}
    		}
    	}

    	return results;
    };

    Sizzle.matches = function( expr, set ) {
    	return Sizzle( expr, null, null, set );
    };

    Sizzle.matchesSelector = function( node, expr ) {
    	return Sizzle( expr, null, null, [node] ).length > 0;
    };

    Sizzle.find = function( expr, context, isXML ) {
    	var set;

    	if ( !expr ) {
    		return [];
    	}

    	for ( var i = 0, l = Expr.order.length; i < l; i++ ) {
    		var match,
    			type = Expr.order[i];

    		if ( (match = Expr.leftMatch[ type ].exec( expr )) ) {
    			var left = match[1];
    			match.splice( 1, 1 );

    			if ( left.substr( left.length - 1 ) !== "\\" ) {
    				match[1] = (match[1] || "").replace( rBackslash, "" );
    				set = Expr.find[ type ]( match, context, isXML );

    				if ( set != null ) {
    					expr = expr.replace( Expr.match[ type ], "" );
    					break;
    				}
    			}
    		}
    	}

    	if ( !set ) {
    		set = typeof context.getElementsByTagName !== "undefined" ?
    			context.getElementsByTagName( "*" ) :
    			[];
    	}

    	return { set: set, expr: expr };
    };

    Sizzle.filter = function( expr, set, inplace, not ) {
    	var match, anyFound,
    		old = expr,
    		result = [],
    		curLoop = set,
    		isXMLFilter = set && set[0] && Sizzle.isXML( set[0] );

    	while ( expr && set.length ) {
    		for ( var type in Expr.filter ) {
    			if ( (match = Expr.leftMatch[ type ].exec( expr )) != null && match[2] ) {
    				var found, item,
    					filter = Expr.filter[ type ],
    					left = match[1];

    				anyFound = false;

    				match.splice(1,1);

    				if ( left.substr( left.length - 1 ) === "\\" ) {
    					continue;
    				}

    				if ( curLoop === result ) {
    					result = [];
    				}

    				if ( Expr.preFilter[ type ] ) {
    					match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

    					if ( !match ) {
    						anyFound = found = true;

    					} else if ( match === true ) {
    						continue;
    					}
    				}

    				if ( match ) {
    					for ( var i = 0; (item = curLoop[i]) != null; i++ ) {
    						if ( item ) {
    							found = filter( item, match, i, curLoop );
    							var pass = not ^ !!found;

    							if ( inplace && found != null ) {
    								if ( pass ) {
    									anyFound = true;

    								} else {
    									curLoop[i] = false;
    								}

    							} else if ( pass ) {
    								result.push( item );
    								anyFound = true;
    							}
    						}
    					}
    				}

    				if ( found !== undefined ) {
    					if ( !inplace ) {
    						curLoop = result;
    					}

    					expr = expr.replace( Expr.match[ type ], "" );

    					if ( !anyFound ) {
    						return [];
    					}

    					break;
    				}
    			}
    		}

    		// Improper expression
    		if ( expr === old ) {
    			if ( anyFound == null ) {
    				Sizzle.error( expr );

    			} else {
    				break;
    			}
    		}

    		old = expr;
    	}

    	return curLoop;
    };

    Sizzle.error = function( msg ) {
    	throw "Syntax error, unrecognized expression: " + msg;
    };

    var Expr = Sizzle.selectors = {
    	order: [ "ID", "NAME", "TAG" ],

    	match: {
    		ID: /#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
    		CLASS: /\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
    		NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,
    		ATTR: /\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,
    		TAG: /^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,
    		CHILD: /:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,
    		POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,
    		PSEUDO: /:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/
    	},

    	leftMatch: {},

    	attrMap: {
    		"class": "className",
    		"for": "htmlFor"
    	},

    	attrHandle: {
    		href: function( elem ) {
    			return elem.getAttribute( "href" );
    		},
    		type: function( elem ) {
    			return elem.getAttribute( "type" );
    		}
    	},

    	relative: {
    		"+": function(checkSet, part){
    			var isPartStr = typeof part === "string",
    				isTag = isPartStr && !rNonWord.test( part ),
    				isPartStrNotTag = isPartStr && !isTag;

    			if ( isTag ) {
    				part = part.toLowerCase();
    			}

    			for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
    				if ( (elem = checkSet[i]) ) {
    					while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

    					checkSet[i] = isPartStrNotTag || elem && elem.nodeName.toLowerCase() === part ?
    						elem || false :
    						elem === part;
    				}
    			}

    			if ( isPartStrNotTag ) {
    				Sizzle.filter( part, checkSet, true );
    			}
    		},

    		">": function( checkSet, part ) {
    			var elem,
    				isPartStr = typeof part === "string",
    				i = 0,
    				l = checkSet.length;

    			if ( isPartStr && !rNonWord.test( part ) ) {
    				part = part.toLowerCase();

    				for ( ; i < l; i++ ) {
    					elem = checkSet[i];

    					if ( elem ) {
    						var parent = elem.parentNode;
    						checkSet[i] = parent.nodeName.toLowerCase() === part ? parent : false;
    					}
    				}

    			} else {
    				for ( ; i < l; i++ ) {
    					elem = checkSet[i];

    					if ( elem ) {
    						checkSet[i] = isPartStr ?
    							elem.parentNode :
    							elem.parentNode === part;
    					}
    				}

    				if ( isPartStr ) {
    					Sizzle.filter( part, checkSet, true );
    				}
    			}
    		},

    		"": function(checkSet, part, isXML){
    			var nodeCheck,
    				doneName = done++,
    				checkFn = dirCheck;

    			if ( typeof part === "string" && !rNonWord.test( part ) ) {
    				part = part.toLowerCase();
    				nodeCheck = part;
    				checkFn = dirNodeCheck;
    			}

    			checkFn( "parentNode", part, doneName, checkSet, nodeCheck, isXML );
    		},

    		"~": function( checkSet, part, isXML ) {
    			var nodeCheck,
    				doneName = done++,
    				checkFn = dirCheck;

    			if ( typeof part === "string" && !rNonWord.test( part ) ) {
    				part = part.toLowerCase();
    				nodeCheck = part;
    				checkFn = dirNodeCheck;
    			}

    			checkFn( "previousSibling", part, doneName, checkSet, nodeCheck, isXML );
    		}
    	},

    	find: {
    		ID: function( match, context, isXML ) {
    			if ( typeof context.getElementById !== "undefined" && !isXML ) {
    				var m = context.getElementById(match[1]);
    				// Check parentNode to catch when Blackberry 4.6 returns
    				// nodes that are no longer in the document #6963
    				return m && m.parentNode ? [m] : [];
    			}
    		},

    		NAME: function( match, context ) {
    			if ( typeof context.getElementsByName !== "undefined" ) {
    				var ret = [],
    					results = context.getElementsByName( match[1] );

    				for ( var i = 0, l = results.length; i < l; i++ ) {
    					if ( results[i].getAttribute("name") === match[1] ) {
    						ret.push( results[i] );
    					}
    				}

    				return ret.length === 0 ? null : ret;
    			}
    		},

    		TAG: function( match, context ) {
    			if ( typeof context.getElementsByTagName !== "undefined" ) {
    				return context.getElementsByTagName( match[1] );
    			}
    		}
    	},
    	preFilter: {
    		CLASS: function( match, curLoop, inplace, result, not, isXML ) {
    			match = " " + match[1].replace( rBackslash, "" ) + " ";

    			if ( isXML ) {
    				return match;
    			}

    			for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
    				if ( elem ) {
    					if ( not ^ (elem.className && (" " + elem.className + " ").replace(/[\t\n\r]/g, " ").indexOf(match) >= 0) ) {
    						if ( !inplace ) {
    							result.push( elem );
    						}

    					} else if ( inplace ) {
    						curLoop[i] = false;
    					}
    				}
    			}

    			return false;
    		},

    		ID: function( match ) {
    			return match[1].replace( rBackslash, "" );
    		},

    		TAG: function( match, curLoop ) {
    			return match[1].replace( rBackslash, "" ).toLowerCase();
    		},

    		CHILD: function( match ) {
    			if ( match[1] === "nth" ) {
    				if ( !match[2] ) {
    					Sizzle.error( match[0] );
    				}

    				match[2] = match[2].replace(/^\+|\s*/g, '');

    				// parse equations like 'even', 'odd', '5', '2n', '3n+2', '4n-1', '-n+6'
    				var test = /(-?)(\d*)(?:n([+\-]?\d*))?/.exec(
    					match[2] === "even" && "2n" || match[2] === "odd" && "2n+1" ||
    					!/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

    				// calculate the numbers (first)n+(last) including if they are negative
    				match[2] = (test[1] + (test[2] || 1)) - 0;
    				match[3] = test[3] - 0;
    			}
    			else if ( match[2] ) {
    				Sizzle.error( match[0] );
    			}

    			// TODO: Move to normal caching system
    			match[0] = done++;

    			return match;
    		},

    		ATTR: function( match, curLoop, inplace, result, not, isXML ) {
    			var name = match[1] = match[1].replace( rBackslash, "" );

    			if ( !isXML && Expr.attrMap[name] ) {
    				match[1] = Expr.attrMap[name];
    			}

    			// Handle if an un-quoted value was used
    			match[4] = ( match[4] || match[5] || "" ).replace( rBackslash, "" );

    			if ( match[2] === "~=" ) {
    				match[4] = " " + match[4] + " ";
    			}

    			return match;
    		},

    		PSEUDO: function( match, curLoop, inplace, result, not ) {
    			if ( match[1] === "not" ) {
    				// If we're dealing with a complex expression, or a simple one
    				if ( ( chunker.exec(match[3]) || "" ).length > 1 || /^\w/.test(match[3]) ) {
    					match[3] = Sizzle(match[3], null, null, curLoop);

    				} else {
    					var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);

    					if ( !inplace ) {
    						result.push.apply( result, ret );
    					}

    					return false;
    				}

    			} else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
    				return true;
    			}

    			return match;
    		},

    		POS: function( match ) {
    			match.unshift( true );

    			return match;
    		}
    	},

    	filters: {
    		enabled: function( elem ) {
    			return elem.disabled === false && elem.type !== "hidden";
    		},

    		disabled: function( elem ) {
    			return elem.disabled === true;
    		},

    		checked: function( elem ) {
    			return elem.checked === true;
    		},

    		selected: function( elem ) {
    			// Accessing this property makes selected-by-default
    			// options in Safari work properly
    			if ( elem.parentNode ) {
    				elem.parentNode.selectedIndex;
    			}

    			return elem.selected === true;
    		},

    		parent: function( elem ) {
    			return !!elem.firstChild;
    		},

    		empty: function( elem ) {
    			return !elem.firstChild;
    		},

    		has: function( elem, i, match ) {
    			return !!Sizzle( match[3], elem ).length;
    		},

    		header: function( elem ) {
    			return (/h\d/i).test( elem.nodeName );
    		},

    		text: function( elem ) {
    			var attr = elem.getAttribute( "type" ), type = elem.type;
    			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc) 
    			// use getAttribute instead to test this case
    			return elem.nodeName.toLowerCase() === "input" && "text" === type && ( attr === type || attr === null );
    		},

    		radio: function( elem ) {
    			return elem.nodeName.toLowerCase() === "input" && "radio" === elem.type;
    		},

    		checkbox: function( elem ) {
    			return elem.nodeName.toLowerCase() === "input" && "checkbox" === elem.type;
    		},

    		file: function( elem ) {
    			return elem.nodeName.toLowerCase() === "input" && "file" === elem.type;
    		},

    		password: function( elem ) {
    			return elem.nodeName.toLowerCase() === "input" && "password" === elem.type;
    		},

    		submit: function( elem ) {
    			var name = elem.nodeName.toLowerCase();
    			return (name === "input" || name === "button") && "submit" === elem.type;
    		},

    		image: function( elem ) {
    			return elem.nodeName.toLowerCase() === "input" && "image" === elem.type;
    		},

    		reset: function( elem ) {
    			var name = elem.nodeName.toLowerCase();
    			return (name === "input" || name === "button") && "reset" === elem.type;
    		},

    		button: function( elem ) {
    			var name = elem.nodeName.toLowerCase();
    			return name === "input" && "button" === elem.type || name === "button";
    		},

    		input: function( elem ) {
    			return (/input|select|textarea|button/i).test( elem.nodeName );
    		},

    		focus: function( elem ) {
    			return elem === elem.ownerDocument.activeElement;
    		}
    	},
    	setFilters: {
    		first: function( elem, i ) {
    			return i === 0;
    		},

    		last: function( elem, i, match, array ) {
    			return i === array.length - 1;
    		},

    		even: function( elem, i ) {
    			return i % 2 === 0;
    		},

    		odd: function( elem, i ) {
    			return i % 2 === 1;
    		},

    		lt: function( elem, i, match ) {
    			return i < match[3] - 0;
    		},

    		gt: function( elem, i, match ) {
    			return i > match[3] - 0;
    		},

    		nth: function( elem, i, match ) {
    			return match[3] - 0 === i;
    		},

    		eq: function( elem, i, match ) {
    			return match[3] - 0 === i;
    		}
    	},
    	filter: {
    		PSEUDO: function( elem, match, i, array ) {
    			var name = match[1],
    				filter = Expr.filters[ name ];

    			if ( filter ) {
    				return filter( elem, i, match, array );

    			} else if ( name === "contains" ) {
    				return (elem.textContent || elem.innerText || Sizzle.getText([ elem ]) || "").indexOf(match[3]) >= 0;

    			} else if ( name === "not" ) {
    				var not = match[3];

    				for ( var j = 0, l = not.length; j < l; j++ ) {
    					if ( not[j] === elem ) {
    						return false;
    					}
    				}

    				return true;

    			} else {
    				Sizzle.error( name );
    			}
    		},

    		CHILD: function( elem, match ) {
    			var type = match[1],
    				node = elem;

    			switch ( type ) {
    				case "only":
    				case "first":
    					while ( (node = node.previousSibling) )	 {
    						if ( node.nodeType === 1 ) { 
    							return false; 
    						}
    					}

    					if ( type === "first" ) { 
    						return true; 
    					}

    					node = elem;

    				case "last":
    					while ( (node = node.nextSibling) )	 {
    						if ( node.nodeType === 1 ) { 
    							return false; 
    						}
    					}

    					return true;

    				case "nth":
    					var first = match[2],
    						last = match[3];

    					if ( first === 1 && last === 0 ) {
    						return true;
    					}

    					var doneName = match[0],
    						parent = elem.parentNode;

    					if ( parent && (parent.sizcache !== doneName || !elem.nodeIndex) ) {
    						var count = 0;

    						for ( node = parent.firstChild; node; node = node.nextSibling ) {
    							if ( node.nodeType === 1 ) {
    								node.nodeIndex = ++count;
    							}
    						} 

    						parent.sizcache = doneName;
    					}

    					var diff = elem.nodeIndex - last;

    					if ( first === 0 ) {
    						return diff === 0;

    					} else {
    						return ( diff % first === 0 && diff / first >= 0 );
    					}
    			}
    		},

    		ID: function( elem, match ) {
    			return elem.nodeType === 1 && elem.getAttribute("id") === match;
    		},

    		TAG: function( elem, match ) {
    			return (match === "*" && elem.nodeType === 1) || elem.nodeName.toLowerCase() === match;
    		},

    		CLASS: function( elem, match ) {
    			return (" " + (elem.className || elem.getAttribute("class")) + " ")
    				.indexOf( match ) > -1;
    		},

    		ATTR: function( elem, match ) {
    			var name = match[1],
    				result = Expr.attrHandle[ name ] ?
    					Expr.attrHandle[ name ]( elem ) :
    					elem[ name ] != null ?
    						elem[ name ] :
    						elem.getAttribute( name ),
    				value = result + "",
    				type = match[2],
    				check = match[4];

    			return result == null ?
    				type === "!=" :
    				type === "=" ?
    				value === check :
    				type === "*=" ?
    				value.indexOf(check) >= 0 :
    				type === "~=" ?
    				(" " + value + " ").indexOf(check) >= 0 :
    				!check ?
    				value && result !== false :
    				type === "!=" ?
    				value !== check :
    				type === "^=" ?
    				value.indexOf(check) === 0 :
    				type === "$=" ?
    				value.substr(value.length - check.length) === check :
    				type === "|=" ?
    				value === check || value.substr(0, check.length + 1) === check + "-" :
    				false;
    		},

    		POS: function( elem, match, i, array ) {
    			var name = match[2],
    				filter = Expr.setFilters[ name ];

    			if ( filter ) {
    				return filter( elem, i, match, array );
    			}
    		}
    	}
    };

    var origPOS = Expr.match.POS,
    	fescape = function(all, num){
    		return "\\" + (num - 0 + 1);
    	};

    for ( var type in Expr.match ) {
    	Expr.match[ type ] = new RegExp( Expr.match[ type ].source + (/(?![^\[]*\])(?![^\(]*\))/.source) );
    	Expr.leftMatch[ type ] = new RegExp( /(^(?:.|\r|\n)*?)/.source + Expr.match[ type ].source.replace(/\\(\d+)/g, fescape) );
    }

    var makeArray = function( array, results ) {
    	array = Array.prototype.slice.call( array, 0 );

    	if ( results ) {
    		results.push.apply( results, array );
    		return results;
    	}

    	return array;
    };

    // Perform a simple check to determine if the browser is capable of
    // converting a NodeList to an array using builtin methods.
    // Also verifies that the returned array holds DOM nodes
    // (which is not the case in the Blackberry browser)
    try {
    	Array.prototype.slice.call( document.documentElement.childNodes, 0 )[0].nodeType;

    // Provide a fallback method if it does not work
    } catch( e ) {
    	makeArray = function( array, results ) {
    		var i = 0,
    			ret = results || [];

    		if ( toString.call(array) === "[object Array]" ) {
    			Array.prototype.push.apply( ret, array );

    		} else {
    			if ( typeof array.length === "number" ) {
    				for ( var l = array.length; i < l; i++ ) {
    					ret.push( array[i] );
    				}

    			} else {
    				for ( ; array[i]; i++ ) {
    					ret.push( array[i] );
    				}
    			}
    		}

    		return ret;
    	};
    }

    var sortOrder, siblingCheck;

    if ( document.documentElement.compareDocumentPosition ) {
    	sortOrder = function( a, b ) {
    		if ( a === b ) {
    			hasDuplicate = true;
    			return 0;
    		}

    		if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
    			return a.compareDocumentPosition ? -1 : 1;
    		}

    		return a.compareDocumentPosition(b) & 4 ? -1 : 1;
    	};

    } else {
    	sortOrder = function( a, b ) {
    		// The nodes are identical, we can exit early
    		if ( a === b ) {
    			hasDuplicate = true;
    			return 0;

    		// Fallback to using sourceIndex (in IE) if it's available on both nodes
    		} else if ( a.sourceIndex && b.sourceIndex ) {
    			return a.sourceIndex - b.sourceIndex;
    		}

    		var al, bl,
    			ap = [],
    			bp = [],
    			aup = a.parentNode,
    			bup = b.parentNode,
    			cur = aup;

    		// If the nodes are siblings (or identical) we can do a quick check
    		if ( aup === bup ) {
    			return siblingCheck( a, b );

    		// If no parents were found then the nodes are disconnected
    		} else if ( !aup ) {
    			return -1;

    		} else if ( !bup ) {
    			return 1;
    		}

    		// Otherwise they're somewhere else in the tree so we need
    		// to build up a full list of the parentNodes for comparison
    		while ( cur ) {
    			ap.unshift( cur );
    			cur = cur.parentNode;
    		}

    		cur = bup;

    		while ( cur ) {
    			bp.unshift( cur );
    			cur = cur.parentNode;
    		}

    		al = ap.length;
    		bl = bp.length;

    		// Start walking down the tree looking for a discrepancy
    		for ( var i = 0; i < al && i < bl; i++ ) {
    			if ( ap[i] !== bp[i] ) {
    				return siblingCheck( ap[i], bp[i] );
    			}
    		}

    		// We ended someplace up the tree so do a sibling check
    		return i === al ?
    			siblingCheck( a, bp[i], -1 ) :
    			siblingCheck( ap[i], b, 1 );
    	};

    	siblingCheck = function( a, b, ret ) {
    		if ( a === b ) {
    			return ret;
    		}

    		var cur = a.nextSibling;

    		while ( cur ) {
    			if ( cur === b ) {
    				return -1;
    			}

    			cur = cur.nextSibling;
    		}

    		return 1;
    	};
    }

    // Utility function for retreiving the text value of an array of DOM nodes
    Sizzle.getText = function( elems ) {
    	var ret = "", elem;

    	for ( var i = 0; elems[i]; i++ ) {
    		elem = elems[i];

    		// Get the text from text nodes and CDATA nodes
    		if ( elem.nodeType === 3 || elem.nodeType === 4 ) {
    			ret += elem.nodeValue;

    		// Traverse everything else, except comment nodes
    		} else if ( elem.nodeType !== 8 ) {
    			ret += Sizzle.getText( elem.childNodes );
    		}
    	}

    	return ret;
    };

    // Check to see if the browser returns elements by name when
    // querying by getElementById (and provide a workaround)
    (function(){
    	// We're going to inject a fake input element with a specified name
    	var form = document.createElement("div"),
    		id = "script" + (new Date()).getTime(),
    		root = document.documentElement;

    	form.innerHTML = "<a name='" + id + "'/>";

    	// Inject it into the root element, check its status, and remove it quickly
    	root.insertBefore( form, root.firstChild );

    	// The workaround has to do additional checks after a getElementById
    	// Which slows things down for other browsers (hence the branching)
    	if ( document.getElementById( id ) ) {
    		Expr.find.ID = function( match, context, isXML ) {
    			if ( typeof context.getElementById !== "undefined" && !isXML ) {
    				var m = context.getElementById(match[1]);

    				return m ?
    					m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ?
    						[m] :
    						undefined :
    					[];
    			}
    		};

    		Expr.filter.ID = function( elem, match ) {
    			var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");

    			return elem.nodeType === 1 && node && node.nodeValue === match;
    		};
    	}

    	root.removeChild( form );

    	// release memory in IE
    	root = form = null;
    })();

    (function(){
    	// Check to see if the browser returns only elements
    	// when doing getElementsByTagName("*")

    	// Create a fake element
    	var div = document.createElement("div");
    	div.appendChild( document.createComment("") );

    	// Make sure no comments are found
    	if ( div.getElementsByTagName("*").length > 0 ) {
    		Expr.find.TAG = function( match, context ) {
    			var results = context.getElementsByTagName( match[1] );

    			// Filter out possible comments
    			if ( match[1] === "*" ) {
    				var tmp = [];

    				for ( var i = 0; results[i]; i++ ) {
    					if ( results[i].nodeType === 1 ) {
    						tmp.push( results[i] );
    					}
    				}

    				results = tmp;
    			}

    			return results;
    		};
    	}

    	// Check to see if an attribute returns normalized href attributes
    	div.innerHTML = "<a href='#'></a>";

    	if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
    			div.firstChild.getAttribute("href") !== "#" ) {

    		Expr.attrHandle.href = function( elem ) {
    			return elem.getAttribute( "href", 2 );
    		};
    	}

    	// release memory in IE
    	div = null;
    })();

    if ( document.querySelectorAll ) {
    	(function(){
    		var oldSizzle = Sizzle,
    			div = document.createElement("div"),
    			id = "__sizzle__";

    		div.innerHTML = "<p class='TEST'></p>";

    		// Safari can't handle uppercase or unicode characters when
    		// in quirks mode.
    		if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
    			return;
    		}

    		Sizzle = function( query, context, extra, seed ) {
    			context = context || document;

    			// Only use querySelectorAll on non-XML documents
    			// (ID selectors don't work in non-HTML documents)
    			if ( !seed && !Sizzle.isXML(context) ) {
    				// See if we find a selector to speed up
    				var match = /^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec( query );

    				if ( match && (context.nodeType === 1 || context.nodeType === 9) ) {
    					// Speed-up: Sizzle("TAG")
    					if ( match[1] ) {
    						return makeArray( context.getElementsByTagName( query ), extra );

    					// Speed-up: Sizzle(".CLASS")
    					} else if ( match[2] && Expr.find.CLASS && context.getElementsByClassName ) {
    						return makeArray( context.getElementsByClassName( match[2] ), extra );
    					}
    				}

    				if ( context.nodeType === 9 ) {
    					// Speed-up: Sizzle("body")
    					// The body element only exists once, optimize finding it
    					if ( query === "body" && context.body ) {
    						return makeArray( [ context.body ], extra );

    					// Speed-up: Sizzle("#ID")
    					} else if ( match && match[3] ) {
    						var elem = context.getElementById( match[3] );

    						// Check parentNode to catch when Blackberry 4.6 returns
    						// nodes that are no longer in the document #6963
    						if ( elem && elem.parentNode ) {
    							// Handle the case where IE and Opera return items
    							// by name instead of ID
    							if ( elem.id === match[3] ) {
    								return makeArray( [ elem ], extra );
    							}

    						} else {
    							return makeArray( [], extra );
    						}
    					}

    					try {
    						return makeArray( context.querySelectorAll(query), extra );
    					} catch(qsaError) {}

    				// qSA works strangely on Element-rooted queries
    				// We can work around this by specifying an extra ID on the root
    				// and working up from there (Thanks to Andrew Dupont for the technique)
    				// IE 8 doesn't work on object elements
    				} else if ( context.nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
    					var oldContext = context,
    						old = context.getAttribute( "id" ),
    						nid = old || id,
    						hasParent = context.parentNode,
    						relativeHierarchySelector = /^\s*[+~]/.test( query );

    					if ( !old ) {
    						context.setAttribute( "id", nid );
    					} else {
    						nid = nid.replace( /'/g, "\\$&" );
    					}
    					if ( relativeHierarchySelector && hasParent ) {
    						context = context.parentNode;
    					}

    					try {
    						if ( !relativeHierarchySelector || hasParent ) {
    							return makeArray( context.querySelectorAll( "[id='" + nid + "'] " + query ), extra );
    						}

    					} catch(pseudoError) {
    					} finally {
    						if ( !old ) {
    							oldContext.removeAttribute( "id" );
    						}
    					}
    				}
    			}

    			return oldSizzle(query, context, extra, seed);
    		};

    		for ( var prop in oldSizzle ) {
    			Sizzle[ prop ] = oldSizzle[ prop ];
    		}

    		// release memory in IE
    		div = null;
    	})();
    }

    (function(){
    	var html = document.documentElement,
    		matches = html.matchesSelector || html.mozMatchesSelector || html.webkitMatchesSelector || html.msMatchesSelector;

    	if ( matches ) {
    		// Check to see if it's possible to do matchesSelector
    		// on a disconnected node (IE 9 fails this)
    		var disconnectedMatch = !matches.call( document.createElement( "div" ), "div" ),
    			pseudoWorks = false;

    		try {
    			// This should fail with an exception
    			// Gecko does not error, returns false instead
    			matches.call( document.documentElement, "[test!='']:sizzle" );

    		} catch( pseudoError ) {
    			pseudoWorks = true;
    		}

    		Sizzle.matchesSelector = function( node, expr ) {
    			// Make sure that attribute selectors are quoted
    			expr = expr.replace(/\=\s*([^'"\]]*)\s*\]/g, "='$1']");

    			if ( !Sizzle.isXML( node ) ) {
    				try { 
    					if ( pseudoWorks || !Expr.match.PSEUDO.test( expr ) && !/!=/.test( expr ) ) {
    						var ret = matches.call( node, expr );

    						// IE 9's matchesSelector returns false on disconnected nodes
    						if ( ret || !disconnectedMatch ||
    								// As well, disconnected nodes are said to be in a document
    								// fragment in IE 9, so check for that
    								node.document && node.document.nodeType !== 11 ) {
    							return ret;
    						}
    					}
    				} catch(e) {}
    			}

    			return Sizzle(expr, null, null, [node]).length > 0;
    		};
    	}
    })();

    (function(){
    	var div = document.createElement("div");

    	div.innerHTML = "<div class='test e'></div><div class='test'></div>";

    	// Opera can't find a second classname (in 9.6)
    	// Also, make sure that getElementsByClassName actually exists
    	if ( !div.getElementsByClassName || div.getElementsByClassName("e").length === 0 ) {
    		return;
    	}

    	// Safari caches class attributes, doesn't catch changes (in 3.2)
    	div.lastChild.className = "e";

    	if ( div.getElementsByClassName("e").length === 1 ) {
    		return;
    	}

    	Expr.order.splice(1, 0, "CLASS");
    	Expr.find.CLASS = function( match, context, isXML ) {
    		if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
    			return context.getElementsByClassName(match[1]);
    		}
    	};

    	// release memory in IE
    	div = null;
    })();

    function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
    	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
    		var elem = checkSet[i];

    		if ( elem ) {
    			var match = false;

    			elem = elem[dir];

    			while ( elem ) {
    				if ( elem.sizcache === doneName ) {
    					match = checkSet[elem.sizset];
    					break;
    				}

    				if ( elem.nodeType === 1 && !isXML ){
    					elem.sizcache = doneName;
    					elem.sizset = i;
    				}

    				if ( elem.nodeName.toLowerCase() === cur ) {
    					match = elem;
    					break;
    				}

    				elem = elem[dir];
    			}

    			checkSet[i] = match;
    		}
    	}
    }

    function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
    	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
    		var elem = checkSet[i];

    		if ( elem ) {
    			var match = false;

    			elem = elem[dir];

    			while ( elem ) {
    				if ( elem.sizcache === doneName ) {
    					match = checkSet[elem.sizset];
    					break;
    				}

    				if ( elem.nodeType === 1 ) {
    					if ( !isXML ) {
    						elem.sizcache = doneName;
    						elem.sizset = i;
    					}

    					if ( typeof cur !== "string" ) {
    						if ( elem === cur ) {
    							match = true;
    							break;
    						}

    					} else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
    						match = elem;
    						break;
    					}
    				}

    				elem = elem[dir];
    			}

    			checkSet[i] = match;
    		}
    	}
    }

    if ( document.documentElement.contains ) {
    	Sizzle.contains = function( a, b ) {
    		return a !== b && (a.contains ? a.contains(b) : true);
    	};

    } else if ( document.documentElement.compareDocumentPosition ) {
    	Sizzle.contains = function( a, b ) {
    		return !!(a.compareDocumentPosition(b) & 16);
    	};

    } else {
    	Sizzle.contains = function() {
    		return false;
    	};
    }

    Sizzle.isXML = function( elem ) {
    	// documentElement is verified for cases where it doesn't yet exist
    	// (such as loading iframes in IE - #4833) 
    	var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;

    	return documentElement ? documentElement.nodeName !== "HTML" : false;
    };

    var posProcess = function( selector, context ) {
    	var match,
    		tmpSet = [],
    		later = "",
    		root = context.nodeType ? [context] : context;

    	// Position selectors must be done after the filter
    	// And so must :not(positional) so we move all PSEUDOs to the end
    	while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
    		later += match[0];
    		selector = selector.replace( Expr.match.PSEUDO, "" );
    	}

    	selector = Expr.relative[selector] ? selector + "*" : selector;

    	for ( var i = 0, l = root.length; i < l; i++ ) {
    		Sizzle( selector, root[i], tmpSet );
    	}

    	return Sizzle.filter( later, tmpSet );
    };

    // EXPOSE
    jQuery.find = Sizzle;
    jQuery.expr = Sizzle.selectors;
    jQuery.expr[":"] = jQuery.expr.filters;
    jQuery.unique = Sizzle.uniqueSort;
    jQuery.text = Sizzle.getText;
    jQuery.isXMLDoc = Sizzle.isXML;
    jQuery.contains = Sizzle.contains;


    })();


    var runtil = /Until$/,
    	rparentsprev = /^(?:parents|prevUntil|prevAll)/,
    	// Note: This RegExp should be improved, or likely pulled from Sizzle
    	rmultiselector = /,/,
    	isSimple = /^.[^:#\[\.,]*$/,
    	slice = Array.prototype.slice,
    	POS = jQuery.expr.match.POS,
    	// methods guaranteed to produce a unique set when starting from a unique set
    	guaranteedUnique = {
    		children: true,
    		contents: true,
    		next: true,
    		prev: true
    	};

    jQuery.fn.extend({
    	find: function( selector ) {
    		var self = this,
    			i, l;

    		if ( typeof selector !== "string" ) {
    			return jQuery( selector ).filter(function() {
    				for ( i = 0, l = self.length; i < l; i++ ) {
    					if ( jQuery.contains( self[ i ], this ) ) {
    						return true;
    					}
    				}
    			});
    		}

    		var ret = this.pushStack( "", "find", selector ),
    			length, n, r;

    		for ( i = 0, l = this.length; i < l; i++ ) {
    			length = ret.length;
    			jQuery.find( selector, this[i], ret );

    			if ( i > 0 ) {
    				// Make sure that the results are unique
    				for ( n = length; n < ret.length; n++ ) {
    					for ( r = 0; r < length; r++ ) {
    						if ( ret[r] === ret[n] ) {
    							ret.splice(n--, 1);
    							break;
    						}
    					}
    				}
    			}
    		}

    		return ret;
    	},

    	has: function( target ) {
    		var targets = jQuery( target );
    		return this.filter(function() {
    			for ( var i = 0, l = targets.length; i < l; i++ ) {
    				if ( jQuery.contains( this, targets[i] ) ) {
    					return true;
    				}
    			}
    		});
    	},

    	not: function( selector ) {
    		return this.pushStack( winnow(this, selector, false), "not", selector);
    	},

    	filter: function( selector ) {
    		return this.pushStack( winnow(this, selector, true), "filter", selector );
    	},

    	is: function( selector ) {
    		return !!selector && ( typeof selector === "string" ?
    			jQuery.filter( selector, this ).length > 0 :
    			this.filter( selector ).length > 0 );
    	},

    	closest: function( selectors, context ) {
    		var ret = [], i, l, cur = this[0];

    		// Array
    		if ( jQuery.isArray( selectors ) ) {
    			var match, selector,
    				matches = {},
    				level = 1;

    			if ( cur && selectors.length ) {
    				for ( i = 0, l = selectors.length; i < l; i++ ) {
    					selector = selectors[i];

    					if ( !matches[ selector ] ) {
    						matches[ selector ] = POS.test( selector ) ?
    							jQuery( selector, context || this.context ) :
    							selector;
    					}
    				}

    				while ( cur && cur.ownerDocument && cur !== context ) {
    					for ( selector in matches ) {
    						match = matches[ selector ];

    						if ( match.jquery ? match.index( cur ) > -1 : jQuery( cur ).is( match ) ) {
    							ret.push({ selector: selector, elem: cur, level: level });
    						}
    					}

    					cur = cur.parentNode;
    					level++;
    				}
    			}

    			return ret;
    		}

    		// String
    		var pos = POS.test( selectors ) || typeof selectors !== "string" ?
    				jQuery( selectors, context || this.context ) :
    				0;

    		for ( i = 0, l = this.length; i < l; i++ ) {
    			cur = this[i];

    			while ( cur ) {
    				if ( pos ? pos.index(cur) > -1 : jQuery.find.matchesSelector(cur, selectors) ) {
    					ret.push( cur );
    					break;

    				} else {
    					cur = cur.parentNode;
    					if ( !cur || !cur.ownerDocument || cur === context || cur.nodeType === 11 ) {
    						break;
    					}
    				}
    			}
    		}

    		ret = ret.length > 1 ? jQuery.unique( ret ) : ret;

    		return this.pushStack( ret, "closest", selectors );
    	},

    	// Determine the position of an element within
    	// the matched set of elements
    	index: function( elem ) {
    		if ( !elem || typeof elem === "string" ) {
    			return jQuery.inArray( this[0],
    				// If it receives a string, the selector is used
    				// If it receives nothing, the siblings are used
    				elem ? jQuery( elem ) : this.parent().children() );
    		}
    		// Locate the position of the desired element
    		return jQuery.inArray(
    			// If it receives a jQuery object, the first element is used
    			elem.jquery ? elem[0] : elem, this );
    	},

    	add: function( selector, context ) {
    		var set = typeof selector === "string" ?
    				jQuery( selector, context ) :
    				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
    			all = jQuery.merge( this.get(), set );

    		return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
    			all :
    			jQuery.unique( all ) );
    	},

    	andSelf: function() {
    		return this.add( this.prevObject );
    	}
    });

    // A painfully simple check to see if an element is disconnected
    // from a document (should be improved, where feasible).
    function isDisconnected( node ) {
    	return !node || !node.parentNode || node.parentNode.nodeType === 11;
    }

    jQuery.each({
    	parent: function( elem ) {
    		var parent = elem.parentNode;
    		return parent && parent.nodeType !== 11 ? parent : null;
    	},
    	parents: function( elem ) {
    		return jQuery.dir( elem, "parentNode" );
    	},
    	parentsUntil: function( elem, i, until ) {
    		return jQuery.dir( elem, "parentNode", until );
    	},
    	next: function( elem ) {
    		return jQuery.nth( elem, 2, "nextSibling" );
    	},
    	prev: function( elem ) {
    		return jQuery.nth( elem, 2, "previousSibling" );
    	},
    	nextAll: function( elem ) {
    		return jQuery.dir( elem, "nextSibling" );
    	},
    	prevAll: function( elem ) {
    		return jQuery.dir( elem, "previousSibling" );
    	},
    	nextUntil: function( elem, i, until ) {
    		return jQuery.dir( elem, "nextSibling", until );
    	},
    	prevUntil: function( elem, i, until ) {
    		return jQuery.dir( elem, "previousSibling", until );
    	},
    	siblings: function( elem ) {
    		return jQuery.sibling( elem.parentNode.firstChild, elem );
    	},
    	children: function( elem ) {
    		return jQuery.sibling( elem.firstChild );
    	},
    	contents: function( elem ) {
    		return jQuery.nodeName( elem, "iframe" ) ?
    			elem.contentDocument || elem.contentWindow.document :
    			jQuery.makeArray( elem.childNodes );
    	}
    }, function( name, fn ) {
    	jQuery.fn[ name ] = function( until, selector ) {
    		var ret = jQuery.map( this, fn, until ),
    			// The variable 'args' was introduced in
    			// https://github.com/jquery/jquery/commit/52a0238
    			// to work around a bug in Chrome 10 (Dev) and should be removed when the bug is fixed.
    			// http://code.google.com/p/v8/issues/detail?id=1050
    			args = slice.call(arguments);

    		if ( !runtil.test( name ) ) {
    			selector = until;
    		}

    		if ( selector && typeof selector === "string" ) {
    			ret = jQuery.filter( selector, ret );
    		}

    		ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

    		if ( (this.length > 1 || rmultiselector.test( selector )) && rparentsprev.test( name ) ) {
    			ret = ret.reverse();
    		}

    		return this.pushStack( ret, name, args.join(",") );
    	};
    });

    jQuery.extend({
    	filter: function( expr, elems, not ) {
    		if ( not ) {
    			expr = ":not(" + expr + ")";
    		}

    		return elems.length === 1 ?
    			jQuery.find.matchesSelector(elems[0], expr) ? [ elems[0] ] : [] :
    			jQuery.find.matches(expr, elems);
    	},

    	dir: function( elem, dir, until ) {
    		var matched = [],
    			cur = elem[ dir ];

    		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
    			if ( cur.nodeType === 1 ) {
    				matched.push( cur );
    			}
    			cur = cur[dir];
    		}
    		return matched;
    	},

    	nth: function( cur, result, dir, elem ) {
    		result = result || 1;
    		var num = 0;

    		for ( ; cur; cur = cur[dir] ) {
    			if ( cur.nodeType === 1 && ++num === result ) {
    				break;
    			}
    		}

    		return cur;
    	},

    	sibling: function( n, elem ) {
    		var r = [];

    		for ( ; n; n = n.nextSibling ) {
    			if ( n.nodeType === 1 && n !== elem ) {
    				r.push( n );
    			}
    		}

    		return r;
    	}
    });

    // Implement the identical functionality for filter and not
    function winnow( elements, qualifier, keep ) {

    	// Can't pass null or undefined to indexOf in Firefox 4
    	// Set to 0 to skip string check
    	qualifier = qualifier || 0;

    	if ( jQuery.isFunction( qualifier ) ) {
    		return jQuery.grep(elements, function( elem, i ) {
    			var retVal = !!qualifier.call( elem, i, elem );
    			return retVal === keep;
    		});

    	} else if ( qualifier.nodeType ) {
    		return jQuery.grep(elements, function( elem, i ) {
    			return (elem === qualifier) === keep;
    		});

    	} else if ( typeof qualifier === "string" ) {
    		var filtered = jQuery.grep(elements, function( elem ) {
    			return elem.nodeType === 1;
    		});

    		if ( isSimple.test( qualifier ) ) {
    			return jQuery.filter(qualifier, filtered, !keep);
    		} else {
    			qualifier = jQuery.filter( qualifier, filtered );
    		}
    	}

    	return jQuery.grep(elements, function( elem, i ) {
    		return (jQuery.inArray( elem, qualifier ) >= 0) === keep;
    	});
    }




    var rinlinejQuery = / jQuery\d+="(?:\d+|null)"/g,
    	rleadingWhitespace = /^\s+/,
    	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    	rtagName = /<([\w:]+)/,
    	rtbody = /<tbody/i,
    	rhtml = /<|&#?\w+;/,
    	rnocache = /<(?:script|object|embed|option|style)/i,
    	// checked="checked" or checked
    	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
    	rscriptType = /\/(java|ecma)script/i,
    	rcleanScript = /^\s*<!(?:\[CDATA\[|\-\-)/,
    	wrapMap = {
    		option: [ 1, "<select multiple='multiple'>", "</select>" ],
    		legend: [ 1, "<fieldset>", "</fieldset>" ],
    		thead: [ 1, "<table>", "</table>" ],
    		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
    		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
    		col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
    		area: [ 1, "<map>", "</map>" ],
    		_default: [ 0, "", "" ]
    	};

    wrapMap.optgroup = wrapMap.option;
    wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
    wrapMap.th = wrapMap.td;

    // IE can't serialize <link> and <script> tags normally
    if ( !jQuery.support.htmlSerialize ) {
    	wrapMap._default = [ 1, "div<div>", "</div>" ];
    }

    jQuery.fn.extend({
    	text: function( text ) {
    		if ( jQuery.isFunction(text) ) {
    			return this.each(function(i) {
    				var self = jQuery( this );

    				self.text( text.call(this, i, self.text()) );
    			});
    		}

    		if ( typeof text !== "object" && text !== undefined ) {
    			return this.empty().append( (this[0] && this[0].ownerDocument || document).createTextNode( text ) );
    		}

    		return jQuery.text( this );
    	},

    	wrapAll: function( html ) {
    		if ( jQuery.isFunction( html ) ) {
    			return this.each(function(i) {
    				jQuery(this).wrapAll( html.call(this, i) );
    			});
    		}

    		if ( this[0] ) {
    			// The elements to wrap the target around
    			var wrap = jQuery( html, this[0].ownerDocument ).eq(0).clone(true);

    			if ( this[0].parentNode ) {
    				wrap.insertBefore( this[0] );
    			}

    			wrap.map(function() {
    				var elem = this;

    				while ( elem.firstChild && elem.firstChild.nodeType === 1 ) {
    					elem = elem.firstChild;
    				}

    				return elem;
    			}).append( this );
    		}

    		return this;
    	},

    	wrapInner: function( html ) {
    		if ( jQuery.isFunction( html ) ) {
    			return this.each(function(i) {
    				jQuery(this).wrapInner( html.call(this, i) );
    			});
    		}

    		return this.each(function() {
    			var self = jQuery( this ),
    				contents = self.contents();

    			if ( contents.length ) {
    				contents.wrapAll( html );

    			} else {
    				self.append( html );
    			}
    		});
    	},

    	wrap: function( html ) {
    		return this.each(function() {
    			jQuery( this ).wrapAll( html );
    		});
    	},

    	unwrap: function() {
    		return this.parent().each(function() {
    			if ( !jQuery.nodeName( this, "body" ) ) {
    				jQuery( this ).replaceWith( this.childNodes );
    			}
    		}).end();
    	},

    	append: function() {
    		return this.domManip(arguments, true, function( elem ) {
    			if ( this.nodeType === 1 ) {
    				this.appendChild( elem );
    			}
    		});
    	},

    	prepend: function() {
    		return this.domManip(arguments, true, function( elem ) {
    			if ( this.nodeType === 1 ) {
    				this.insertBefore( elem, this.firstChild );
    			}
    		});
    	},

    	before: function() {
    		if ( this[0] && this[0].parentNode ) {
    			return this.domManip(arguments, false, function( elem ) {
    				this.parentNode.insertBefore( elem, this );
    			});
    		} else if ( arguments.length ) {
    			var set = jQuery(arguments[0]);
    			set.push.apply( set, this.toArray() );
    			return this.pushStack( set, "before", arguments );
    		}
    	},

    	after: function() {
    		if ( this[0] && this[0].parentNode ) {
    			return this.domManip(arguments, false, function( elem ) {
    				this.parentNode.insertBefore( elem, this.nextSibling );
    			});
    		} else if ( arguments.length ) {
    			var set = this.pushStack( this, "after", arguments );
    			set.push.apply( set, jQuery(arguments[0]).toArray() );
    			return set;
    		}
    	},

    	// keepData is for internal use only--do not document
    	remove: function( selector, keepData ) {
    		for ( var i = 0, elem; (elem = this[i]) != null; i++ ) {
    			if ( !selector || jQuery.filter( selector, [ elem ] ).length ) {
    				if ( !keepData && elem.nodeType === 1 ) {
    					jQuery.cleanData( elem.getElementsByTagName("*") );
    					jQuery.cleanData( [ elem ] );
    				}

    				if ( elem.parentNode ) {
    					elem.parentNode.removeChild( elem );
    				}
    			}
    		}

    		return this;
    	},

    	empty: function() {
    		for ( var i = 0, elem; (elem = this[i]) != null; i++ ) {
    			// Remove element nodes and prevent memory leaks
    			if ( elem.nodeType === 1 ) {
    				jQuery.cleanData( elem.getElementsByTagName("*") );
    			}

    			// Remove any remaining nodes
    			while ( elem.firstChild ) {
    				elem.removeChild( elem.firstChild );
    			}
    		}

    		return this;
    	},

    	clone: function( dataAndEvents, deepDataAndEvents ) {
    		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
    		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

    		return this.map( function () {
    			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
    		});
    	},

    	html: function( value ) {
    		if ( value === undefined ) {
    			return this[0] && this[0].nodeType === 1 ?
    				this[0].innerHTML.replace(rinlinejQuery, "") :
    				null;

    		// See if we can take a shortcut and just use innerHTML
    		} else if ( typeof value === "string" && !rnocache.test( value ) &&
    			(jQuery.support.leadingWhitespace || !rleadingWhitespace.test( value )) &&
    			!wrapMap[ (rtagName.exec( value ) || ["", ""])[1].toLowerCase() ] ) {

    			value = value.replace(rxhtmlTag, "<$1></$2>");

    			try {
    				for ( var i = 0, l = this.length; i < l; i++ ) {
    					// Remove element nodes and prevent memory leaks
    					if ( this[i].nodeType === 1 ) {
    						jQuery.cleanData( this[i].getElementsByTagName("*") );
    						this[i].innerHTML = value;
    					}
    				}

    			// If using innerHTML throws an exception, use the fallback method
    			} catch(e) {
    				this.empty().append( value );
    			}

    		} else if ( jQuery.isFunction( value ) ) {
    			this.each(function(i){
    				var self = jQuery( this );

    				self.html( value.call(this, i, self.html()) );
    			});

    		} else {
    			this.empty().append( value );
    		}

    		return this;
    	},

    	replaceWith: function( value ) {
    		if ( this[0] && this[0].parentNode ) {
    			// Make sure that the elements are removed from the DOM before they are inserted
    			// this can help fix replacing a parent with child elements
    			if ( jQuery.isFunction( value ) ) {
    				return this.each(function(i) {
    					var self = jQuery(this), old = self.html();
    					self.replaceWith( value.call( this, i, old ) );
    				});
    			}

    			if ( typeof value !== "string" ) {
    				value = jQuery( value ).detach();
    			}

    			return this.each(function() {
    				var next = this.nextSibling,
    					parent = this.parentNode;

    				jQuery( this ).remove();

    				if ( next ) {
    					jQuery(next).before( value );
    				} else {
    					jQuery(parent).append( value );
    				}
    			});
    		} else {
    			return this.length ?
    				this.pushStack( jQuery(jQuery.isFunction(value) ? value() : value), "replaceWith", value ) :
    				this;
    		}
    	},

    	detach: function( selector ) {
    		return this.remove( selector, true );
    	},

    	domManip: function( args, table, callback ) {
    		var results, first, fragment, parent,
    			value = args[0],
    			scripts = [];

    		// We can't cloneNode fragments that contain checked, in WebKit
    		if ( !jQuery.support.checkClone && arguments.length === 3 && typeof value === "string" && rchecked.test( value ) ) {
    			return this.each(function() {
    				jQuery(this).domManip( args, table, callback, true );
    			});
    		}

    		if ( jQuery.isFunction(value) ) {
    			return this.each(function(i) {
    				var self = jQuery(this);
    				args[0] = value.call(this, i, table ? self.html() : undefined);
    				self.domManip( args, table, callback );
    			});
    		}

    		if ( this[0] ) {
    			parent = value && value.parentNode;

    			// If we're in a fragment, just use that instead of building a new one
    			if ( jQuery.support.parentNode && parent && parent.nodeType === 11 && parent.childNodes.length === this.length ) {
    				results = { fragment: parent };

    			} else {
    				results = jQuery.buildFragment( args, this, scripts );
    			}

    			fragment = results.fragment;

    			if ( fragment.childNodes.length === 1 ) {
    				first = fragment = fragment.firstChild;
    			} else {
    				first = fragment.firstChild;
    			}

    			if ( first ) {
    				table = table && jQuery.nodeName( first, "tr" );

    				for ( var i = 0, l = this.length, lastIndex = l - 1; i < l; i++ ) {
    					callback.call(
    						table ?
    							root(this[i], first) :
    							this[i],
    						// Make sure that we do not leak memory by inadvertently discarding
    						// the original fragment (which might have attached data) instead of
    						// using it; in addition, use the original fragment object for the last
    						// item instead of first because it can end up being emptied incorrectly
    						// in certain situations (Bug #8070).
    						// Fragments from the fragment cache must always be cloned and never used
    						// in place.
    						results.cacheable || (l > 1 && i < lastIndex) ?
    							jQuery.clone( fragment, true, true ) :
    							fragment
    					);
    				}
    			}

    			if ( scripts.length ) {
    				jQuery.each( scripts, evalScript );
    			}
    		}

    		return this;
    	}
    });

    function root( elem, cur ) {
    	return jQuery.nodeName(elem, "table") ?
    		(elem.getElementsByTagName("tbody")[0] ||
    		elem.appendChild(elem.ownerDocument.createElement("tbody"))) :
    		elem;
    }

    function cloneCopyEvent( src, dest ) {

    	if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
    		return;
    	}

    	var internalKey = jQuery.expando,
    		oldData = jQuery.data( src ),
    		curData = jQuery.data( dest, oldData );

    	// Switch to use the internal data object, if it exists, for the next
    	// stage of data copying
    	if ( (oldData = oldData[ internalKey ]) ) {
    		var events = oldData.events;
    				curData = curData[ internalKey ] = jQuery.extend({}, oldData);

    		if ( events ) {
    			delete curData.handle;
    			curData.events = {};

    			for ( var type in events ) {
    				for ( var i = 0, l = events[ type ].length; i < l; i++ ) {
    					jQuery.event.add( dest, type + ( events[ type ][ i ].namespace ? "." : "" ) + events[ type ][ i ].namespace, events[ type ][ i ], events[ type ][ i ].data );
    				}
    			}
    		}
    	}
    }

    function cloneFixAttributes( src, dest ) {
    	var nodeName;

    	// We do not need to do anything for non-Elements
    	if ( dest.nodeType !== 1 ) {
    		return;
    	}

    	// clearAttributes removes the attributes, which we don't want,
    	// but also removes the attachEvent events, which we *do* want
    	if ( dest.clearAttributes ) {
    		dest.clearAttributes();
    	}

    	// mergeAttributes, in contrast, only merges back on the
    	// original attributes, not the events
    	if ( dest.mergeAttributes ) {
    		dest.mergeAttributes( src );
    	}

    	nodeName = dest.nodeName.toLowerCase();

    	// IE6-8 fail to clone children inside object elements that use
    	// the proprietary classid attribute value (rather than the type
    	// attribute) to identify the type of content to display
    	if ( nodeName === "object" ) {
    		dest.outerHTML = src.outerHTML;

    	} else if ( nodeName === "input" && (src.type === "checkbox" || src.type === "radio") ) {
    		// IE6-8 fails to persist the checked state of a cloned checkbox
    		// or radio button. Worse, IE6-7 fail to give the cloned element
    		// a checked appearance if the defaultChecked value isn't also set
    		if ( src.checked ) {
    			dest.defaultChecked = dest.checked = src.checked;
    		}

    		// IE6-7 get confused and end up setting the value of a cloned
    		// checkbox/radio button to an empty string instead of "on"
    		if ( dest.value !== src.value ) {
    			dest.value = src.value;
    		}

    	// IE6-8 fails to return the selected option to the default selected
    	// state when cloning options
    	} else if ( nodeName === "option" ) {
    		dest.selected = src.defaultSelected;

    	// IE6-8 fails to set the defaultValue to the correct value when
    	// cloning other types of input fields
    	} else if ( nodeName === "input" || nodeName === "textarea" ) {
    		dest.defaultValue = src.defaultValue;
    	}

    	// Event data gets referenced instead of copied if the expando
    	// gets copied too
    	dest.removeAttribute( jQuery.expando );
    }

    jQuery.buildFragment = function( args, nodes, scripts ) {
    	var fragment, cacheable, cacheresults, doc;

      // nodes may contain either an explicit document object,
      // a jQuery collection or context object.
      // If nodes[0] contains a valid object to assign to doc
      if ( nodes && nodes[0] ) {
        doc = nodes[0].ownerDocument || nodes[0];
      }

      // Ensure that an attr object doesn't incorrectly stand in as a document object
    	// Chrome and Firefox seem to allow this to occur and will throw exception
    	// Fixes #8950
    	if ( !doc.createDocumentFragment ) {
    		doc = document;
    	}

    	// Only cache "small" (1/2 KB) HTML strings that are associated with the main document
    	// Cloning options loses the selected state, so don't cache them
    	// IE 6 doesn't like it when you put <object> or <embed> elements in a fragment
    	// Also, WebKit does not clone 'checked' attributes on cloneNode, so don't cache
    	if ( args.length === 1 && typeof args[0] === "string" && args[0].length < 512 && doc === document &&
    		args[0].charAt(0) === "<" && !rnocache.test( args[0] ) && (jQuery.support.checkClone || !rchecked.test( args[0] )) ) {

    		cacheable = true;

    		cacheresults = jQuery.fragments[ args[0] ];
    		if ( cacheresults && cacheresults !== 1 ) {
    			fragment = cacheresults;
    		}
    	}

    	if ( !fragment ) {
    		fragment = doc.createDocumentFragment();
    		jQuery.clean( args, doc, fragment, scripts );
    	}

    	if ( cacheable ) {
    		jQuery.fragments[ args[0] ] = cacheresults ? fragment : 1;
    	}

    	return { fragment: fragment, cacheable: cacheable };
    };

    jQuery.fragments = {};

    jQuery.each({
    	appendTo: "append",
    	prependTo: "prepend",
    	insertBefore: "before",
    	insertAfter: "after",
    	replaceAll: "replaceWith"
    }, function( name, original ) {
    	jQuery.fn[ name ] = function( selector ) {
    		var ret = [],
    			insert = jQuery( selector ),
    			parent = this.length === 1 && this[0].parentNode;

    		if ( parent && parent.nodeType === 11 && parent.childNodes.length === 1 && insert.length === 1 ) {
    			insert[ original ]( this[0] );
    			return this;

    		} else {
    			for ( var i = 0, l = insert.length; i < l; i++ ) {
    				var elems = (i > 0 ? this.clone(true) : this).get();
    				jQuery( insert[i] )[ original ]( elems );
    				ret = ret.concat( elems );
    			}

    			return this.pushStack( ret, name, insert.selector );
    		}
    	};
    });

    function getAll( elem ) {
    	if ( "getElementsByTagName" in elem ) {
    		return elem.getElementsByTagName( "*" );

    	} else if ( "querySelectorAll" in elem ) {
    		return elem.querySelectorAll( "*" );

    	} else {
    		return [];
    	}
    }

    // Used in clean, fixes the defaultChecked property
    function fixDefaultChecked( elem ) {
    	if ( elem.type === "checkbox" || elem.type === "radio" ) {
    		elem.defaultChecked = elem.checked;
    	}
    }
    // Finds all inputs and passes them to fixDefaultChecked
    function findInputs( elem ) {
    	if ( jQuery.nodeName( elem, "input" ) ) {
    		fixDefaultChecked( elem );
    	} else if ( "getElementsByTagName" in elem ) {
    		jQuery.grep( elem.getElementsByTagName("input"), fixDefaultChecked );
    	}
    }

    jQuery.extend({
    	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
    		var clone = elem.cloneNode(true),
    				srcElements,
    				destElements,
    				i;

    		if ( (!jQuery.support.noCloneEvent || !jQuery.support.noCloneChecked) &&
    				(elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {
    			// IE copies events bound via attachEvent when using cloneNode.
    			// Calling detachEvent on the clone will also remove the events
    			// from the original. In order to get around this, we use some
    			// proprietary methods to clear the events. Thanks to MooTools
    			// guys for this hotness.

    			cloneFixAttributes( elem, clone );

    			// Using Sizzle here is crazy slow, so we use getElementsByTagName
    			// instead
    			srcElements = getAll( elem );
    			destElements = getAll( clone );

    			// Weird iteration because IE will replace the length property
    			// with an element if you are cloning the body and one of the
    			// elements on the page has a name or id of "length"
    			for ( i = 0; srcElements[i]; ++i ) {
    				cloneFixAttributes( srcElements[i], destElements[i] );
    			}
    		}

    		// Copy the events from the original to the clone
    		if ( dataAndEvents ) {
    			cloneCopyEvent( elem, clone );

    			if ( deepDataAndEvents ) {
    				srcElements = getAll( elem );
    				destElements = getAll( clone );

    				for ( i = 0; srcElements[i]; ++i ) {
    					cloneCopyEvent( srcElements[i], destElements[i] );
    				}
    			}
    		}

    		srcElements = destElements = null;

    		// Return the cloned set
    		return clone;
    	},

    	clean: function( elems, context, fragment, scripts ) {
    		var checkScriptType;

    		context = context || document;

    		// !context.createElement fails in IE with an error but returns typeof 'object'
    		if ( typeof context.createElement === "undefined" ) {
    			context = context.ownerDocument || context[0] && context[0].ownerDocument || document;
    		}

    		var ret = [], j;

    		for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
    			if ( typeof elem === "number" ) {
    				elem += "";
    			}

    			if ( !elem ) {
    				continue;
    			}

    			// Convert html string into DOM nodes
    			if ( typeof elem === "string" ) {
    				if ( !rhtml.test( elem ) ) {
    					elem = context.createTextNode( elem );
    				} else {
    					// Fix "XHTML"-style tags in all browsers
    					elem = elem.replace(rxhtmlTag, "<$1></$2>");

    					// Trim whitespace, otherwise indexOf won't work as expected
    					var tag = (rtagName.exec( elem ) || ["", ""])[1].toLowerCase(),
    						wrap = wrapMap[ tag ] || wrapMap._default,
    						depth = wrap[0],
    						div = context.createElement("div");

    					// Go to html and back, then peel off extra wrappers
    					div.innerHTML = wrap[1] + elem + wrap[2];

    					// Move to the right depth
    					while ( depth-- ) {
    						div = div.lastChild;
    					}

    					// Remove IE's autoinserted <tbody> from table fragments
    					if ( !jQuery.support.tbody ) {

    						// String was a <table>, *may* have spurious <tbody>
    						var hasBody = rtbody.test(elem),
    							tbody = tag === "table" && !hasBody ?
    								div.firstChild && div.firstChild.childNodes :

    								// String was a bare <thead> or <tfoot>
    								wrap[1] === "<table>" && !hasBody ?
    									div.childNodes :
    									[];

    						for ( j = tbody.length - 1; j >= 0 ; --j ) {
    							if ( jQuery.nodeName( tbody[ j ], "tbody" ) && !tbody[ j ].childNodes.length ) {
    								tbody[ j ].parentNode.removeChild( tbody[ j ] );
    							}
    						}
    					}

    					// IE completely kills leading whitespace when innerHTML is used
    					if ( !jQuery.support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
    						div.insertBefore( context.createTextNode( rleadingWhitespace.exec(elem)[0] ), div.firstChild );
    					}

    					elem = div.childNodes;
    				}
    			}

    			// Resets defaultChecked for any radios and checkboxes
    			// about to be appended to the DOM in IE 6/7 (#8060)
    			var len;
    			if ( !jQuery.support.appendChecked ) {
    				if ( elem[0] && typeof (len = elem.length) === "number" ) {
    					for ( j = 0; j < len; j++ ) {
    						findInputs( elem[j] );
    					}
    				} else {
    					findInputs( elem );
    				}
    			}

    			if ( elem.nodeType ) {
    				ret.push( elem );
    			} else {
    				ret = jQuery.merge( ret, elem );
    			}
    		}

    		if ( fragment ) {
    			checkScriptType = function( elem ) {
    				return !elem.type || rscriptType.test( elem.type );
    			};
    			for ( i = 0; ret[i]; i++ ) {
    				if ( scripts && jQuery.nodeName( ret[i], "script" ) && (!ret[i].type || ret[i].type.toLowerCase() === "text/javascript") ) {
    					scripts.push( ret[i].parentNode ? ret[i].parentNode.removeChild( ret[i] ) : ret[i] );

    				} else {
    					if ( ret[i].nodeType === 1 ) {
    						var jsTags = jQuery.grep( ret[i].getElementsByTagName( "script" ), checkScriptType );

    						ret.splice.apply( ret, [i + 1, 0].concat( jsTags ) );
    					}
    					fragment.appendChild( ret[i] );
    				}
    			}
    		}

    		return ret;
    	},

    	cleanData: function( elems ) {
    		var data, id, cache = jQuery.cache, internalKey = jQuery.expando, special = jQuery.event.special,
    			deleteExpando = jQuery.support.deleteExpando;

    		for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
    			if ( elem.nodeName && jQuery.noData[elem.nodeName.toLowerCase()] ) {
    				continue;
    			}

    			id = elem[ jQuery.expando ];

    			if ( id ) {
    				data = cache[ id ] && cache[ id ][ internalKey ];

    				if ( data && data.events ) {
    					for ( var type in data.events ) {
    						if ( special[ type ] ) {
    							jQuery.event.remove( elem, type );

    						// This is a shortcut to avoid jQuery.event.remove's overhead
    						} else {
    							jQuery.removeEvent( elem, type, data.handle );
    						}
    					}

    					// Null the DOM reference to avoid IE6/7/8 leak (#7054)
    					if ( data.handle ) {
    						data.handle.elem = null;
    					}
    				}

    				if ( deleteExpando ) {
    					delete elem[ jQuery.expando ];

    				} else if ( elem.removeAttribute ) {
    					elem.removeAttribute( jQuery.expando );
    				}

    				delete cache[ id ];
    			}
    		}
    	}
    });

    function evalScript( i, elem ) {
    	if ( elem.src ) {
    		jQuery.ajax({
    			url: elem.src,
    			async: false,
    			dataType: "script"
    		});
    	} else {
    		jQuery.globalEval( ( elem.text || elem.textContent || elem.innerHTML || "" ).replace( rcleanScript, "/*$0*/" ) );
    	}

    	if ( elem.parentNode ) {
    		elem.parentNode.removeChild( elem );
    	}
    }



    var ralpha = /alpha\([^)]*\)/i,
    	ropacity = /opacity=([^)]*)/,
    	// fixed for IE9, see #8346
    	rupper = /([A-Z]|^ms)/g,
    	rnumpx = /^-?\d+(?:px)?$/i,
    	rnum = /^-?\d/,
    	rrelNum = /^[+\-]=/,
    	rrelNumFilter = /[^+\-\.\de]+/g,

    	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
    	cssWidth = [ "Left", "Right" ],
    	cssHeight = [ "Top", "Bottom" ],
    	curCSS,

    	getComputedStyle,
    	currentStyle;

    jQuery.fn.css = function( name, value ) {
    	// Setting 'undefined' is a no-op
    	if ( arguments.length === 2 && value === undefined ) {
    		return this;
    	}

    	return jQuery.access( this, name, value, true, function( elem, name, value ) {
    		return value !== undefined ?
    			jQuery.style( elem, name, value ) :
    			jQuery.css( elem, name );
    	});
    };

    jQuery.extend({
    	// Add in style property hooks for overriding the default
    	// behavior of getting and setting a style property
    	cssHooks: {
    		opacity: {
    			get: function( elem, computed ) {
    				if ( computed ) {
    					// We should always get a number back from opacity
    					var ret = curCSS( elem, "opacity", "opacity" );
    					return ret === "" ? "1" : ret;

    				} else {
    					return elem.style.opacity;
    				}
    			}
    		}
    	},

    	// Exclude the following css properties to add px
    	cssNumber: {
    		"fillOpacity": true,
    		"fontWeight": true,
    		"lineHeight": true,
    		"opacity": true,
    		"orphans": true,
    		"widows": true,
    		"zIndex": true,
    		"zoom": true
    	},

    	// Add in properties whose names you wish to fix before
    	// setting or getting the value
    	cssProps: {
    		// normalize float css property
    		"float": jQuery.support.cssFloat ? "cssFloat" : "styleFloat"
    	},

    	// Get and set the style property on a DOM Node
    	style: function( elem, name, value, extra ) {
    		// Don't set styles on text and comment nodes
    		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
    			return;
    		}

    		// Make sure that we're working with the right name
    		var ret, type, origName = jQuery.camelCase( name ),
    			style = elem.style, hooks = jQuery.cssHooks[ origName ];

    		name = jQuery.cssProps[ origName ] || origName;

    		// Check if we're setting a value
    		if ( value !== undefined ) {
    			type = typeof value;

    			// Make sure that NaN and null values aren't set. See: #7116
    			if ( type === "number" && isNaN( value ) || value == null ) {
    				return;
    			}

    			// convert relative number strings (+= or -=) to relative numbers. #7345
    			if ( type === "string" && rrelNum.test( value ) ) {
    				value = +value.replace( rrelNumFilter, "" ) + parseFloat( jQuery.css( elem, name ) );
    				// Fixes bug #9237
    				type = "number";
    			}

    			// If a number was passed in, add 'px' to the (except for certain CSS properties)
    			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
    				value += "px";
    			}

    			// If a hook was provided, use that value, otherwise just set the specified value
    			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value )) !== undefined ) {
    				// Wrapped to prevent IE from throwing errors when 'invalid' values are provided
    				// Fixes bug #5509
    				try {
    					style[ name ] = value;
    				} catch(e) {}
    			}

    		} else {
    			// If a hook was provided get the non-computed value from there
    			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
    				return ret;
    			}

    			// Otherwise just get the value from the style object
    			return style[ name ];
    		}
    	},

    	css: function( elem, name, extra ) {
    		var ret, hooks;

    		// Make sure that we're working with the right name
    		name = jQuery.camelCase( name );
    		hooks = jQuery.cssHooks[ name ];
    		name = jQuery.cssProps[ name ] || name;

    		// cssFloat needs a special treatment
    		if ( name === "cssFloat" ) {
    			name = "float";
    		}

    		// If a hook was provided get the computed value from there
    		if ( hooks && "get" in hooks && (ret = hooks.get( elem, true, extra )) !== undefined ) {
    			return ret;

    		// Otherwise, if a way to get the computed value exists, use that
    		} else if ( curCSS ) {
    			return curCSS( elem, name );
    		}
    	},

    	// A method for quickly swapping in/out CSS properties to get correct calculations
    	swap: function( elem, options, callback ) {
    		var old = {};

    		// Remember the old values, and insert the new ones
    		for ( var name in options ) {
    			old[ name ] = elem.style[ name ];
    			elem.style[ name ] = options[ name ];
    		}

    		callback.call( elem );

    		// Revert the old values
    		for ( name in options ) {
    			elem.style[ name ] = old[ name ];
    		}
    	}
    });

    // DEPRECATED, Use jQuery.css() instead
    jQuery.curCSS = jQuery.css;

    jQuery.each(["height", "width"], function( i, name ) {
    	jQuery.cssHooks[ name ] = {
    		get: function( elem, computed, extra ) {
    			var val;

    			if ( computed ) {
    				if ( elem.offsetWidth !== 0 ) {
    					return getWH( elem, name, extra );
    				} else {
    					jQuery.swap( elem, cssShow, function() {
    						val = getWH( elem, name, extra );
    					});
    				}

    				return val;
    			}
    		},

    		set: function( elem, value ) {
    			if ( rnumpx.test( value ) ) {
    				// ignore negative width and height values #1599
    				value = parseFloat( value );

    				if ( value >= 0 ) {
    					return value + "px";
    				}

    			} else {
    				return value;
    			}
    		}
    	};
    });

    if ( !jQuery.support.opacity ) {
    	jQuery.cssHooks.opacity = {
    		get: function( elem, computed ) {
    			// IE uses filters for opacity
    			return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
    				( parseFloat( RegExp.$1 ) / 100 ) + "" :
    				computed ? "1" : "";
    		},

    		set: function( elem, value ) {
    			var style = elem.style,
    				currentStyle = elem.currentStyle;

    			// IE has trouble with opacity if it does not have layout
    			// Force it by setting the zoom level
    			style.zoom = 1;

    			// Set the alpha filter to set the opacity
    			var opacity = jQuery.isNaN( value ) ?
    				"" :
    				"alpha(opacity=" + value * 100 + ")",
    				filter = currentStyle && currentStyle.filter || style.filter || "";

    			style.filter = ralpha.test( filter ) ?
    				filter.replace( ralpha, opacity ) :
    				filter + " " + opacity;
    		}
    	};
    }

    jQuery(function() {
    	// This hook cannot be added until DOM ready because the support test
    	// for it is not run until after DOM ready
    	if ( !jQuery.support.reliableMarginRight ) {
    		jQuery.cssHooks.marginRight = {
    			get: function( elem, computed ) {
    				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
    				// Work around by temporarily setting element display to inline-block
    				var ret;
    				jQuery.swap( elem, { "display": "inline-block" }, function() {
    					if ( computed ) {
    						ret = curCSS( elem, "margin-right", "marginRight" );
    					} else {
    						ret = elem.style.marginRight;
    					}
    				});
    				return ret;
    			}
    		};
    	}
    });

    if ( document.defaultView && document.defaultView.getComputedStyle ) {
    	getComputedStyle = function( elem, name ) {
    		var ret, defaultView, computedStyle;

    		name = name.replace( rupper, "-$1" ).toLowerCase();

    		if ( !(defaultView = elem.ownerDocument.defaultView) ) {
    			return undefined;
    		}

    		if ( (computedStyle = defaultView.getComputedStyle( elem, null )) ) {
    			ret = computedStyle.getPropertyValue( name );
    			if ( ret === "" && !jQuery.contains( elem.ownerDocument.documentElement, elem ) ) {
    				ret = jQuery.style( elem, name );
    			}
    		}

    		return ret;
    	};
    }

    if ( document.documentElement.currentStyle ) {
    	currentStyle = function( elem, name ) {
    		var left,
    			ret = elem.currentStyle && elem.currentStyle[ name ],
    			rsLeft = elem.runtimeStyle && elem.runtimeStyle[ name ],
    			style = elem.style;

    		// From the awesome hack by Dean Edwards
    		// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

    		// If we're not dealing with a regular pixel number
    		// but a number that has a weird ending, we need to convert it to pixels
    		if ( !rnumpx.test( ret ) && rnum.test( ret ) ) {
    			// Remember the original values
    			left = style.left;

    			// Put in the new values to get a computed value out
    			if ( rsLeft ) {
    				elem.runtimeStyle.left = elem.currentStyle.left;
    			}
    			style.left = name === "fontSize" ? "1em" : (ret || 0);
    			ret = style.pixelLeft + "px";

    			// Revert the changed values
    			style.left = left;
    			if ( rsLeft ) {
    				elem.runtimeStyle.left = rsLeft;
    			}
    		}

    		return ret === "" ? "auto" : ret;
    	};
    }

    curCSS = getComputedStyle || currentStyle;

    function getWH( elem, name, extra ) {

    	// Start with offset property
    	var val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
    		which = name === "width" ? cssWidth : cssHeight;

    	if ( val > 0 ) {
    		if ( extra !== "border" ) {
    			jQuery.each( which, function() {
    				if ( !extra ) {
    					val -= parseFloat( jQuery.css( elem, "padding" + this ) ) || 0;
    				}
    				if ( extra === "margin" ) {
    					val += parseFloat( jQuery.css( elem, extra + this ) ) || 0;
    				} else {
    					val -= parseFloat( jQuery.css( elem, "border" + this + "Width" ) ) || 0;
    				}
    			});
    		}

    		return val + "px";
    	}

    	// Fall back to computed then uncomputed css if necessary
    	val = curCSS( elem, name, name );
    	if ( val < 0 || val == null ) {
    		val = elem.style[ name ] || 0;
    	}
    	// Normalize "", auto, and prepare for extra
    	val = parseFloat( val ) || 0;

    	// Add padding, border, margin
    	if ( extra ) {
    		jQuery.each( which, function() {
    			val += parseFloat( jQuery.css( elem, "padding" + this ) ) || 0;
    			if ( extra !== "padding" ) {
    				val += parseFloat( jQuery.css( elem, "border" + this + "Width" ) ) || 0;
    			}
    			if ( extra === "margin" ) {
    				val += parseFloat( jQuery.css( elem, extra + this ) ) || 0;
    			}
    		});
    	}

    	return val + "px";
    }

    if ( jQuery.expr && jQuery.expr.filters ) {
    	jQuery.expr.filters.hidden = function( elem ) {
    		var width = elem.offsetWidth,
    			height = elem.offsetHeight;

    		return (width === 0 && height === 0) || (!jQuery.support.reliableHiddenOffsets && (elem.style.display || jQuery.css( elem, "display" )) === "none");
    	};

    	jQuery.expr.filters.visible = function( elem ) {
    		return !jQuery.expr.filters.hidden( elem );
    	};
    }




    var r20 = /%20/g,
    	rbracket = /\[\]$/,
    	rCRLF = /\r?\n/g,
    	rhash = /#.*$/,
    	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
    	rinput = /^(?:color|date|datetime|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,
    	// #7653, #8125, #8152: local protocol detection
    	rlocalProtocol = /^(?:about|app|app\-storage|.+\-extension|file|widget):$/,
    	rnoContent = /^(?:GET|HEAD)$/,
    	rprotocol = /^\/\//,
    	rquery = /\?/,
    	rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    	rselectTextarea = /^(?:select|textarea)/i,
    	rspacesAjax = /\s+/,
    	rts = /([?&])_=[^&]*/,
    	rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/,

    	// Keep a copy of the old load method
    	_load = jQuery.fn.load,

    	/* Prefilters
    	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
    	 * 2) These are called:
    	 *    - BEFORE asking for a transport
    	 *    - AFTER param serialization (s.data is a string if s.processData is true)
    	 * 3) key is the dataType
    	 * 4) the catchall symbol "*" can be used
    	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
    	 */
    	prefilters = {},

    	/* Transports bindings
    	 * 1) key is the dataType
    	 * 2) the catchall symbol "*" can be used
    	 * 3) selection will start with transport dataType and THEN go to "*" if needed
    	 */
    	transports = {},

    	// Document location
    	ajaxLocation,

    	// Document location segments
    	ajaxLocParts;

    // #8138, IE may throw an exception when accessing
    // a field from window.location if document.domain has been set
    try {
    	ajaxLocation = location.href;
    } catch( e ) {
    	// Use the href attribute of an A element
    	// since IE will modify it given document.location
    	ajaxLocation = document.createElement( "a" );
    	ajaxLocation.href = "";
    	ajaxLocation = ajaxLocation.href;
    }

    // Segment location into parts
    ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

    // Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
    function addToPrefiltersOrTransports( structure ) {

    	// dataTypeExpression is optional and defaults to "*"
    	return function( dataTypeExpression, func ) {

    		if ( typeof dataTypeExpression !== "string" ) {
    			func = dataTypeExpression;
    			dataTypeExpression = "*";
    		}

    		if ( jQuery.isFunction( func ) ) {
    			var dataTypes = dataTypeExpression.toLowerCase().split( rspacesAjax ),
    				i = 0,
    				length = dataTypes.length,
    				dataType,
    				list,
    				placeBefore;

    			// For each dataType in the dataTypeExpression
    			for(; i < length; i++ ) {
    				dataType = dataTypes[ i ];
    				// We control if we're asked to add before
    				// any existing element
    				placeBefore = /^\+/.test( dataType );
    				if ( placeBefore ) {
    					dataType = dataType.substr( 1 ) || "*";
    				}
    				list = structure[ dataType ] = structure[ dataType ] || [];
    				// then we add to the structure accordingly
    				list[ placeBefore ? "unshift" : "push" ]( func );
    			}
    		}
    	};
    }

    // Base inspection function for prefilters and transports
    function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR,
    		dataType /* internal */, inspected /* internal */ ) {

    	dataType = dataType || options.dataTypes[ 0 ];
    	inspected = inspected || {};

    	inspected[ dataType ] = true;

    	var list = structure[ dataType ],
    		i = 0,
    		length = list ? list.length : 0,
    		executeOnly = ( structure === prefilters ),
    		selection;

    	for(; i < length && ( executeOnly || !selection ); i++ ) {
    		selection = list[ i ]( options, originalOptions, jqXHR );
    		// If we got redirected to another dataType
    		// we try there if executing only and not done already
    		if ( typeof selection === "string" ) {
    			if ( !executeOnly || inspected[ selection ] ) {
    				selection = undefined;
    			} else {
    				options.dataTypes.unshift( selection );
    				selection = inspectPrefiltersOrTransports(
    						structure, options, originalOptions, jqXHR, selection, inspected );
    			}
    		}
    	}
    	// If we're only executing or nothing was selected
    	// we try the catchall dataType if not done already
    	if ( ( executeOnly || !selection ) && !inspected[ "*" ] ) {
    		selection = inspectPrefiltersOrTransports(
    				structure, options, originalOptions, jqXHR, "*", inspected );
    	}
    	// unnecessary when only executing (prefilters)
    	// but it'll be ignored by the caller in that case
    	return selection;
    }

    jQuery.fn.extend({
    	load: function( url, params, callback ) {
    		if ( typeof url !== "string" && _load ) {
    			return _load.apply( this, arguments );

    		// Don't do a request if no elements are being requested
    		} else if ( !this.length ) {
    			return this;
    		}

    		var off = url.indexOf( " " );
    		if ( off >= 0 ) {
    			var selector = url.slice( off, url.length );
    			url = url.slice( 0, off );
    		}

    		// Default to a GET request
    		var type = "GET";

    		// If the second parameter was provided
    		if ( params ) {
    			// If it's a function
    			if ( jQuery.isFunction( params ) ) {
    				// We assume that it's the callback
    				callback = params;
    				params = undefined;

    			// Otherwise, build a param string
    			} else if ( typeof params === "object" ) {
    				params = jQuery.param( params, jQuery.ajaxSettings.traditional );
    				type = "POST";
    			}
    		}

    		var self = this;

    		// Request the remote document
    		jQuery.ajax({
    			url: url,
    			type: type,
    			dataType: "html",
    			data: params,
    			// Complete callback (responseText is used internally)
    			complete: function( jqXHR, status, responseText ) {
    				// Store the response as specified by the jqXHR object
    				responseText = jqXHR.responseText;
    				// If successful, inject the HTML into all the matched elements
    				if ( jqXHR.isResolved() ) {
    					// #4825: Get the actual response in case
    					// a dataFilter is present in ajaxSettings
    					jqXHR.done(function( r ) {
    						responseText = r;
    					});
    					// See if a selector was specified
    					self.html( selector ?
    						// Create a dummy div to hold the results
    						jQuery("<div>")
    							// inject the contents of the document in, removing the scripts
    							// to avoid any 'Permission Denied' errors in IE
    							.append(responseText.replace(rscript, ""))

    							// Locate the specified elements
    							.find(selector) :

    						// If not, just inject the full result
    						responseText );
    				}

    				if ( callback ) {
    					self.each( callback, [ responseText, status, jqXHR ] );
    				}
    			}
    		});

    		return this;
    	},

    	serialize: function() {
    		return jQuery.param( this.serializeArray() );
    	},

    	serializeArray: function() {
    		return this.map(function(){
    			return this.elements ? jQuery.makeArray( this.elements ) : this;
    		})
    		.filter(function(){
    			return this.name && !this.disabled &&
    				( this.checked || rselectTextarea.test( this.nodeName ) ||
    					rinput.test( this.type ) );
    		})
    		.map(function( i, elem ){
    			var val = jQuery( this ).val();

    			return val == null ?
    				null :
    				jQuery.isArray( val ) ?
    					jQuery.map( val, function( val, i ){
    						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
    					}) :
    					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
    		}).get();
    	}
    });

    // Attach a bunch of functions for handling common AJAX events
    jQuery.each( "ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split( " " ), function( i, o ){
    	jQuery.fn[ o ] = function( f ){
    		return this.bind( o, f );
    	};
    });

    jQuery.each( [ "get", "post" ], function( i, method ) {
    	jQuery[ method ] = function( url, data, callback, type ) {
    		// shift arguments if data argument was omitted
    		if ( jQuery.isFunction( data ) ) {
    			type = type || callback;
    			callback = data;
    			data = undefined;
    		}

    		return jQuery.ajax({
    			type: method,
    			url: url,
    			data: data,
    			success: callback,
    			dataType: type
    		});
    	};
    });

    jQuery.extend({

    	getScript: function( url, callback ) {
    		return jQuery.get( url, undefined, callback, "script" );
    	},

    	getJSON: function( url, data, callback ) {
    		return jQuery.get( url, data, callback, "json" );
    	},

    	// Creates a full fledged settings object into target
    	// with both ajaxSettings and settings fields.
    	// If target is omitted, writes into ajaxSettings.
    	ajaxSetup: function ( target, settings ) {
    		if ( !settings ) {
    			// Only one parameter, we extend ajaxSettings
    			settings = target;
    			target = jQuery.extend( true, jQuery.ajaxSettings, settings );
    		} else {
    			// target was provided, we extend into it
    			jQuery.extend( true, target, jQuery.ajaxSettings, settings );
    		}
    		// Flatten fields we don't want deep extended
    		for( var field in { context: 1, url: 1 } ) {
    			if ( field in settings ) {
    				target[ field ] = settings[ field ];
    			} else if( field in jQuery.ajaxSettings ) {
    				target[ field ] = jQuery.ajaxSettings[ field ];
    			}
    		}
    		return target;
    	},

    	ajaxSettings: {
    		url: ajaxLocation,
    		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
    		global: true,
    		type: "GET",
    		contentType: "application/x-www-form-urlencoded",
    		processData: true,
    		async: true,
    		/*
    		timeout: 0,
    		data: null,
    		dataType: null,
    		username: null,
    		password: null,
    		cache: null,
    		traditional: false,
    		headers: {},
    		*/

    		accepts: {
    			xml: "application/xml, text/xml",
    			html: "text/html",
    			text: "text/plain",
    			json: "application/json, text/javascript",
    			"*": "*/*"
    		},

    		contents: {
    			xml: /xml/,
    			html: /html/,
    			json: /json/
    		},

    		responseFields: {
    			xml: "responseXML",
    			text: "responseText"
    		},

    		// List of data converters
    		// 1) key format is "source_type destination_type" (a single space in-between)
    		// 2) the catchall symbol "*" can be used for source_type
    		converters: {

    			// Convert anything to text
    			"* text": window.String,

    			// Text to html (true = no transformation)
    			"text html": true,

    			// Evaluate text as a json expression
    			"text json": jQuery.parseJSON,

    			// Parse text as xml
    			"text xml": jQuery.parseXML
    		}
    	},

    	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
    	ajaxTransport: addToPrefiltersOrTransports( transports ),

    	// Main method
    	ajax: function( url, options ) {

    		// If url is an object, simulate pre-1.5 signature
    		if ( typeof url === "object" ) {
    			options = url;
    			url = undefined;
    		}

    		// Force options to be an object
    		options = options || {};

    		var // Create the final options object
    			s = jQuery.ajaxSetup( {}, options ),
    			// Callbacks context
    			callbackContext = s.context || s,
    			// Context for global events
    			// It's the callbackContext if one was provided in the options
    			// and if it's a DOM node or a jQuery collection
    			globalEventContext = callbackContext !== s &&
    				( callbackContext.nodeType || callbackContext instanceof jQuery ) ?
    						jQuery( callbackContext ) : jQuery.event,
    			// Deferreds
    			deferred = jQuery.Deferred(),
    			completeDeferred = jQuery._Deferred(),
    			// Status-dependent callbacks
    			statusCode = s.statusCode || {},
    			// ifModified key
    			ifModifiedKey,
    			// Headers (they are sent all at once)
    			requestHeaders = {},
    			requestHeadersNames = {},
    			// Response headers
    			responseHeadersString,
    			responseHeaders,
    			// transport
    			transport,
    			// timeout handle
    			timeoutTimer,
    			// Cross-domain detection vars
    			parts,
    			// The jqXHR state
    			state = 0,
    			// To know if global events are to be dispatched
    			fireGlobals,
    			// Loop variable
    			i,
    			// Fake xhr
    			jqXHR = {

    				readyState: 0,

    				// Caches the header
    				setRequestHeader: function( name, value ) {
    					if ( !state ) {
    						var lname = name.toLowerCase();
    						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
    						requestHeaders[ name ] = value;
    					}
    					return this;
    				},

    				// Raw string
    				getAllResponseHeaders: function() {
    					return state === 2 ? responseHeadersString : null;
    				},

    				// Builds headers hashtable if needed
    				getResponseHeader: function( key ) {
    					var match;
    					if ( state === 2 ) {
    						if ( !responseHeaders ) {
    							responseHeaders = {};
    							while( ( match = rheaders.exec( responseHeadersString ) ) ) {
    								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
    							}
    						}
    						match = responseHeaders[ key.toLowerCase() ];
    					}
    					return match === undefined ? null : match;
    				},

    				// Overrides response content-type header
    				overrideMimeType: function( type ) {
    					if ( !state ) {
    						s.mimeType = type;
    					}
    					return this;
    				},

    				// Cancel the request
    				abort: function( statusText ) {
    					statusText = statusText || "abort";
    					if ( transport ) {
    						transport.abort( statusText );
    					}
    					done( 0, statusText );
    					return this;
    				}
    			};

    		// Callback for when everything is done
    		// It is defined here because jslint complains if it is declared
    		// at the end of the function (which would be more logical and readable)
    		function done( status, statusText, responses, headers ) {

    			// Called once
    			if ( state === 2 ) {
    				return;
    			}

    			// State is "done" now
    			state = 2;

    			// Clear timeout if it exists
    			if ( timeoutTimer ) {
    				clearTimeout( timeoutTimer );
    			}

    			// Dereference transport for early garbage collection
    			// (no matter how long the jqXHR object will be used)
    			transport = undefined;

    			// Cache response headers
    			responseHeadersString = headers || "";

    			// Set readyState
    			jqXHR.readyState = status ? 4 : 0;

    			var isSuccess,
    				success,
    				error,
    				response = responses ? ajaxHandleResponses( s, jqXHR, responses ) : undefined,
    				lastModified,
    				etag;

    			// If successful, handle type chaining
    			if ( status >= 200 && status < 300 || status === 304 ) {

    				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
    				if ( s.ifModified ) {

    					if ( ( lastModified = jqXHR.getResponseHeader( "Last-Modified" ) ) ) {
    						jQuery.lastModified[ ifModifiedKey ] = lastModified;
    					}
    					if ( ( etag = jqXHR.getResponseHeader( "Etag" ) ) ) {
    						jQuery.etag[ ifModifiedKey ] = etag;
    					}
    				}

    				// If not modified
    				if ( status === 304 ) {

    					statusText = "notmodified";
    					isSuccess = true;

    				// If we have data
    				} else {

    					try {
    						success = ajaxConvert( s, response );
    						statusText = "success";
    						isSuccess = true;
    					} catch(e) {
    						// We have a parsererror
    						statusText = "parsererror";
    						error = e;
    					}
    				}
    			} else {
    				// We extract error from statusText
    				// then normalize statusText and status for non-aborts
    				error = statusText;
    				if( !statusText || status ) {
    					statusText = "error";
    					if ( status < 0 ) {
    						status = 0;
    					}
    				}
    			}

    			// Set data for the fake xhr object
    			jqXHR.status = status;
    			jqXHR.statusText = statusText;

    			// Success/Error
    			if ( isSuccess ) {
    				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
    			} else {
    				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
    			}

    			// Status-dependent callbacks
    			jqXHR.statusCode( statusCode );
    			statusCode = undefined;

    			if ( fireGlobals ) {
    				globalEventContext.trigger( "ajax" + ( isSuccess ? "Success" : "Error" ),
    						[ jqXHR, s, isSuccess ? success : error ] );
    			}

    			// Complete
    			completeDeferred.resolveWith( callbackContext, [ jqXHR, statusText ] );

    			if ( fireGlobals ) {
    				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s] );
    				// Handle the global AJAX counter
    				if ( !( --jQuery.active ) ) {
    					jQuery.event.trigger( "ajaxStop" );
    				}
    			}
    		}

    		// Attach deferreds
    		deferred.promise( jqXHR );
    		jqXHR.success = jqXHR.done;
    		jqXHR.error = jqXHR.fail;
    		jqXHR.complete = completeDeferred.done;

    		// Status-dependent callbacks
    		jqXHR.statusCode = function( map ) {
    			if ( map ) {
    				var tmp;
    				if ( state < 2 ) {
    					for( tmp in map ) {
    						statusCode[ tmp ] = [ statusCode[tmp], map[tmp] ];
    					}
    				} else {
    					tmp = map[ jqXHR.status ];
    					jqXHR.then( tmp, tmp );
    				}
    			}
    			return this;
    		};

    		// Remove hash character (#7531: and string promotion)
    		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
    		// We also use the url parameter if available
    		s.url = ( ( url || s.url ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

    		// Extract dataTypes list
    		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().split( rspacesAjax );

    		// Determine if a cross-domain request is in order
    		if ( s.crossDomain == null ) {
    			parts = rurl.exec( s.url.toLowerCase() );
    			s.crossDomain = !!( parts &&
    				( parts[ 1 ] != ajaxLocParts[ 1 ] || parts[ 2 ] != ajaxLocParts[ 2 ] ||
    					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? 80 : 443 ) ) !=
    						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? 80 : 443 ) ) )
    			);
    		}

    		// Convert data if not already a string
    		if ( s.data && s.processData && typeof s.data !== "string" ) {
    			s.data = jQuery.param( s.data, s.traditional );
    		}

    		// Apply prefilters
    		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

    		// If request was aborted inside a prefiler, stop there
    		if ( state === 2 ) {
    			return false;
    		}

    		// We can fire global events as of now if asked to
    		fireGlobals = s.global;

    		// Uppercase the type
    		s.type = s.type.toUpperCase();

    		// Determine if request has content
    		s.hasContent = !rnoContent.test( s.type );

    		// Watch for a new set of requests
    		if ( fireGlobals && jQuery.active++ === 0 ) {
    			jQuery.event.trigger( "ajaxStart" );
    		}

    		// More options handling for requests with no content
    		if ( !s.hasContent ) {

    			// If data is available, append data to url
    			if ( s.data ) {
    				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.data;
    			}

    			// Get ifModifiedKey before adding the anti-cache parameter
    			ifModifiedKey = s.url;

    			// Add anti-cache in url if needed
    			if ( s.cache === false ) {

    				var ts = jQuery.now(),
    					// try replacing _= if it is there
    					ret = s.url.replace( rts, "$1_=" + ts );

    				// if nothing was replaced, add timestamp to the end
    				s.url = ret + ( (ret === s.url ) ? ( rquery.test( s.url ) ? "&" : "?" ) + "_=" + ts : "" );
    			}
    		}

    		// Set the correct header, if data is being sent
    		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
    			jqXHR.setRequestHeader( "Content-Type", s.contentType );
    		}

    		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
    		if ( s.ifModified ) {
    			ifModifiedKey = ifModifiedKey || s.url;
    			if ( jQuery.lastModified[ ifModifiedKey ] ) {
    				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ ifModifiedKey ] );
    			}
    			if ( jQuery.etag[ ifModifiedKey ] ) {
    				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ ifModifiedKey ] );
    			}
    		}

    		// Set the Accepts header for the server, depending on the dataType
    		jqXHR.setRequestHeader(
    			"Accept",
    			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
    				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", */*; q=0.01" : "" ) :
    				s.accepts[ "*" ]
    		);

    		// Check for headers option
    		for ( i in s.headers ) {
    			jqXHR.setRequestHeader( i, s.headers[ i ] );
    		}

    		// Allow custom headers/mimetypes and early abort
    		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
    				// Abort if not done already
    				jqXHR.abort();
    				return false;

    		}

    		// Install callbacks on deferreds
    		for ( i in { success: 1, error: 1, complete: 1 } ) {
    			jqXHR[ i ]( s[ i ] );
    		}

    		// Get transport
    		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

    		// If no transport, we auto-abort
    		if ( !transport ) {
    			done( -1, "No Transport" );
    		} else {
    			jqXHR.readyState = 1;
    			// Send global event
    			if ( fireGlobals ) {
    				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
    			}
    			// Timeout
    			if ( s.async && s.timeout > 0 ) {
    				timeoutTimer = setTimeout( function(){
    					jqXHR.abort( "timeout" );
    				}, s.timeout );
    			}

    			try {
    				state = 1;
    				transport.send( requestHeaders, done );
    			} catch (e) {
    				// Propagate exception as error if not done
    				if ( status < 2 ) {
    					done( -1, e );
    				// Simply rethrow otherwise
    				} else {
    					jQuery.error( e );
    				}
    			}
    		}

    		return jqXHR;
    	},

    	// Serialize an array of form elements or a set of
    	// key/values into a query string
    	param: function( a, traditional ) {
    		var s = [],
    			add = function( key, value ) {
    				// If value is a function, invoke it and return its value
    				value = jQuery.isFunction( value ) ? value() : value;
    				s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
    			};

    		// Set traditional to true for jQuery <= 1.3.2 behavior.
    		if ( traditional === undefined ) {
    			traditional = jQuery.ajaxSettings.traditional;
    		}

    		// If an array was passed in, assume that it is an array of form elements.
    		if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
    			// Serialize the form elements
    			jQuery.each( a, function() {
    				add( this.name, this.value );
    			});

    		} else {
    			// If traditional, encode the "old" way (the way 1.3.2 or older
    			// did it), otherwise encode params recursively.
    			for ( var prefix in a ) {
    				buildParams( prefix, a[ prefix ], traditional, add );
    			}
    		}

    		// Return the resulting serialization
    		return s.join( "&" ).replace( r20, "+" );
    	}
    });

    function buildParams( prefix, obj, traditional, add ) {
    	if ( jQuery.isArray( obj ) ) {
    		// Serialize array item.
    		jQuery.each( obj, function( i, v ) {
    			if ( traditional || rbracket.test( prefix ) ) {
    				// Treat each array item as a scalar.
    				add( prefix, v );

    			} else {
    				// If array item is non-scalar (array or object), encode its
    				// numeric index to resolve deserialization ambiguity issues.
    				// Note that rack (as of 1.0.0) can't currently deserialize
    				// nested arrays properly, and attempting to do so may cause
    				// a server error. Possible fixes are to modify rack's
    				// deserialization algorithm or to provide an option or flag
    				// to force array serialization to be shallow.
    				buildParams( prefix + "[" + ( typeof v === "object" || jQuery.isArray(v) ? i : "" ) + "]", v, traditional, add );
    			}
    		});

    	} else if ( !traditional && obj != null && typeof obj === "object" ) {
    		// Serialize object item.
    		for ( var name in obj ) {
    			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
    		}

    	} else {
    		// Serialize scalar item.
    		add( prefix, obj );
    	}
    }

    // This is still on the jQuery object... for now
    // Want to move this to jQuery.ajax some day
    jQuery.extend({

    	// Counter for holding the number of active queries
    	active: 0,

    	// Last-Modified header cache for next request
    	lastModified: {},
    	etag: {}

    });

    /* Handles responses to an ajax request:
     * - sets all responseXXX fields accordingly
     * - finds the right dataType (mediates between content-type and expected dataType)
     * - returns the corresponding response
     */
    function ajaxHandleResponses( s, jqXHR, responses ) {

    	var contents = s.contents,
    		dataTypes = s.dataTypes,
    		responseFields = s.responseFields,
    		ct,
    		type,
    		finalDataType,
    		firstDataType;

    	// Fill responseXXX fields
    	for( type in responseFields ) {
    		if ( type in responses ) {
    			jqXHR[ responseFields[type] ] = responses[ type ];
    		}
    	}

    	// Remove auto dataType and get content-type in the process
    	while( dataTypes[ 0 ] === "*" ) {
    		dataTypes.shift();
    		if ( ct === undefined ) {
    			ct = s.mimeType || jqXHR.getResponseHeader( "content-type" );
    		}
    	}

    	// Check if we're dealing with a known content-type
    	if ( ct ) {
    		for ( type in contents ) {
    			if ( contents[ type ] && contents[ type ].test( ct ) ) {
    				dataTypes.unshift( type );
    				break;
    			}
    		}
    	}

    	// Check to see if we have a response for the expected dataType
    	if ( dataTypes[ 0 ] in responses ) {
    		finalDataType = dataTypes[ 0 ];
    	} else {
    		// Try convertible dataTypes
    		for ( type in responses ) {
    			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
    				finalDataType = type;
    				break;
    			}
    			if ( !firstDataType ) {
    				firstDataType = type;
    			}
    		}
    		// Or just use first one
    		finalDataType = finalDataType || firstDataType;
    	}

    	// If we found a dataType
    	// We add the dataType to the list if needed
    	// and return the corresponding response
    	if ( finalDataType ) {
    		if ( finalDataType !== dataTypes[ 0 ] ) {
    			dataTypes.unshift( finalDataType );
    		}
    		return responses[ finalDataType ];
    	}
    }

    // Chain conversions given the request and the original response
    function ajaxConvert( s, response ) {

    	// Apply the dataFilter if provided
    	if ( s.dataFilter ) {
    		response = s.dataFilter( response, s.dataType );
    	}

    	var dataTypes = s.dataTypes,
    		converters = {},
    		i,
    		key,
    		length = dataTypes.length,
    		tmp,
    		// Current and previous dataTypes
    		current = dataTypes[ 0 ],
    		prev,
    		// Conversion expression
    		conversion,
    		// Conversion function
    		conv,
    		// Conversion functions (transitive conversion)
    		conv1,
    		conv2;

    	// For each dataType in the chain
    	for( i = 1; i < length; i++ ) {

    		// Create converters map
    		// with lowercased keys
    		if ( i === 1 ) {
    			for( key in s.converters ) {
    				if( typeof key === "string" ) {
    					converters[ key.toLowerCase() ] = s.converters[ key ];
    				}
    			}
    		}

    		// Get the dataTypes
    		prev = current;
    		current = dataTypes[ i ];

    		// If current is auto dataType, update it to prev
    		if( current === "*" ) {
    			current = prev;
    		// If no auto and dataTypes are actually different
    		} else if ( prev !== "*" && prev !== current ) {

    			// Get the converter
    			conversion = prev + " " + current;
    			conv = converters[ conversion ] || converters[ "* " + current ];

    			// If there is no direct converter, search transitively
    			if ( !conv ) {
    				conv2 = undefined;
    				for( conv1 in converters ) {
    					tmp = conv1.split( " " );
    					if ( tmp[ 0 ] === prev || tmp[ 0 ] === "*" ) {
    						conv2 = converters[ tmp[1] + " " + current ];
    						if ( conv2 ) {
    							conv1 = converters[ conv1 ];
    							if ( conv1 === true ) {
    								conv = conv2;
    							} else if ( conv2 === true ) {
    								conv = conv1;
    							}
    							break;
    						}
    					}
    				}
    			}
    			// If we found no converter, dispatch an error
    			if ( !( conv || conv2 ) ) {
    				jQuery.error( "No conversion from " + conversion.replace(" "," to ") );
    			}
    			// If found converter is not an equivalence
    			if ( conv !== true ) {
    				// Convert with 1 or 2 converters accordingly
    				response = conv ? conv( response ) : conv2( conv1(response) );
    			}
    		}
    	}
    	return response;
    }




    var jsc = jQuery.now(),
    	jsre = /(\=)\?(&|$)|\?\?/i;

    // Default jsonp settings
    jQuery.ajaxSetup({
    	jsonp: "callback",
    	jsonpCallback: function() {
    		return jQuery.expando + "_" + ( jsc++ );
    	}
    });

    // Detect, normalize options and install callbacks for jsonp requests
    jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

    	var inspectData = s.contentType === "application/x-www-form-urlencoded" &&
    		( typeof s.data === "string" );

    	if ( s.dataTypes[ 0 ] === "jsonp" ||
    		s.jsonp !== false && ( jsre.test( s.url ) ||
    				inspectData && jsre.test( s.data ) ) ) {

    		var responseContainer,
    			jsonpCallback = s.jsonpCallback =
    				jQuery.isFunction( s.jsonpCallback ) ? s.jsonpCallback() : s.jsonpCallback,
    			previous = window[ jsonpCallback ],
    			url = s.url,
    			data = s.data,
    			replace = "$1" + jsonpCallback + "$2";

    		if ( s.jsonp !== false ) {
    			url = url.replace( jsre, replace );
    			if ( s.url === url ) {
    				if ( inspectData ) {
    					data = data.replace( jsre, replace );
    				}
    				if ( s.data === data ) {
    					// Add callback manually
    					url += (/\?/.test( url ) ? "&" : "?") + s.jsonp + "=" + jsonpCallback;
    				}
    			}
    		}

    		s.url = url;
    		s.data = data;

    		// Install callback
    		window[ jsonpCallback ] = function( response ) {
    			responseContainer = [ response ];
    		};

    		// Clean-up function
    		jqXHR.always(function() {
    			// Set callback back to previous value
    			window[ jsonpCallback ] = previous;
    			// Call if it was a function and we have a response
    			if ( responseContainer && jQuery.isFunction( previous ) ) {
    				window[ jsonpCallback ]( responseContainer[ 0 ] );
    			}
    		});

    		// Use data converter to retrieve json after script execution
    		s.converters["script json"] = function() {
    			if ( !responseContainer ) {
    				jQuery.error( jsonpCallback + " was not called" );
    			}
    			return responseContainer[ 0 ];
    		};

    		// force json dataType
    		s.dataTypes[ 0 ] = "json";

    		// Delegate to script
    		return "script";
    	}
    });




    // Install script dataType
    jQuery.ajaxSetup({
    	accepts: {
    		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
    	},
    	contents: {
    		script: /javascript|ecmascript/
    	},
    	converters: {
    		"text script": function( text ) {
    			jQuery.globalEval( text );
    			return text;
    		}
    	}
    });

    // Handle cache's special case and global
    jQuery.ajaxPrefilter( "script", function( s ) {
    	if ( s.cache === undefined ) {
    		s.cache = false;
    	}
    	if ( s.crossDomain ) {
    		s.type = "GET";
    		s.global = false;
    	}
    });

    // Bind script tag hack transport
    jQuery.ajaxTransport( "script", function(s) {

    	// This transport only deals with cross domain requests
    	if ( s.crossDomain ) {

    		var script,
    			head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;

    		return {

    			send: function( _, callback ) {

    				script = document.createElement( "script" );

    				script.async = "async";

    				if ( s.scriptCharset ) {
    					script.charset = s.scriptCharset;
    				}

    				script.src = s.url;

    				// Attach handlers for all browsers
    				script.onload = script.onreadystatechange = function( _, isAbort ) {

    					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

    						// Handle memory leak in IE
    						script.onload = script.onreadystatechange = null;

    						// Remove the script
    						if ( head && script.parentNode ) {
    							head.removeChild( script );
    						}

    						// Dereference the script
    						script = undefined;

    						// Callback if not abort
    						if ( !isAbort ) {
    							callback( 200, "success" );
    						}
    					}
    				};
    				// Use insertBefore instead of appendChild  to circumvent an IE6 bug.
    				// This arises when a base node is used (#2709 and #4378).
    				head.insertBefore( script, head.firstChild );
    			},

    			abort: function() {
    				if ( script ) {
    					script.onload( 0, 1 );
    				}
    			}
    		};
    	}
    });




    var // #5280: Internet Explorer will keep connections alive if we don't abort on unload
    	xhrOnUnloadAbort = window.ActiveXObject ? function() {
    		// Abort all pending requests
    		for ( var key in xhrCallbacks ) {
    			xhrCallbacks[ key ]( 0, 1 );
    		}
    	} : false,
    	xhrId = 0,
    	xhrCallbacks;

    // Functions to create xhrs
    function createStandardXHR() {
    	try {
    		return new window.XMLHttpRequest();
    	} catch( e ) {}
    }

    function createActiveXHR() {
    	try {
    		return new window.ActiveXObject( "Microsoft.XMLHTTP" );
    	} catch( e ) {}
    }

    // Create the request object
    // (This is still attached to ajaxSettings for backward compatibility)
    jQuery.ajaxSettings.xhr = window.ActiveXObject ?
    	/* Microsoft failed to properly
    	 * implement the XMLHttpRequest in IE7 (can't request local files),
    	 * so we use the ActiveXObject when it is available
    	 * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
    	 * we need a fallback.
    	 */
    	function() {
    		return !this.isLocal && createStandardXHR() || createActiveXHR();
    	} :
    	// For all other browsers, use the standard XMLHttpRequest object
    	createStandardXHR;

    // Determine support properties
    (function( xhr ) {
    	jQuery.extend( jQuery.support, {
    		ajax: !!xhr,
    		cors: !!xhr && ( "withCredentials" in xhr )
    	});
    })( jQuery.ajaxSettings.xhr() );

    // Create transport if the browser can provide an xhr
    if ( jQuery.support.ajax ) {

    	jQuery.ajaxTransport(function( s ) {
    		// Cross domain only allowed if supported through XMLHttpRequest
    		if ( !s.crossDomain || jQuery.support.cors ) {

    			var callback;

    			return {
    				send: function( headers, complete ) {

    					// Get a new xhr
    					var xhr = s.xhr(),
    						handle,
    						i;

    					// Open the socket
    					// Passing null username, generates a login popup on Opera (#2865)
    					if ( s.username ) {
    						xhr.open( s.type, s.url, s.async, s.username, s.password );
    					} else {
    						xhr.open( s.type, s.url, s.async );
    					}

    					// Apply custom fields if provided
    					if ( s.xhrFields ) {
    						for ( i in s.xhrFields ) {
    							xhr[ i ] = s.xhrFields[ i ];
    						}
    					}

    					// Override mime type if needed
    					if ( s.mimeType && xhr.overrideMimeType ) {
    						xhr.overrideMimeType( s.mimeType );
    					}

    					// X-Requested-With header
    					// For cross-domain requests, seeing as conditions for a preflight are
    					// akin to a jigsaw puzzle, we simply never set it to be sure.
    					// (it can always be set on a per-request basis or even using ajaxSetup)
    					// For same-domain requests, won't change header if already provided.
    					if ( !s.crossDomain && !headers["X-Requested-With"] ) {
    						headers[ "X-Requested-With" ] = "XMLHttpRequest";
    					}

    					// Need an extra try/catch for cross domain requests in Firefox 3
    					try {
    						for ( i in headers ) {
    							xhr.setRequestHeader( i, headers[ i ] );
    						}
    					} catch( _ ) {}

    					// Do send the request
    					// This may raise an exception which is actually
    					// handled in jQuery.ajax (so no try/catch here)
    					xhr.send( ( s.hasContent && s.data ) || null );

    					// Listener
    					callback = function( _, isAbort ) {

    						var status,
    							statusText,
    							responseHeaders,
    							responses,
    							xml;

    						// Firefox throws exceptions when accessing properties
    						// of an xhr when a network error occured
    						// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
    						try {

    							// Was never called and is aborted or complete
    							if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

    								// Only called once
    								callback = undefined;

    								// Do not keep as active anymore
    								if ( handle ) {
    									xhr.onreadystatechange = jQuery.noop;
    									if ( xhrOnUnloadAbort ) {
    										delete xhrCallbacks[ handle ];
    									}
    								}

    								// If it's an abort
    								if ( isAbort ) {
    									// Abort it manually if needed
    									if ( xhr.readyState !== 4 ) {
    										xhr.abort();
    									}
    								} else {
    									status = xhr.status;
    									responseHeaders = xhr.getAllResponseHeaders();
    									responses = {};
    									xml = xhr.responseXML;

    									// Construct response list
    									if ( xml && xml.documentElement /* #4958 */ ) {
    										responses.xml = xml;
    									}
    									responses.text = xhr.responseText;

    									// Firefox throws an exception when accessing
    									// statusText for faulty cross-domain requests
    									try {
    										statusText = xhr.statusText;
    									} catch( e ) {
    										// We normalize with Webkit giving an empty statusText
    										statusText = "";
    									}

    									// Filter status for non standard behaviors

    									// If the request is local and we have data: assume a success
    									// (success with no data won't get notified, that's the best we
    									// can do given current implementations)
    									if ( !status && s.isLocal && !s.crossDomain ) {
    										status = responses.text ? 200 : 404;
    									// IE - #1450: sometimes returns 1223 when it should be 204
    									} else if ( status === 1223 ) {
    										status = 204;
    									}
    								}
    							}
    						} catch( firefoxAccessException ) {
    							if ( !isAbort ) {
    								complete( -1, firefoxAccessException );
    							}
    						}

    						// Call complete if needed
    						if ( responses ) {
    							complete( status, statusText, responses, responseHeaders );
    						}
    					};

    					// if we're in sync mode or it's in cache
    					// and has been retrieved directly (IE6 & IE7)
    					// we need to manually fire the callback
    					if ( !s.async || xhr.readyState === 4 ) {
    						callback();
    					} else {
    						handle = ++xhrId;
    						if ( xhrOnUnloadAbort ) {
    							// Create the active xhrs callbacks list if needed
    							// and attach the unload handler
    							if ( !xhrCallbacks ) {
    								xhrCallbacks = {};
    								jQuery( window ).unload( xhrOnUnloadAbort );
    							}
    							// Add to list of active xhrs callbacks
    							xhrCallbacks[ handle ] = callback;
    						}
    						xhr.onreadystatechange = callback;
    					}
    				},

    				abort: function() {
    					if ( callback ) {
    						callback(0,1);
    					}
    				}
    			};
    		}
    	});
    }




    var elemdisplay = {},
    	iframe, iframeDoc,
    	rfxtypes = /^(?:toggle|show|hide)$/,
    	rfxnum = /^([+\-]=)?([\d+.\-]+)([a-z%]*)$/i,
    	timerId,
    	fxAttrs = [
    		// height animations
    		[ "height", "marginTop", "marginBottom", "paddingTop", "paddingBottom" ],
    		// width animations
    		[ "width", "marginLeft", "marginRight", "paddingLeft", "paddingRight" ],
    		// opacity animations
    		[ "opacity" ]
    	],
    	fxNow,
    	requestAnimationFrame = window.webkitRequestAnimationFrame ||
    		window.mozRequestAnimationFrame ||
    		window.oRequestAnimationFrame;

    jQuery.fn.extend({
    	show: function( speed, easing, callback ) {
    		var elem, display;

    		if ( speed || speed === 0 ) {
    			return this.animate( genFx("show", 3), speed, easing, callback);

    		} else {
    			for ( var i = 0, j = this.length; i < j; i++ ) {
    				elem = this[i];

    				if ( elem.style ) {
    					display = elem.style.display;

    					// Reset the inline display of this element to learn if it is
    					// being hidden by cascaded rules or not
    					if ( !jQuery._data(elem, "olddisplay") && display === "none" ) {
    						display = elem.style.display = "";
    					}

    					// Set elements which have been overridden with display: none
    					// in a stylesheet to whatever the default browser style is
    					// for such an element
    					if ( display === "" && jQuery.css( elem, "display" ) === "none" ) {
    						jQuery._data(elem, "olddisplay", defaultDisplay(elem.nodeName));
    					}
    				}
    			}

    			// Set the display of most of the elements in a second loop
    			// to avoid the constant reflow
    			for ( i = 0; i < j; i++ ) {
    				elem = this[i];

    				if ( elem.style ) {
    					display = elem.style.display;

    					if ( display === "" || display === "none" ) {
    						elem.style.display = jQuery._data(elem, "olddisplay") || "";
    					}
    				}
    			}

    			return this;
    		}
    	},

    	hide: function( speed, easing, callback ) {
    		if ( speed || speed === 0 ) {
    			return this.animate( genFx("hide", 3), speed, easing, callback);

    		} else {
    			for ( var i = 0, j = this.length; i < j; i++ ) {
    				if ( this[i].style ) {
    					var display = jQuery.css( this[i], "display" );

    					if ( display !== "none" && !jQuery._data( this[i], "olddisplay" ) ) {
    						jQuery._data( this[i], "olddisplay", display );
    					}
    				}
    			}

    			// Set the display of the elements in a second loop
    			// to avoid the constant reflow
    			for ( i = 0; i < j; i++ ) {
    				if ( this[i].style ) {
    					this[i].style.display = "none";
    				}
    			}

    			return this;
    		}
    	},

    	// Save the old toggle function
    	_toggle: jQuery.fn.toggle,

    	toggle: function( fn, fn2, callback ) {
    		var bool = typeof fn === "boolean";

    		if ( jQuery.isFunction(fn) && jQuery.isFunction(fn2) ) {
    			this._toggle.apply( this, arguments );

    		} else if ( fn == null || bool ) {
    			this.each(function() {
    				var state = bool ? fn : jQuery(this).is(":hidden");
    				jQuery(this)[ state ? "show" : "hide" ]();
    			});

    		} else {
    			this.animate(genFx("toggle", 3), fn, fn2, callback);
    		}

    		return this;
    	},

    	fadeTo: function( speed, to, easing, callback ) {
    		return this.filter(":hidden").css("opacity", 0).show().end()
    					.animate({opacity: to}, speed, easing, callback);
    	},

    	animate: function( prop, speed, easing, callback ) {
    		var optall = jQuery.speed(speed, easing, callback);

    		if ( jQuery.isEmptyObject( prop ) ) {
    			return this.each( optall.complete, [ false ] );
    		}

    		// Do not change referenced properties as per-property easing will be lost
    		prop = jQuery.extend( {}, prop );

    		return this[ optall.queue === false ? "each" : "queue" ](function() {
    			// XXX 'this' does not always have a nodeName when running the
    			// test suite

    			if ( optall.queue === false ) {
    				jQuery._mark( this );
    			}

    			var opt = jQuery.extend( {}, optall ),
    				isElement = this.nodeType === 1,
    				hidden = isElement && jQuery(this).is(":hidden"),
    				name, val, p,
    				display, e,
    				parts, start, end, unit;

    			// will store per property easing and be used to determine when an animation is complete
    			opt.animatedProperties = {};

    			for ( p in prop ) {

    				// property name normalization
    				name = jQuery.camelCase( p );
    				if ( p !== name ) {
    					prop[ name ] = prop[ p ];
    					delete prop[ p ];
    				}

    				val = prop[ name ];

    				// easing resolution: per property > opt.specialEasing > opt.easing > 'swing' (default)
    				if ( jQuery.isArray( val ) ) {
    					opt.animatedProperties[ name ] = val[ 1 ];
    					val = prop[ name ] = val[ 0 ];
    				} else {
    					opt.animatedProperties[ name ] = opt.specialEasing && opt.specialEasing[ name ] || opt.easing || 'swing';
    				}

    				if ( val === "hide" && hidden || val === "show" && !hidden ) {
    					return opt.complete.call( this );
    				}

    				if ( isElement && ( name === "height" || name === "width" ) ) {
    					// Make sure that nothing sneaks out
    					// Record all 3 overflow attributes because IE does not
    					// change the overflow attribute when overflowX and
    					// overflowY are set to the same value
    					opt.overflow = [ this.style.overflow, this.style.overflowX, this.style.overflowY ];

    					// Set display property to inline-block for height/width
    					// animations on inline elements that are having width/height
    					// animated
    					if ( jQuery.css( this, "display" ) === "inline" &&
    							jQuery.css( this, "float" ) === "none" ) {
    						if ( !jQuery.support.inlineBlockNeedsLayout ) {
    							this.style.display = "inline-block";

    						} else {
    							display = defaultDisplay( this.nodeName );

    							// inline-level elements accept inline-block;
    							// block-level elements need to be inline with layout
    							if ( display === "inline" ) {
    								this.style.display = "inline-block";

    							} else {
    								this.style.display = "inline";
    								this.style.zoom = 1;
    							}
    						}
    					}
    				}
    			}

    			if ( opt.overflow != null ) {
    				this.style.overflow = "hidden";
    			}

    			for ( p in prop ) {
    				e = new jQuery.fx( this, opt, p );
    				val = prop[ p ];

    				if ( rfxtypes.test(val) ) {
    					e[ val === "toggle" ? hidden ? "show" : "hide" : val ]();

    				} else {
    					parts = rfxnum.exec( val );
    					start = e.cur();

    					if ( parts ) {
    						end = parseFloat( parts[2] );
    						unit = parts[3] || ( jQuery.cssNumber[ p ] ? "" : "px" );

    						// We need to compute starting value
    						if ( unit !== "px" ) {
    							jQuery.style( this, p, (end || 1) + unit);
    							start = ((end || 1) / e.cur()) * start;
    							jQuery.style( this, p, start + unit);
    						}

    						// If a +=/-= token was provided, we're doing a relative animation
    						if ( parts[1] ) {
    							end = ( (parts[ 1 ] === "-=" ? -1 : 1) * end ) + start;
    						}

    						e.custom( start, end, unit );

    					} else {
    						e.custom( start, val, "" );
    					}
    				}
    			}

    			// For JS strict compliance
    			return true;
    		});
    	},

    	stop: function( clearQueue, gotoEnd ) {
    		if ( clearQueue ) {
    			this.queue([]);
    		}

    		this.each(function() {
    			var timers = jQuery.timers,
    				i = timers.length;
    			// clear marker counters if we know they won't be
    			if ( !gotoEnd ) {
    				jQuery._unmark( true, this );
    			}
    			while ( i-- ) {
    				if ( timers[i].elem === this ) {
    					if (gotoEnd) {
    						// force the next step to be the last
    						timers[i](true);
    					}

    					timers.splice(i, 1);
    				}
    			}
    		});

    		// start the next in the queue if the last step wasn't forced
    		if ( !gotoEnd ) {
    			this.dequeue();
    		}

    		return this;
    	}

    });

    // Animations created synchronously will run synchronously
    function createFxNow() {
    	setTimeout( clearFxNow, 0 );
    	return ( fxNow = jQuery.now() );
    }

    function clearFxNow() {
    	fxNow = undefined;
    }

    // Generate parameters to create a standard animation
    function genFx( type, num ) {
    	var obj = {};

    	jQuery.each( fxAttrs.concat.apply([], fxAttrs.slice(0,num)), function() {
    		obj[ this ] = type;
    	});

    	return obj;
    }

    // Generate shortcuts for custom animations
    jQuery.each({
    	slideDown: genFx("show", 1),
    	slideUp: genFx("hide", 1),
    	slideToggle: genFx("toggle", 1),
    	fadeIn: { opacity: "show" },
    	fadeOut: { opacity: "hide" },
    	fadeToggle: { opacity: "toggle" }
    }, function( name, props ) {
    	jQuery.fn[ name ] = function( speed, easing, callback ) {
    		return this.animate( props, speed, easing, callback );
    	};
    });

    jQuery.extend({
    	speed: function( speed, easing, fn ) {
    		var opt = speed && typeof speed === "object" ? jQuery.extend({}, speed) : {
    			complete: fn || !fn && easing ||
    				jQuery.isFunction( speed ) && speed,
    			duration: speed,
    			easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
    		};

    		opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
    			opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[opt.duration] : jQuery.fx.speeds._default;

    		// Queueing
    		opt.old = opt.complete;
    		opt.complete = function( noUnmark ) {
    			if ( jQuery.isFunction( opt.old ) ) {
    				opt.old.call( this );
    			}

    			if ( opt.queue !== false ) {
    				jQuery.dequeue( this );
    			} else if ( noUnmark !== false ) {
    				jQuery._unmark( this );
    			}
    		};

    		return opt;
    	},

    	easing: {
    		linear: function( p, n, firstNum, diff ) {
    			return firstNum + diff * p;
    		},
    		swing: function( p, n, firstNum, diff ) {
    			return ((-Math.cos(p*Math.PI)/2) + 0.5) * diff + firstNum;
    		}
    	},

    	timers: [],

    	fx: function( elem, options, prop ) {
    		this.options = options;
    		this.elem = elem;
    		this.prop = prop;

    		options.orig = options.orig || {};
    	}

    });

    jQuery.fx.prototype = {
    	// Simple function for setting a style value
    	update: function() {
    		if ( this.options.step ) {
    			this.options.step.call( this.elem, this.now, this );
    		}

    		(jQuery.fx.step[this.prop] || jQuery.fx.step._default)( this );
    	},

    	// Get the current size
    	cur: function() {
    		if ( this.elem[this.prop] != null && (!this.elem.style || this.elem.style[this.prop] == null) ) {
    			return this.elem[ this.prop ];
    		}

    		var parsed,
    			r = jQuery.css( this.elem, this.prop );
    		// Empty strings, null, undefined and "auto" are converted to 0,
    		// complex values such as "rotate(1rad)" are returned as is,
    		// simple values such as "10px" are parsed to Float.
    		return isNaN( parsed = parseFloat( r ) ) ? !r || r === "auto" ? 0 : r : parsed;
    	},

    	// Start an animation from one number to another
    	custom: function( from, to, unit ) {
    		var self = this,
    			fx = jQuery.fx,
    			raf;

    		this.startTime = fxNow || createFxNow();
    		this.start = from;
    		this.end = to;
    		this.unit = unit || this.unit || ( jQuery.cssNumber[ this.prop ] ? "" : "px" );
    		this.now = this.start;
    		this.pos = this.state = 0;

    		function t( gotoEnd ) {
    			return self.step(gotoEnd);
    		}

    		t.elem = this.elem;

    		if ( t() && jQuery.timers.push(t) && !timerId ) {
    			// Use requestAnimationFrame instead of setInterval if available
    			if ( requestAnimationFrame ) {
    				timerId = true;
    				raf = function() {
    					// When timerId gets set to null at any point, this stops
    					if ( timerId ) {
    						requestAnimationFrame( raf );
    						fx.tick();
    					}
    				};
    				requestAnimationFrame( raf );
    			} else {
    				timerId = setInterval( fx.tick, fx.interval );
    			}
    		}
    	},

    	// Simple 'show' function
    	show: function() {
    		// Remember where we started, so that we can go back to it later
    		this.options.orig[this.prop] = jQuery.style( this.elem, this.prop );
    		this.options.show = true;

    		// Begin the animation
    		// Make sure that we start at a small width/height to avoid any
    		// flash of content
    		this.custom(this.prop === "width" || this.prop === "height" ? 1 : 0, this.cur());

    		// Start by showing the element
    		jQuery( this.elem ).show();
    	},

    	// Simple 'hide' function
    	hide: function() {
    		// Remember where we started, so that we can go back to it later
    		this.options.orig[this.prop] = jQuery.style( this.elem, this.prop );
    		this.options.hide = true;

    		// Begin the animation
    		this.custom(this.cur(), 0);
    	},

    	// Each step of an animation
    	step: function( gotoEnd ) {
    		var t = fxNow || createFxNow(),
    			done = true,
    			elem = this.elem,
    			options = this.options,
    			i, n;

    		if ( gotoEnd || t >= options.duration + this.startTime ) {
    			this.now = this.end;
    			this.pos = this.state = 1;
    			this.update();

    			options.animatedProperties[ this.prop ] = true;

    			for ( i in options.animatedProperties ) {
    				if ( options.animatedProperties[i] !== true ) {
    					done = false;
    				}
    			}

    			if ( done ) {
    				// Reset the overflow
    				if ( options.overflow != null && !jQuery.support.shrinkWrapBlocks ) {

    					jQuery.each( [ "", "X", "Y" ], function (index, value) {
    						elem.style[ "overflow" + value ] = options.overflow[index];
    					});
    				}

    				// Hide the element if the "hide" operation was done
    				if ( options.hide ) {
    					jQuery(elem).hide();
    				}

    				// Reset the properties, if the item has been hidden or shown
    				if ( options.hide || options.show ) {
    					for ( var p in options.animatedProperties ) {
    						jQuery.style( elem, p, options.orig[p] );
    					}
    				}

    				// Execute the complete function
    				options.complete.call( elem );
    			}

    			return false;

    		} else {
    			// classical easing cannot be used with an Infinity duration
    			if ( options.duration == Infinity ) {
    				this.now = t;
    			} else {
    				n = t - this.startTime;
    				this.state = n / options.duration;

    				// Perform the easing function, defaults to swing
    				this.pos = jQuery.easing[ options.animatedProperties[ this.prop ] ]( this.state, n, 0, 1, options.duration );
    				this.now = this.start + ((this.end - this.start) * this.pos);
    			}
    			// Perform the next step of the animation
    			this.update();
    		}

    		return true;
    	}
    };

    jQuery.extend( jQuery.fx, {
    	tick: function() {
    		for ( var timers = jQuery.timers, i = 0 ; i < timers.length ; ++i ) {
    			if ( !timers[i]() ) {
    				timers.splice(i--, 1);
    			}
    		}

    		if ( !timers.length ) {
    			jQuery.fx.stop();
    		}
    	},

    	interval: 13,

    	stop: function() {
    		clearInterval( timerId );
    		timerId = null;
    	},

    	speeds: {
    		slow: 600,
    		fast: 200,
    		// Default speed
    		_default: 400
    	},

    	step: {
    		opacity: function( fx ) {
    			jQuery.style( fx.elem, "opacity", fx.now );
    		},

    		_default: function( fx ) {
    			if ( fx.elem.style && fx.elem.style[ fx.prop ] != null ) {
    				fx.elem.style[ fx.prop ] = (fx.prop === "width" || fx.prop === "height" ? Math.max(0, fx.now) : fx.now) + fx.unit;
    			} else {
    				fx.elem[ fx.prop ] = fx.now;
    			}
    		}
    	}
    });

    if ( jQuery.expr && jQuery.expr.filters ) {
    	jQuery.expr.filters.animated = function( elem ) {
    		return jQuery.grep(jQuery.timers, function( fn ) {
    			return elem === fn.elem;
    		}).length;
    	};
    }

    // Try to restore the default display value of an element
    function defaultDisplay( nodeName ) {

    	if ( !elemdisplay[ nodeName ] ) {

    		var body = document.body,
    			elem = jQuery( "<" + nodeName + ">" ).appendTo( body ),
    			display = elem.css( "display" );

    		elem.remove();

    		// If the simple way fails,
    		// get element's real default display by attaching it to a temp iframe
    		if ( display === "none" || display === "" ) {
    			// No iframe to use yet, so create it
    			if ( !iframe ) {
    				iframe = document.createElement( "iframe" );
    				iframe.frameBorder = iframe.width = iframe.height = 0;
    			}

    			body.appendChild( iframe );

    			// Create a cacheable copy of the iframe document on first call.
    			// IE and Opera will allow us to reuse the iframeDoc without re-writing the fake HTML
    			// document to it; WebKit & Firefox won't allow reusing the iframe document.
    			if ( !iframeDoc || !iframe.createElement ) {
    				iframeDoc = ( iframe.contentWindow || iframe.contentDocument ).document;
    				iframeDoc.write( ( document.compatMode === "CSS1Compat" ? "<!doctype html>" : "" ) + "<html><body>" );
    				iframeDoc.close();
    			}

    			elem = iframeDoc.createElement( nodeName );

    			iframeDoc.body.appendChild( elem );

    			display = jQuery.css( elem, "display" );

    			body.removeChild( iframe );
    		}

    		// Store the correct default display
    		elemdisplay[ nodeName ] = display;
    	}

    	return elemdisplay[ nodeName ];
    }




    var rtable = /^t(?:able|d|h)$/i,
    	rroot = /^(?:body|html)$/i;

    if ( "getBoundingClientRect" in document.documentElement ) {
    	jQuery.fn.offset = function( options ) {
    		var elem = this[0], box;

    		if ( options ) {
    			return this.each(function( i ) {
    				jQuery.offset.setOffset( this, options, i );
    			});
    		}

    		if ( !elem || !elem.ownerDocument ) {
    			return null;
    		}

    		if ( elem === elem.ownerDocument.body ) {
    			return jQuery.offset.bodyOffset( elem );
    		}

    		try {
    			box = elem.getBoundingClientRect();
    		} catch(e) {}

    		var doc = elem.ownerDocument,
    			docElem = doc.documentElement;

    		// Make sure we're not dealing with a disconnected DOM node
    		if ( !box || !jQuery.contains( docElem, elem ) ) {
    			return box ? { top: box.top, left: box.left } : { top: 0, left: 0 };
    		}

    		var body = doc.body,
    			win = getWindow(doc),
    			clientTop  = docElem.clientTop  || body.clientTop  || 0,
    			clientLeft = docElem.clientLeft || body.clientLeft || 0,
    			scrollTop  = win.pageYOffset || jQuery.support.boxModel && docElem.scrollTop  || body.scrollTop,
    			scrollLeft = win.pageXOffset || jQuery.support.boxModel && docElem.scrollLeft || body.scrollLeft,
    			top  = box.top  + scrollTop  - clientTop,
    			left = box.left + scrollLeft - clientLeft;

    		return { top: top, left: left };
    	};

    } else {
    	jQuery.fn.offset = function( options ) {
    		var elem = this[0];

    		if ( options ) {
    			return this.each(function( i ) {
    				jQuery.offset.setOffset( this, options, i );
    			});
    		}

    		if ( !elem || !elem.ownerDocument ) {
    			return null;
    		}

    		if ( elem === elem.ownerDocument.body ) {
    			return jQuery.offset.bodyOffset( elem );
    		}

    		jQuery.offset.initialize();

    		var computedStyle,
    			offsetParent = elem.offsetParent,
    			prevOffsetParent = elem,
    			doc = elem.ownerDocument,
    			docElem = doc.documentElement,
    			body = doc.body,
    			defaultView = doc.defaultView,
    			prevComputedStyle = defaultView ? defaultView.getComputedStyle( elem, null ) : elem.currentStyle,
    			top = elem.offsetTop,
    			left = elem.offsetLeft;

    		while ( (elem = elem.parentNode) && elem !== body && elem !== docElem ) {
    			if ( jQuery.offset.supportsFixedPosition && prevComputedStyle.position === "fixed" ) {
    				break;
    			}

    			computedStyle = defaultView ? defaultView.getComputedStyle(elem, null) : elem.currentStyle;
    			top  -= elem.scrollTop;
    			left -= elem.scrollLeft;

    			if ( elem === offsetParent ) {
    				top  += elem.offsetTop;
    				left += elem.offsetLeft;

    				if ( jQuery.offset.doesNotAddBorder && !(jQuery.offset.doesAddBorderForTableAndCells && rtable.test(elem.nodeName)) ) {
    					top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
    					left += parseFloat( computedStyle.borderLeftWidth ) || 0;
    				}

    				prevOffsetParent = offsetParent;
    				offsetParent = elem.offsetParent;
    			}

    			if ( jQuery.offset.subtractsBorderForOverflowNotVisible && computedStyle.overflow !== "visible" ) {
    				top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
    				left += parseFloat( computedStyle.borderLeftWidth ) || 0;
    			}

    			prevComputedStyle = computedStyle;
    		}

    		if ( prevComputedStyle.position === "relative" || prevComputedStyle.position === "static" ) {
    			top  += body.offsetTop;
    			left += body.offsetLeft;
    		}

    		if ( jQuery.offset.supportsFixedPosition && prevComputedStyle.position === "fixed" ) {
    			top  += Math.max( docElem.scrollTop, body.scrollTop );
    			left += Math.max( docElem.scrollLeft, body.scrollLeft );
    		}

    		return { top: top, left: left };
    	};
    }

    jQuery.offset = {
    	initialize: function() {
    		var body = document.body, container = document.createElement("div"), innerDiv, checkDiv, table, td, bodyMarginTop = parseFloat( jQuery.css(body, "marginTop") ) || 0,
    			html = "<div style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;'><div></div></div><table style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;' cellpadding='0' cellspacing='0'><tr><td></td></tr></table>";

    		jQuery.extend( container.style, { position: "absolute", top: 0, left: 0, margin: 0, border: 0, width: "1px", height: "1px", visibility: "hidden" } );

    		container.innerHTML = html;
    		body.insertBefore( container, body.firstChild );
    		innerDiv = container.firstChild;
    		checkDiv = innerDiv.firstChild;
    		td = innerDiv.nextSibling.firstChild.firstChild;

    		this.doesNotAddBorder = (checkDiv.offsetTop !== 5);
    		this.doesAddBorderForTableAndCells = (td.offsetTop === 5);

    		checkDiv.style.position = "fixed";
    		checkDiv.style.top = "20px";

    		// safari subtracts parent border width here which is 5px
    		this.supportsFixedPosition = (checkDiv.offsetTop === 20 || checkDiv.offsetTop === 15);
    		checkDiv.style.position = checkDiv.style.top = "";

    		innerDiv.style.overflow = "hidden";
    		innerDiv.style.position = "relative";

    		this.subtractsBorderForOverflowNotVisible = (checkDiv.offsetTop === -5);

    		this.doesNotIncludeMarginInBodyOffset = (body.offsetTop !== bodyMarginTop);

    		body.removeChild( container );
    		jQuery.offset.initialize = jQuery.noop;
    	},

    	bodyOffset: function( body ) {
    		var top = body.offsetTop,
    			left = body.offsetLeft;

    		jQuery.offset.initialize();

    		if ( jQuery.offset.doesNotIncludeMarginInBodyOffset ) {
    			top  += parseFloat( jQuery.css(body, "marginTop") ) || 0;
    			left += parseFloat( jQuery.css(body, "marginLeft") ) || 0;
    		}

    		return { top: top, left: left };
    	},

    	setOffset: function( elem, options, i ) {
    		var position = jQuery.css( elem, "position" );

    		// set position first, in-case top/left are set even on static elem
    		if ( position === "static" ) {
    			elem.style.position = "relative";
    		}

    		var curElem = jQuery( elem ),
    			curOffset = curElem.offset(),
    			curCSSTop = jQuery.css( elem, "top" ),
    			curCSSLeft = jQuery.css( elem, "left" ),
    			calculatePosition = (position === "absolute" || position === "fixed") && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1,
    			props = {}, curPosition = {}, curTop, curLeft;

    		// need to be able to calculate position if either top or left is auto and position is either absolute or fixed
    		if ( calculatePosition ) {
    			curPosition = curElem.position();
    			curTop = curPosition.top;
    			curLeft = curPosition.left;
    		} else {
    			curTop = parseFloat( curCSSTop ) || 0;
    			curLeft = parseFloat( curCSSLeft ) || 0;
    		}

    		if ( jQuery.isFunction( options ) ) {
    			options = options.call( elem, i, curOffset );
    		}

    		if (options.top != null) {
    			props.top = (options.top - curOffset.top) + curTop;
    		}
    		if (options.left != null) {
    			props.left = (options.left - curOffset.left) + curLeft;
    		}

    		if ( "using" in options ) {
    			options.using.call( elem, props );
    		} else {
    			curElem.css( props );
    		}
    	}
    };


    jQuery.fn.extend({
    	position: function() {
    		if ( !this[0] ) {
    			return null;
    		}

    		var elem = this[0],

    		// Get *real* offsetParent
    		offsetParent = this.offsetParent(),

    		// Get correct offsets
    		offset       = this.offset(),
    		parentOffset = rroot.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset();

    		// Subtract element margins
    		// note: when an element has margin: auto the offsetLeft and marginLeft
    		// are the same in Safari causing offset.left to incorrectly be 0
    		offset.top  -= parseFloat( jQuery.css(elem, "marginTop") ) || 0;
    		offset.left -= parseFloat( jQuery.css(elem, "marginLeft") ) || 0;

    		// Add offsetParent borders
    		parentOffset.top  += parseFloat( jQuery.css(offsetParent[0], "borderTopWidth") ) || 0;
    		parentOffset.left += parseFloat( jQuery.css(offsetParent[0], "borderLeftWidth") ) || 0;

    		// Subtract the two offsets
    		return {
    			top:  offset.top  - parentOffset.top,
    			left: offset.left - parentOffset.left
    		};
    	},

    	offsetParent: function() {
    		return this.map(function() {
    			var offsetParent = this.offsetParent || document.body;
    			while ( offsetParent && (!rroot.test(offsetParent.nodeName) && jQuery.css(offsetParent, "position") === "static") ) {
    				offsetParent = offsetParent.offsetParent;
    			}
    			return offsetParent;
    		});
    	}
    });


    // Create scrollLeft and scrollTop methods
    jQuery.each( ["Left", "Top"], function( i, name ) {
    	var method = "scroll" + name;

    	jQuery.fn[ method ] = function( val ) {
    		var elem, win;

    		if ( val === undefined ) {
    			elem = this[ 0 ];

    			if ( !elem ) {
    				return null;
    			}

    			win = getWindow( elem );

    			// Return the scroll offset
    			return win ? ("pageXOffset" in win) ? win[ i ? "pageYOffset" : "pageXOffset" ] :
    				jQuery.support.boxModel && win.document.documentElement[ method ] ||
    					win.document.body[ method ] :
    				elem[ method ];
    		}

    		// Set the scroll offset
    		return this.each(function() {
    			win = getWindow( this );

    			if ( win ) {
    				win.scrollTo(
    					!i ? val : jQuery( win ).scrollLeft(),
    					 i ? val : jQuery( win ).scrollTop()
    				);

    			} else {
    				this[ method ] = val;
    			}
    		});
    	};
    });

    function getWindow( elem ) {
    	return jQuery.isWindow( elem ) ?
    		elem :
    		elem.nodeType === 9 ?
    			elem.defaultView || elem.parentWindow :
    			false;
    }




    // Create width, height, innerHeight, innerWidth, outerHeight and outerWidth methods
    jQuery.each([ "Height", "Width" ], function( i, name ) {

    	var type = name.toLowerCase();

    	// innerHeight and innerWidth
    	jQuery.fn[ "inner" + name ] = function() {
    		var elem = this[0];
    		return elem && elem.style ?
    			parseFloat( jQuery.css( elem, type, "padding" ) ) :
    			null;
    	};

    	// outerHeight and outerWidth
    	jQuery.fn[ "outer" + name ] = function( margin ) {
    		var elem = this[0];
    		return elem && elem.style ?
    			parseFloat( jQuery.css( elem, type, margin ? "margin" : "border" ) ) :
    			null;
    	};

    	jQuery.fn[ type ] = function( size ) {
    		// Get window width or height
    		var elem = this[0];
    		if ( !elem ) {
    			return size == null ? null : this;
    		}

    		if ( jQuery.isFunction( size ) ) {
    			return this.each(function( i ) {
    				var self = jQuery( this );
    				self[ type ]( size.call( this, i, self[ type ]() ) );
    			});
    		}

    		if ( jQuery.isWindow( elem ) ) {
    			// Everyone else use document.documentElement or document.body depending on Quirks vs Standards mode
    			// 3rd condition allows Nokia support, as it supports the docElem prop but not CSS1Compat
    			var docElemProp = elem.document.documentElement[ "client" + name ];
    			return elem.document.compatMode === "CSS1Compat" && docElemProp ||
    				elem.document.body[ "client" + name ] || docElemProp;

    		// Get document width or height
    		} else if ( elem.nodeType === 9 ) {
    			// Either scroll[Width/Height] or offset[Width/Height], whichever is greater
    			return Math.max(
    				elem.documentElement["client" + name],
    				elem.body["scroll" + name], elem.documentElement["scroll" + name],
    				elem.body["offset" + name], elem.documentElement["offset" + name]
    			);

    		// Get or set width or height on the element
    		} else if ( size === undefined ) {
    			var orig = jQuery.css( elem, type ),
    				ret = parseFloat( orig );

    			return jQuery.isNaN( ret ) ? orig : ret;

    		// Set the width or height on the element (default to pixels if value is unitless)
    		} else {
    			return this.css( type, typeof size === "string" ? size : size + "px" );
    		}
    	};

    });
    return jQuery;
  };
  
  if (module == null) { module = {}; };
  module.exports = create(window);
}();
});

require.define("/node_modules/dkastner-http-browserify/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"dkastner-http-browserify","version":"0.0.4","description":"http module compatability for browserify","main":"index.js","browserify":"browser.js","directories":{"lib":".","example":"example","test":"test"},"devDependencies":{"express":"2.4.x","browserify":"1.4.x","sinon":"*","vows":"*"},"repository":{"type":"git","url":"http://github.com/substack/http-browserify.git"},"keywords":["http","browserify","compatible","meatless","browser"],"author":{"name":"James Halliday","email":"mail@substack.net","url":"http://substack.net"},"contributors":[{"name":"Derek Kastner","email":"dkastner@gmail.com"}],"license":"MIT/X11","engine":{"node":">=0.4"}}
});

require.define("/node_modules/dkastner-http-browserify/browser.js", function (require, module, exports, __dirname, __filename) {
    var http = module.exports;
var EventEmitter = require('events').EventEmitter;
var Request = require('./lib/request');

if (typeof window === 'undefined') {
    throw new Error('no window object present');
}

http.request = function (params, cb) {
    var req = Request.create(params);
    if (cb) req.on('response', cb);
    return req;
};

http.get = function (params, cb) {
    params.method = 'GET';
    var req = http.request(params, cb);
    req.end();
    return req;
};

});

require.define("events", function (require, module, exports, __dirname, __filename) {
    if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.toString.call(xs) === '[object Array]'
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

require.define("/node_modules/dkastner-http-browserify/lib/request.js", function (require, module, exports, __dirname, __filename) {
    var EventEmitter = require('events').EventEmitter;
var Response = require('./response');

var Request = module.exports = function() {};

Request.prototype = new EventEmitter;

Request.create = function(params) {
    if (!params) params = {};

    var req;
    if(params.host && window.XDomainRequest) { // M$ IE XDR - use when host is set and XDR present
      req = new XdrRequest(params);
    } else {                                   // Everybody else
      req = new XhrRequest(params);
    }
    return req;
}

Request.prototype.init = function(params) {
    if (!params.host) params.host = window.location.host.split(':')[0];
    if (!params.port) params.port = window.location.port;
    
    this.body = '';
    if(!/^\//.test(params.path)) params.path = '/' + params.path;
    this.uri = params.host + ':' + params.port + (params.path || '/');
    this.xhr = new this.xhrClass;

    this.xhr.open(params.method || 'GET', 'http://' + this.uri, true);
};

Request.prototype.setHeader = function (key, value) {
    if ((Array.isArray && Array.isArray(value))
    || value instanceof Array) {
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


// XhrRequest

var XhrRequest = function(params) {
    var self = this;
    self.init(params);
    var xhr = this.xhr;
    
    if(params.headers) {
        Object.keys(params.headers).forEach(function (key) {
            var value = params.headers[key];
            if (Array.isArray(value)) {
                value.forEach(function (v) {
                    xhr.setRequestHeader(key, v);
                });
            }
            else xhr.setRequestHeader(key, value)
        });
    }
  
    xhr.onreadystatechange = function () {
        res.handle(xhr);
    };
    
    var res = new Response;
    res.on('ready', function () {
        self.emit('response', res);
    });
};

XhrRequest.prototype = new Request;

XhrRequest.prototype.xhrClass = function() {
    if (window.XMLHttpRequest) {
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
}();



// XdrRequest

var XdrRequest = function(params) {
    var self = this;
    self.init(params);
    var xhr = this.xhr;

    self.headers = {};

    var res = new XdrResponse();

    xhr.onprogress = function() {
        xhr.readyState = 2;
        res.contentType = xhr.contentType; // There, that's all the headers you get
        res.handle(xhr);
    }
    xhr.onerror = function() {
        xhr.readyState = 3;
        xhr.error = "Who the fuck knows? IE doesn't care!";
        res.handle(xhr);
    };
    xhr.onload = function() {
        xhr.readyState = 4;
        res.handle(xhr);
    };

    res.on('ready', function () {
        self.emit('response', res);
    });
};

XdrRequest.prototype = new Request;

XdrRequest.prototype.xhrClass = window.XDomainRequest;



// XdrResponse

var XdrResponse = function() {
    this.offset = 0;
};

XdrResponse.prototype = new Response();

XdrResponse.prototype.getAllResponseHeaders = function() {
  return 'Content-Type: ' + this.contentType;
};

});

require.define("/node_modules/dkastner-http-browserify/lib/response.js", function (require, module, exports, __dirname, __filename) {
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
    var lines = res.getAllResponseHeaders().split(/\r?\n/);
    var headers = {};
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') continue;
        
        var m = line.match(/^([^:]+):\s*(.*)/);
        if (m) {
            var key = m[1].toLowerCase(), value = m[2];
            
            if (headers[key] !== undefined) {
                if ((Array.isArray && Array.isArray(headers[key]))
                || headers[key] instanceof Array) {
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

require.define("/controllers/index-controller.js", function (require, module, exports, __dirname, __filename) {
    var $ = require('../lib/jquery-custom'),
    async = require('async'),
    Cm1Route = require('cm1-route');

var FlightPath = require('../models/flight-path'),
    HootBarController = require('./hoot-bar-controller'),
    MapView = require('../views/map-view');
    RouteView = require('../views/route-view');
    SPI = require('../lib/spi');

var IndexController = module.exports = function(mapId) {
  this.mapView = new MapView(mapId);
  this.directionsDisplay = new google.maps.DirectionsRenderer();
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
  this.mapView.googleMap();
  this.spi = SPI.current();

  $('#go').click(IndexController.events.routeButtonClick(this));
  $('input[type=text]').keyup(IndexController.events.originDestinationInputKeyup(this));
  $('#when').val('Today');
  $('#example').click(IndexController.events.onExampleClick(this));
  this.hootBarController.init();
  for(var i in this.routeViews) {
    this.routeViews[i].enable();
  }

  if(this.spi.origin) $('#origin').val(this.spi.origin);
  if(this.spi.destination) $('#destination').val(this.spi.destination);
  if(this.spi.origin && this.spi.destination) {
    this.routeButtonClick();
  }
};


IndexController.prototype.getEmissions = function(directions) {
  directions.getEmissions(
    IndexController.events.directionsGetEmissionsCallback(this),
    IndexController.events.segmentGetEmissionsCallback(this, directions));
};

IndexController.prototype.getDirections = function() {
  this.directionsDisplay.setMap(null); 
  this.directionsDisplay.setMap(this.mapView.googleMap());

  var controller = this;
  var directions = [];
  for(var i in this.directions)
    directions.push(this.directions[i]);
  async.forEach(
    directions,
    function(directions, callback) {
      directions.route(IndexController.events.directionsRouteCallback(controller, callback));
    },
    function(err) {
      if(err) {
        console.log('Failed to route directions: ' + err.message);
      }
    }
  );
};

IndexController.prototype.currentUrl = function() {
  return SPI.generate($('#origin').val(), $('#destination').val()).urlString;
};

IndexController.prototype.currentRoute = function() {
  return this.routeViewFor($('#modes .selected').get(0).id);
};

IndexController.prototype.displayDirectionsFor = function(directions) {
  if(directions.mode == 'FLYING') { 
    this.flightPath().display();
  } else {
    this.directionsDisplay.setOptions({ preserveViewport: true });
    this.directionsDisplay.setDirections(directions.directionsResult);
    this.directionsDisplay.setMap(this.mapView.googleMap());
  }
};

IndexController.prototype.hideDirectionsFor = function(directions) {
  if(directions.mode == 'FLYING') { 
    //this.flightPath().hide();
  } else {
    //this.directionsDisplay.setMap(null);
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
  $('#search').hide('drop', { direction: 'up' }, 500);
  $('h1').hide('drop', { direction: 'up' }, 500);
  $('#nav').show('slide', { direction: 'up' }, 500);
  $('#meta').hide();
  $('#modes .failed').each(function(element) { $(element).removeClass('failed'); });
  for(var i in IndexController.modes) {
    var mode = IndexController.modes[i];
    var directions = Cm1Route.DirectionsFactory.
      create($('#origin').val(), $('#destination').val(), mode);
    this.directions[mode.toLowerCase()] = directions;
  }
  for(var i in this.routeViews) { this.routeViews[i].enable().start(); }
  this.routeViews.driving.select();
  if(this.flightPath()) {
    this.flightPath().hide();
    this.clearFlightPath();
  }
  $('#modes').show('slide', { direction: 'down' }, 500);
  if ($('#about').is(':visible')) {
    $('#about').hide('drop', { direction: 'up' }, 500);
  }
  this.getDirections();
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

      var oldDirectionId = $('.selected', this.parentNode).get(0).id;
      var oldDirection = controller.directions[oldDirectionId];

      var newDirection = controller.directions[this.id];

      if(oldDirection.mode == newDirection.mode) {
        newMode.toggleDirections();
      } else {
        newMode.select();

        controller.hideDirectionsFor(oldDirection);
        controller.displayDirectionsFor(newDirection);

        $('#routing div').hide();
        $('#routing .' + this.id).show();
      }

      $('li.' + this.id).each(function(i, li) {
        var liHeight = $(li).height() - $('p.emissions', li).outerHeight(true) - 20;
        var liIncrement = $(li).width();

        var instructions = $('p.instructions', li);

        while(instructions.outerHeight(true) > liHeight) {
          $(li).width($(li).width() + liIncrement);
        }
      });

      return false;
    };
  },

  onModeHoverIn: function(controller) {
    return function() {
      var direction = controller.directions[this.id];
      var originalDirectionId = $('.selected', this.parentNode).get(0).id;
      var originalDirection = controller.directions[originalDirectionId];
      controller.hideDirectionsFor(originalDirection);
      controller.displayDirectionsFor(direction);
    };
  },

  onModeHoverOut: function(controller) {
    return function() {
      var direction = controller.directions[this.id];
      var originalDirectionId = $('.selected', this.parentNode).get(0).id;
      var originalDirection = controller.directions[originalDirectionId];
      controller.hideDirectionsFor(direction);
      controller.displayDirectionsFor(originalDirection);
    };
  },

  directionsRouteCallback: function(controller, callback) {
    return function(err, directions) {
      var routeView = controller.routeViewFor(directions);
      if(err) {
        routeView.disable();
      } else {
        routeView.updateDirections();
        controller.getEmissions(directions);
        if(directions.mode == 'DRIVING') {
          controller.directionsDisplay.setOptions({ preserveViewport: false });
          controller.directionsDisplay.setDirections(directions.directionsResult);
        }
        $('#' + directions.mode.toLowerCase() + ' a span.total_time').html(directions.totalTime());
      }
      callback(err);
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
      $('#origin').val('1916 Broadway, New York, NY');
      $('#destination').val('162 Madison Ave, New York, NY');
      return false;
    };
  }
};

IndexController.prototype.events = IndexController.events;

});

require.define("/lib/jquery-custom.js", function (require, module, exports, __dirname, __filename) {
    var $ = jQuery = require('jquery');

require('jquery.ui.core');
require('jquery.ui.widget');
require('jquery.ui.position');
require('jquery.ui.dialog');
require('jquery.effects.core');
require('jquery.effects.drop');
require('jquery.effects.slide');

module.exports = $;

});

require.define("/node_modules/jquery.ui.core/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"jquery.ui.core","description":"A jQuery UI widget.","version":"1.8.13","homepage":"http://jqueryui.com","authors":["jQuery UI Authors (http://jqueryui.com/about)"],"main":"./jquery.ui.core.js"}
});

require.define("/node_modules/jquery.ui.core/jquery.ui.core.js", function (require, module, exports, __dirname, __filename) {
    /*!
 * jQuery UI @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI
 */
(function( $, undefined ) {

// prevent duplicate loading
// this is only a problem because we proxy existing functions
// and we don't want to double proxy them
$.ui = $.ui || {};
if ( $.ui.version ) {
	return;
}

$.extend( $.ui, {
	version: "@VERSION",

	keyCode: {
		ALT: 18,
		BACKSPACE: 8,
		CAPS_LOCK: 20,
		COMMA: 188,
		COMMAND: 91,
		COMMAND_LEFT: 91, // COMMAND
		COMMAND_RIGHT: 93,
		CONTROL: 17,
		DELETE: 46,
		DOWN: 40,
		END: 35,
		ENTER: 13,
		ESCAPE: 27,
		HOME: 36,
		INSERT: 45,
		LEFT: 37,
		MENU: 93, // COMMAND_RIGHT
		NUMPAD_ADD: 107,
		NUMPAD_DECIMAL: 110,
		NUMPAD_DIVIDE: 111,
		NUMPAD_ENTER: 108,
		NUMPAD_MULTIPLY: 106,
		NUMPAD_SUBTRACT: 109,
		PAGE_DOWN: 34,
		PAGE_UP: 33,
		PERIOD: 190,
		RIGHT: 39,
		SHIFT: 16,
		SPACE: 32,
		TAB: 9,
		UP: 38,
		WINDOWS: 91 // COMMAND
	}
});

// plugins
$.fn.extend({
	_focus: $.fn.focus,
	focus: function( delay, fn ) {
		return typeof delay === "number" ?
			this.each(function() {
				var elem = this;
				setTimeout(function() {
					$( elem ).focus();
					if ( fn ) {
						fn.call( elem );
					}
				}, delay );
			}) :
			this._focus.apply( this, arguments );
	},

	scrollParent: function() {
		var scrollParent;
		if (($.browser.msie && (/(static|relative)/).test(this.css('position'))) || (/absolute/).test(this.css('position'))) {
			scrollParent = this.parents().filter(function() {
				return (/(relative|absolute|fixed)/).test($.curCSS(this,'position',1)) && (/(auto|scroll)/).test($.curCSS(this,'overflow',1)+$.curCSS(this,'overflow-y',1)+$.curCSS(this,'overflow-x',1));
			}).eq(0);
		} else {
			scrollParent = this.parents().filter(function() {
				return (/(auto|scroll)/).test($.curCSS(this,'overflow',1)+$.curCSS(this,'overflow-y',1)+$.curCSS(this,'overflow-x',1));
			}).eq(0);
		}

		return (/fixed/).test(this.css('position')) || !scrollParent.length ? $(document) : scrollParent;
	},

	zIndex: function( zIndex ) {
		if ( zIndex !== undefined ) {
			return this.css( "zIndex", zIndex );
		}

		if ( this.length ) {
			var elem = $( this[ 0 ] ), position, value;
			while ( elem.length && elem[ 0 ] !== document ) {
				// Ignore z-index if position is set to a value where z-index is ignored by the browser
				// This makes behavior of this function consistent across browsers
				// WebKit always returns auto if the element is positioned
				position = elem.css( "position" );
				if ( position === "absolute" || position === "relative" || position === "fixed" ) {
					// IE returns 0 when zIndex is not specified
					// other browsers return a string
					// we ignore the case of nested elements with an explicit value of 0
					// <div style="z-index: -10;"><div style="z-index: 0;"></div></div>
					value = parseInt( elem.css( "zIndex" ), 10 );
					if ( !isNaN( value ) && value !== 0 ) {
						return value;
					}
				}
				elem = elem.parent();
			}
		}

		return 0;
	},

	disableSelection: function() {
		return this.bind( ( $.support.selectstart ? "selectstart" : "mousedown" ) +
			".ui-disableSelection", function( event ) {
				event.preventDefault();
			});
	},

	enableSelection: function() {
		return this.unbind( ".ui-disableSelection" );
	}
});

$.each( [ "Width", "Height" ], function( i, name ) {
	var side = name === "Width" ? [ "Left", "Right" ] : [ "Top", "Bottom" ],
		type = name.toLowerCase(),
		orig = {
			innerWidth: $.fn.innerWidth,
			innerHeight: $.fn.innerHeight,
			outerWidth: $.fn.outerWidth,
			outerHeight: $.fn.outerHeight
		};

	function reduce( elem, size, border, margin ) {
		$.each( side, function() {
			size -= parseFloat( $.curCSS( elem, "padding" + this, true) ) || 0;
			if ( border ) {
				size -= parseFloat( $.curCSS( elem, "border" + this + "Width", true) ) || 0;
			}
			if ( margin ) {
				size -= parseFloat( $.curCSS( elem, "margin" + this, true) ) || 0;
			}
		});
		return size;
	}

	$.fn[ "inner" + name ] = function( size ) {
		if ( size === undefined ) {
			return orig[ "inner" + name ].call( this );
		}

		return this.each(function() {
			$( this ).css( type, reduce( this, size ) + "px" );
		});
	};

	$.fn[ "outer" + name] = function( size, margin ) {
		if ( typeof size !== "number" ) {
			return orig[ "outer" + name ].call( this, size );
		}

		return this.each(function() {
			$( this).css( type, reduce( this, size, true, margin ) + "px" );
		});
	};
});

// selectors
function focusable( element, isTabIndexNotNaN ) {
	var nodeName = element.nodeName.toLowerCase();
	if ( "area" === nodeName ) {
		var map = element.parentNode,
			mapName = map.name,
			img;
		if ( !element.href || !mapName || map.nodeName.toLowerCase() !== "map" ) {
			return false;
		}
		img = $( "img[usemap=#" + mapName + "]" )[0];
		return !!img && visible( img );
	}
	return ( /input|select|textarea|button|object/.test( nodeName )
		? !element.disabled
		: "a" == nodeName
			? element.href || isTabIndexNotNaN
			: isTabIndexNotNaN)
		// the element and all of its ancestors must be visible
		&& visible( element );
}

function visible( element ) {
	return !$( element ).parents().andSelf().filter(function() {
		return $.curCSS( this, "visibility" ) === "hidden" ||
			$.expr.filters.hidden( this );
	}).length;
}

$.extend( $.expr[ ":" ], {
	data: function( elem, i, match ) {
		return !!$.data( elem, match[ 3 ] );
	},

	focusable: function( element ) {
		return focusable( element, !isNaN( $.attr( element, "tabindex" ) ) );
	},

	tabbable: function( element ) {
		var tabIndex = $.attr( element, "tabindex" ),
			isTabIndexNaN = isNaN( tabIndex );
		return ( isTabIndexNaN || tabIndex >= 0 ) && focusable( element, !isTabIndexNaN );
	}
});

// support
$(function() {
	var body = document.body,
		div = body.appendChild( div = document.createElement( "div" ) );

	$.extend( div.style, {
		minHeight: "100px",
		height: "auto",
		padding: 0,
		borderWidth: 0
	});

	$.support.minHeight = div.offsetHeight === 100;
	$.support.selectstart = "onselectstart" in div;

	// set display to none to avoid a layout bug in IE
	// http://dev.jquery.com/ticket/4014
	body.removeChild( div ).style.display = "none";
});





// deprecated
$.extend( $.ui, {
	// $.ui.plugin is deprecated.  Use the proxy pattern instead.
	plugin: {
		add: function( module, option, set ) {
			var proto = $.ui[ module ].prototype;
			for ( var i in set ) {
				proto.plugins[ i ] = proto.plugins[ i ] || [];
				proto.plugins[ i ].push( [ option, set[ i ] ] );
			}
		},
		call: function( instance, name, args ) {
			var set = instance.plugins[ name ];
			if ( !set || !instance.element[ 0 ].parentNode ) {
				return;
			}
	
			for ( var i = 0; i < set.length; i++ ) {
				if ( instance.options[ set[ i ][ 0 ] ] ) {
					set[ i ][ 1 ].apply( instance.element, args );
				}
			}
		}
	},
	
	// will be deprecated when we switch to jQuery 1.4 - use jQuery.contains()
	contains: function( a, b ) {
		return document.compareDocumentPosition ?
			a.compareDocumentPosition( b ) & 16 :
			a !== b && a.contains( b );
	},
	
	// only used by resizable
	hasScroll: function( el, a ) {
	
		//If overflow is hidden, the element might have extra content, but the user wants to hide it
		if ( $( el ).css( "overflow" ) === "hidden") {
			return false;
		}
	
		var scroll = ( a && a === "left" ) ? "scrollLeft" : "scrollTop",
			has = false;
	
		if ( el[ scroll ] > 0 ) {
			return true;
		}
	
		// TODO: determine which cases actually cause this to happen
		// if the element doesn't have the scroll set, see if it's possible to
		// set the scroll
		el[ scroll ] = 1;
		has = ( el[ scroll ] > 0 );
		el[ scroll ] = 0;
		return has;
	},
	
	// these are odd functions, fix the API or move into individual plugins
	isOverAxis: function( x, reference, size ) {
		//Determines when x coordinate is over "b" element axis
		return ( x > reference ) && ( x < ( reference + size ) );
	},
	isOver: function( y, x, top, left, height, width ) {
		//Determines when x, y coordinates is over "b" element
		return $.ui.isOverAxis( y, top, height ) && $.ui.isOverAxis( x, left, width );
	}
});

})( jQuery );

});

require.define("/node_modules/jquery.ui.widget/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"jquery.ui.widget","description":"A jQuery UI widget.","version":"1.8.13","homepage":"http://jqueryui.com","authors":["jQuery UI Authors (http://jqueryui.com/about)"],"main":"./jquery.ui.widget.js"}
});

require.define("/node_modules/jquery.ui.widget/jquery.ui.widget.js", function (require, module, exports, __dirname, __filename) {
    /*!
 * jQuery UI Widget @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Widget
 */
(function( $, undefined ) {

// jQuery 1.4+
if ( $.cleanData ) {
	var _cleanData = $.cleanData;
	$.cleanData = function( elems ) {
		for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
			$( elem ).triggerHandler( "remove" );
		}
		_cleanData( elems );
	};
} else {
	var _remove = $.fn.remove;
	$.fn.remove = function( selector, keepData ) {
		return this.each(function() {
			if ( !keepData ) {
				if ( !selector || $.filter( selector, [ this ] ).length ) {
					$( "*", this ).add( [ this ] ).each(function() {
						$( this ).triggerHandler( "remove" );
					});
				}
			}
			return _remove.call( $(this), selector, keepData );
		});
	};
}

$.widget = function( name, base, prototype ) {
	var namespace = name.split( "." )[ 0 ],
		fullName;
	name = name.split( "." )[ 1 ];
	fullName = namespace + "-" + name;

	if ( !prototype ) {
		prototype = base;
		base = $.Widget;
	}

	// create selector for plugin
	$.expr[ ":" ][ fullName ] = function( elem ) {
		return !!$.data( elem, name );
	};

	$[ namespace ] = $[ namespace ] || {};
	$[ namespace ][ name ] = function( options, element ) {
		// allow instantiation without initializing for simple inheritance
		if ( arguments.length ) {
			this._createWidget( options, element );
		}
	};

	var basePrototype = new base();
	// we need to make the options hash a property directly on the new instance
	// otherwise we'll modify the options hash on the prototype that we're
	// inheriting from
//	$.each( basePrototype, function( key, val ) {
//		if ( $.isPlainObject(val) ) {
//			basePrototype[ key ] = $.extend( {}, val );
//		}
//	});
	basePrototype.options = $.extend( true, {}, basePrototype.options );
	$[ namespace ][ name ].prototype = $.extend( true, basePrototype, {
		namespace: namespace,
		widgetName: name,
		widgetEventPrefix: $[ namespace ][ name ].prototype.widgetEventPrefix || name,
		widgetBaseClass: fullName
	}, prototype );

	$.widget.bridge( name, $[ namespace ][ name ] );
};

$.widget.bridge = function( name, object ) {
	$.fn[ name ] = function( options ) {
		var isMethodCall = typeof options === "string",
			args = Array.prototype.slice.call( arguments, 1 ),
			returnValue = this;

		// allow multiple hashes to be passed on init
		options = !isMethodCall && args.length ?
			$.extend.apply( null, [ true, options ].concat(args) ) :
			options;

		// prevent calls to internal methods
		if ( isMethodCall && options.charAt( 0 ) === "_" ) {
			return returnValue;
		}

		if ( isMethodCall ) {
			this.each(function() {
				var instance = $.data( this, name ),
					methodValue = instance && $.isFunction( instance[options] ) ?
						instance[ options ].apply( instance, args ) :
						instance;
				// TODO: add this back in 1.9 and use $.error() (see #5972)
//				if ( !instance ) {
//					throw "cannot call methods on " + name + " prior to initialization; " +
//						"attempted to call method '" + options + "'";
//				}
//				if ( !$.isFunction( instance[options] ) ) {
//					throw "no such method '" + options + "' for " + name + " widget instance";
//				}
//				var methodValue = instance[ options ].apply( instance, args );
				if ( methodValue !== instance && methodValue !== undefined ) {
					returnValue = methodValue;
					return false;
				}
			});
		} else {
			this.each(function() {
				var instance = $.data( this, name );
				if ( instance ) {
					instance.option( options || {} )._init();
				} else {
					$.data( this, name, new object( options, this ) );
				}
			});
		}

		return returnValue;
	};
};

$.Widget = function( options, element ) {
	// allow instantiation without initializing for simple inheritance
	if ( arguments.length ) {
		this._createWidget( options, element );
	}
};

$.Widget.prototype = {
	widgetName: "widget",
	widgetEventPrefix: "",
	options: {
		disabled: false
	},
	_createWidget: function( options, element ) {
		// $.widget.bridge stores the plugin instance, but we do it anyway
		// so that it's stored even before the _create function runs
		$.data( element, this.widgetName, this );
		this.element = $( element );
		this.options = $.extend( true, {},
			this.options,
			this._getCreateOptions(),
			options );

		var self = this;
		this.element.bind( "remove." + this.widgetName, function() {
			self.destroy();
		});

		this._create();
		this._trigger( "create" );
		this._init();
	},
	_getCreateOptions: function() {
		return $.metadata && $.metadata.get( this.element[0] )[ this.widgetName ];
	},
	_create: function() {},
	_init: function() {},

	destroy: function() {
		this.element
			.unbind( "." + this.widgetName )
			.removeData( this.widgetName );
		this.widget()
			.unbind( "." + this.widgetName )
			.removeAttr( "aria-disabled" )
			.removeClass(
				this.widgetBaseClass + "-disabled " +
				"ui-state-disabled" );
	},

	widget: function() {
		return this.element;
	},

	option: function( key, value ) {
		var options = key;

		if ( arguments.length === 0 ) {
			// don't return a reference to the internal hash
			return $.extend( {}, this.options );
		}

		if  (typeof key === "string" ) {
			if ( value === undefined ) {
				return this.options[ key ];
			}
			options = {};
			options[ key ] = value;
		}

		this._setOptions( options );

		return this;
	},
	_setOptions: function( options ) {
		var self = this;
		$.each( options, function( key, value ) {
			self._setOption( key, value );
		});

		return this;
	},
	_setOption: function( key, value ) {
		this.options[ key ] = value;

		if ( key === "disabled" ) {
			this.widget()
				[ value ? "addClass" : "removeClass"](
					this.widgetBaseClass + "-disabled" + " " +
					"ui-state-disabled" )
				.attr( "aria-disabled", value );
		}

		return this;
	},

	enable: function() {
		return this._setOption( "disabled", false );
	},
	disable: function() {
		return this._setOption( "disabled", true );
	},

	_trigger: function( type, event, data ) {
		var callback = this.options[ type ];

		event = $.Event( event );
		event.type = ( type === this.widgetEventPrefix ?
			type :
			this.widgetEventPrefix + type ).toLowerCase();
		data = data || {};

		// copy original event properties over to the new event
		// this would happen if we could call $.event.fix instead of $.Event
		// but we don't have a way to force an event to be fixed multiple times
		if ( event.originalEvent ) {
			for ( var i = $.event.props.length, prop; i; ) {
				prop = $.event.props[ --i ];
				event[ prop ] = event.originalEvent[ prop ];
			}
		}

		this.element.trigger( event, data );

		return !( $.isFunction(callback) &&
			callback.call( this.element[0], event, data ) === false ||
			event.isDefaultPrevented() );
	}
};

})( jQuery );

});

require.define("/node_modules/jquery.ui.position/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"jquery.ui.position","description":"A jQuery UI widget.","version":"1.8.13","homepage":"http://jqueryui.com","authors":["jQuery UI Authors (http://jqueryui.com/about)"],"main":"./jquery.ui.position.js"}
});

require.define("/node_modules/jquery.ui.position/jquery.ui.position.js", function (require, module, exports, __dirname, __filename) {
    /*
 * jQuery UI Position @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Position
 */
(function( $, undefined ) {

$.ui = $.ui || {};

var horizontalPositions = /left|center|right/,
	verticalPositions = /top|center|bottom/,
	center = "center",
	_position = $.fn.position,
	_offset = $.fn.offset;

$.fn.position = function( options ) {
	if ( !options || !options.of ) {
		return _position.apply( this, arguments );
	}

	// make a copy, we don't want to modify arguments
	options = $.extend( {}, options );

	var target = $( options.of ),
		targetElem = target[0],
		collision = ( options.collision || "flip" ).split( " " ),
		offset = options.offset ? options.offset.split( " " ) : [ 0, 0 ],
		targetWidth,
		targetHeight,
		basePosition;

	if ( targetElem.nodeType === 9 ) {
		targetWidth = target.width();
		targetHeight = target.height();
		basePosition = { top: 0, left: 0 };
	// TODO: use $.isWindow() in 1.9
	} else if ( targetElem.setTimeout ) {
		targetWidth = target.width();
		targetHeight = target.height();
		basePosition = { top: target.scrollTop(), left: target.scrollLeft() };
	} else if ( targetElem.preventDefault ) {
		// force left top to allow flipping
		options.at = "left top";
		targetWidth = targetHeight = 0;
		basePosition = { top: options.of.pageY, left: options.of.pageX };
	} else {
		targetWidth = target.outerWidth();
		targetHeight = target.outerHeight();
		basePosition = target.offset();
	}

	// force my and at to have valid horizontal and veritcal positions
	// if a value is missing or invalid, it will be converted to center 
	$.each( [ "my", "at" ], function() {
		var pos = ( options[this] || "" ).split( " " );
		if ( pos.length === 1) {
			pos = horizontalPositions.test( pos[0] ) ?
				pos.concat( [center] ) :
				verticalPositions.test( pos[0] ) ?
					[ center ].concat( pos ) :
					[ center, center ];
		}
		pos[ 0 ] = horizontalPositions.test( pos[0] ) ? pos[ 0 ] : center;
		pos[ 1 ] = verticalPositions.test( pos[1] ) ? pos[ 1 ] : center;
		options[ this ] = pos;
	});

	// normalize collision option
	if ( collision.length === 1 ) {
		collision[ 1 ] = collision[ 0 ];
	}

	// normalize offset option
	offset[ 0 ] = parseInt( offset[0], 10 ) || 0;
	if ( offset.length === 1 ) {
		offset[ 1 ] = offset[ 0 ];
	}
	offset[ 1 ] = parseInt( offset[1], 10 ) || 0;

	if ( options.at[0] === "right" ) {
		basePosition.left += targetWidth;
	} else if ( options.at[0] === center ) {
		basePosition.left += targetWidth / 2;
	}

	if ( options.at[1] === "bottom" ) {
		basePosition.top += targetHeight;
	} else if ( options.at[1] === center ) {
		basePosition.top += targetHeight / 2;
	}

	basePosition.left += offset[ 0 ];
	basePosition.top += offset[ 1 ];

	return this.each(function() {
		var elem = $( this ),
			elemWidth = elem.outerWidth(),
			elemHeight = elem.outerHeight(),
			marginLeft = parseInt( $.curCSS( this, "marginLeft", true ) ) || 0,
			marginTop = parseInt( $.curCSS( this, "marginTop", true ) ) || 0,
			collisionWidth = elemWidth + marginLeft +
				( parseInt( $.curCSS( this, "marginRight", true ) ) || 0 ),
			collisionHeight = elemHeight + marginTop +
				( parseInt( $.curCSS( this, "marginBottom", true ) ) || 0 ),
			position = $.extend( {}, basePosition ),
			collisionPosition;

		if ( options.my[0] === "right" ) {
			position.left -= elemWidth;
		} else if ( options.my[0] === center ) {
			position.left -= elemWidth / 2;
		}

		if ( options.my[1] === "bottom" ) {
			position.top -= elemHeight;
		} else if ( options.my[1] === center ) {
			position.top -= elemHeight / 2;
		}

		// prevent fractions (see #5280)
		position.left = Math.round( position.left );
		position.top = Math.round( position.top );

		collisionPosition = {
			left: position.left - marginLeft,
			top: position.top - marginTop
		};

		$.each( [ "left", "top" ], function( i, dir ) {
			if ( $.ui.position[ collision[i] ] ) {
				$.ui.position[ collision[i] ][ dir ]( position, {
					targetWidth: targetWidth,
					targetHeight: targetHeight,
					elemWidth: elemWidth,
					elemHeight: elemHeight,
					collisionPosition: collisionPosition,
					collisionWidth: collisionWidth,
					collisionHeight: collisionHeight,
					offset: offset,
					my: options.my,
					at: options.at
				});
			}
		});

		if ( $.fn.bgiframe ) {
			elem.bgiframe();
		}
		elem.offset( $.extend( position, { using: options.using } ) );
	});
};

$.ui.position = {
	fit: {
		left: function( position, data ) {
			var win = $( window ),
				over = data.collisionPosition.left + data.collisionWidth - win.width() - win.scrollLeft();
			position.left = over > 0 ? position.left - over : Math.max( position.left - data.collisionPosition.left, position.left );
		},
		top: function( position, data ) {
			var win = $( window ),
				over = data.collisionPosition.top + data.collisionHeight - win.height() - win.scrollTop();
			position.top = over > 0 ? position.top - over : Math.max( position.top - data.collisionPosition.top, position.top );
		}
	},

	flip: {
		left: function( position, data ) {
			if ( data.at[0] === center ) {
				return;
			}
			var win = $( window ),
				over = data.collisionPosition.left + data.collisionWidth - win.width() - win.scrollLeft(),
				myOffset = data.my[ 0 ] === "left" ?
					-data.elemWidth :
					data.my[ 0 ] === "right" ?
						data.elemWidth :
						0,
				atOffset = data.at[ 0 ] === "left" ?
					data.targetWidth :
					-data.targetWidth,
				offset = -2 * data.offset[ 0 ];
			position.left += data.collisionPosition.left < 0 ?
				myOffset + atOffset + offset :
				over > 0 ?
					myOffset + atOffset + offset :
					0;
		},
		top: function( position, data ) {
			if ( data.at[1] === center ) {
				return;
			}
			var win = $( window ),
				over = data.collisionPosition.top + data.collisionHeight - win.height() - win.scrollTop(),
				myOffset = data.my[ 1 ] === "top" ?
					-data.elemHeight :
					data.my[ 1 ] === "bottom" ?
						data.elemHeight :
						0,
				atOffset = data.at[ 1 ] === "top" ?
					data.targetHeight :
					-data.targetHeight,
				offset = -2 * data.offset[ 1 ];
			position.top += data.collisionPosition.top < 0 ?
				myOffset + atOffset + offset :
				over > 0 ?
					myOffset + atOffset + offset :
					0;
		}
	}
};

// offset setter from jQuery 1.4
if ( !$.offset.setOffset ) {
	$.offset.setOffset = function( elem, options ) {
		// set position first, in-case top/left are set even on static elem
		if ( /static/.test( $.curCSS( elem, "position" ) ) ) {
			elem.style.position = "relative";
		}
		var curElem   = $( elem ),
			curOffset = curElem.offset(),
			curTop    = parseInt( $.curCSS( elem, "top",  true ), 10 ) || 0,
			curLeft   = parseInt( $.curCSS( elem, "left", true ), 10)  || 0,
			props     = {
				top:  (options.top  - curOffset.top)  + curTop,
				left: (options.left - curOffset.left) + curLeft
			};
		
		if ( 'using' in options ) {
			options.using.call( elem, props );
		} else {
			curElem.css( props );
		}
	};

	$.fn.offset = function( options ) {
		var elem = this[ 0 ];
		if ( !elem || !elem.ownerDocument ) { return null; }
		if ( options ) { 
			return this.each(function() {
				$.offset.setOffset( this, options );
			});
		}
		return _offset.call( this );
	};
}

}( jQuery ));

});

require.define("/node_modules/jquery.ui.dialog/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"jquery.ui.dialog","description":"A jQuery UI widget.","versions":"1.8.13","maintainers":"ryanflorence <rpflorence+npm@gmail.com>","version":"1.8.13","homepage":"http://jqueryui.com","authors":"jQuery UI Authors (http://jqueryui.com/about)","main":"./jquery.ui.dialog.js","dependencies":{"jquery.ui.core":"1.8.13","jquery.ui.widget":"1.8.13","jquery.ui.button":"1.8.13","jquery.ui.draggable":"1.8.13","jquery.ui.mouse":"1.8.13","jquery.ui.position":"1.8.13","jquery.ui.resizable":"1.8.13"},"engines":"*"}
});

require.define("/node_modules/jquery.ui.dialog/jquery.ui.dialog.js", function (require, module, exports, __dirname, __filename) {
    /*
 * jQuery UI Dialog @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Dialog
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *  jquery.ui.button.js
 *	jquery.ui.draggable.js
 *	jquery.ui.mouse.js
 *	jquery.ui.position.js
 *	jquery.ui.resizable.js
 */
(function( $, undefined ) {

var uiDialogClasses =
		'ui-dialog ' +
		'ui-widget ' +
		'ui-widget-content ' +
		'ui-corner-all ',
	sizeRelatedOptions = {
		buttons: true,
		height: true,
		maxHeight: true,
		maxWidth: true,
		minHeight: true,
		minWidth: true,
		width: true
	},
	resizableRelatedOptions = {
		maxHeight: true,
		maxWidth: true,
		minHeight: true,
		minWidth: true
	},
	// support for jQuery 1.3.2 - handle common attrFn methods for dialog
	attrFn = $.attrFn || {
		val: true,
		css: true,
		html: true,
		text: true,
		data: true,
		width: true,
		height: true,
		offset: true,
		click: true
	};

$.widget("ui.dialog", {
	options: {
		autoOpen: true,
		buttons: {},
		closeOnEscape: true,
		closeText: 'close',
		dialogClass: '',
		draggable: true,
		hide: null,
		height: 'auto',
		maxHeight: false,
		maxWidth: false,
		minHeight: 150,
		minWidth: 150,
		modal: false,
		position: {
			my: 'center',
			at: 'center',
			collision: 'fit',
			// ensure that the titlebar is never outside the document
			using: function(pos) {
				var topOffset = $(this).css(pos).offset().top;
				if (topOffset < 0) {
					$(this).css('top', pos.top - topOffset);
				}
			}
		},
		resizable: true,
		show: null,
		stack: true,
		title: '',
		width: 300,
		zIndex: 1000
	},

	_create: function() {
		this.originalTitle = this.element.attr('title');
		// #5742 - .attr() might return a DOMElement
		if ( typeof this.originalTitle !== "string" ) {
			this.originalTitle = "";
		}

		this.options.title = this.options.title || this.originalTitle;
		var self = this,
			options = self.options,

			title = options.title || '&#160;',
			titleId = $.ui.dialog.getTitleId(self.element),

			uiDialog = (self.uiDialog = $('<div></div>'))
				.appendTo(document.body)
				.hide()
				.addClass(uiDialogClasses + options.dialogClass)
				.css({
					zIndex: options.zIndex
				})
				// setting tabIndex makes the div focusable
				// setting outline to 0 prevents a border on focus in Mozilla
				.attr('tabIndex', -1).css('outline', 0).keydown(function(event) {
					if (options.closeOnEscape && event.keyCode &&
						event.keyCode === $.ui.keyCode.ESCAPE) {
						
						self.close(event);
						event.preventDefault();
					}
				})
				.attr({
					role: 'dialog',
					'aria-labelledby': titleId
				})
				.mousedown(function(event) {
					self.moveToTop(false, event);
				}),

			uiDialogContent = self.element
				.show()
				.removeAttr('title')
				.addClass(
					'ui-dialog-content ' +
					'ui-widget-content')
				.appendTo(uiDialog),

			uiDialogTitlebar = (self.uiDialogTitlebar = $('<div></div>'))
				.addClass(
					'ui-dialog-titlebar ' +
					'ui-widget-header ' +
					'ui-corner-all ' +
					'ui-helper-clearfix'
				)
				.prependTo(uiDialog),

			uiDialogTitlebarClose = $('<a href="#"></a>')
				.addClass(
					'ui-dialog-titlebar-close ' +
					'ui-corner-all'
				)
				.attr('role', 'button')
				.hover(
					function() {
						uiDialogTitlebarClose.addClass('ui-state-hover');
					},
					function() {
						uiDialogTitlebarClose.removeClass('ui-state-hover');
					}
				)
				.focus(function() {
					uiDialogTitlebarClose.addClass('ui-state-focus');
				})
				.blur(function() {
					uiDialogTitlebarClose.removeClass('ui-state-focus');
				})
				.click(function(event) {
					self.close(event);
					return false;
				})
				.appendTo(uiDialogTitlebar),

			uiDialogTitlebarCloseText = (self.uiDialogTitlebarCloseText = $('<span></span>'))
				.addClass(
					'ui-icon ' +
					'ui-icon-closethick'
				)
				.text(options.closeText)
				.appendTo(uiDialogTitlebarClose),

			uiDialogTitle = $('<span></span>')
				.addClass('ui-dialog-title')
				.attr('id', titleId)
				.html(title)
				.prependTo(uiDialogTitlebar);

		//handling of deprecated beforeclose (vs beforeClose) option
		//Ticket #4669 http://dev.jqueryui.com/ticket/4669
		//TODO: remove in 1.9pre
		if ($.isFunction(options.beforeclose) && !$.isFunction(options.beforeClose)) {
			options.beforeClose = options.beforeclose;
		}

		uiDialogTitlebar.find("*").add(uiDialogTitlebar).disableSelection();

		if (options.draggable && $.fn.draggable) {
			self._makeDraggable();
		}
		if (options.resizable && $.fn.resizable) {
			self._makeResizable();
		}

		self._createButtons(options.buttons);
		self._isOpen = false;

		if ($.fn.bgiframe) {
			uiDialog.bgiframe();
		}
	},

	_init: function() {
		if ( this.options.autoOpen ) {
			this.open();
		}
	},

	destroy: function() {
		var self = this;
		
		if (self.overlay) {
			self.overlay.destroy();
		}
		self.uiDialog.hide();
		self.element
			.unbind('.dialog')
			.removeData('dialog')
			.removeClass('ui-dialog-content ui-widget-content')
			.hide().appendTo('body');
		self.uiDialog.remove();

		if (self.originalTitle) {
			self.element.attr('title', self.originalTitle);
		}

		return self;
	},

	widget: function() {
		return this.uiDialog;
	},

	close: function(event) {
		var self = this,
			maxZ, thisZ;
		
		if (false === self._trigger('beforeClose', event)) {
			return;
		}

		if (self.overlay) {
			self.overlay.destroy();
		}
		self.uiDialog.unbind('keypress.ui-dialog');

		self._isOpen = false;

		if (self.options.hide) {
			self.uiDialog.hide(self.options.hide, function() {
				self._trigger('close', event);
			});
		} else {
			self.uiDialog.hide();
			self._trigger('close', event);
		}

		$.ui.dialog.overlay.resize();

		// adjust the maxZ to allow other modal dialogs to continue to work (see #4309)
		if (self.options.modal) {
			maxZ = 0;
			$('.ui-dialog').each(function() {
				if (this !== self.uiDialog[0]) {
					thisZ = $(this).css('z-index');
					if(!isNaN(thisZ)) {
						maxZ = Math.max(maxZ, thisZ);
					}
				}
			});
			$.ui.dialog.maxZ = maxZ;
		}

		return self;
	},

	isOpen: function() {
		return this._isOpen;
	},

	// the force parameter allows us to move modal dialogs to their correct
	// position on open
	moveToTop: function(force, event) {
		var self = this,
			options = self.options,
			saveScroll;

		if ((options.modal && !force) ||
			(!options.stack && !options.modal)) {
			return self._trigger('focus', event);
		}

		if (options.zIndex > $.ui.dialog.maxZ) {
			$.ui.dialog.maxZ = options.zIndex;
		}
		if (self.overlay) {
			$.ui.dialog.maxZ += 1;
			self.overlay.$el.css('z-index', $.ui.dialog.overlay.maxZ = $.ui.dialog.maxZ);
		}

		//Save and then restore scroll since Opera 9.5+ resets when parent z-Index is changed.
		//  http://ui.jquery.com/bugs/ticket/3193
		saveScroll = { scrollTop: self.element.attr('scrollTop'), scrollLeft: self.element.attr('scrollLeft') };
		$.ui.dialog.maxZ += 1;
		self.uiDialog.css('z-index', $.ui.dialog.maxZ);
		self.element.attr(saveScroll);
		self._trigger('focus', event);

		return self;
	},

	open: function() {
		if (this._isOpen) { return; }

		var self = this,
			options = self.options,
			uiDialog = self.uiDialog;

		self.overlay = options.modal ? new $.ui.dialog.overlay(self) : null;
		self._size();
		self._position(options.position);
		uiDialog.show(options.show);
		self.moveToTop(true);

		// prevent tabbing out of modal dialogs
		if (options.modal) {
			uiDialog.bind('keypress.ui-dialog', function(event) {
				if (event.keyCode !== $.ui.keyCode.TAB) {
					return;
				}

				var tabbables = $(':tabbable', this),
					first = tabbables.filter(':first'),
					last  = tabbables.filter(':last');

				if (event.target === last[0] && !event.shiftKey) {
					first.focus(1);
					return false;
				} else if (event.target === first[0] && event.shiftKey) {
					last.focus(1);
					return false;
				}
			});
		}

		// set focus to the first tabbable element in the content area or the first button
		// if there are no tabbable elements, set focus on the dialog itself
		$(self.element.find(':tabbable').get().concat(
			uiDialog.find('.ui-dialog-buttonpane :tabbable').get().concat(
				uiDialog.get()))).eq(0).focus();

		self._isOpen = true;
		self._trigger('open');

		return self;
	},

	_createButtons: function(buttons) {
		var self = this,
			hasButtons = false,
			uiDialogButtonPane = $('<div></div>')
				.addClass(
					'ui-dialog-buttonpane ' +
					'ui-widget-content ' +
					'ui-helper-clearfix'
				),
			uiButtonSet = $( "<div></div>" )
				.addClass( "ui-dialog-buttonset" )
				.appendTo( uiDialogButtonPane );

		// if we already have a button pane, remove it
		self.uiDialog.find('.ui-dialog-buttonpane').remove();

		if (typeof buttons === 'object' && buttons !== null) {
			$.each(buttons, function() {
				return !(hasButtons = true);
			});
		}
		if (hasButtons) {
			$.each(buttons, function(name, props) {
				props = $.isFunction( props ) ?
					{ click: props, text: name } :
					props;
				var button = $('<button type="button"></button>')
					.click(function() {
						props.click.apply(self.element[0], arguments);
					})
					.appendTo(uiButtonSet);
				// can't use .attr( props, true ) with jQuery 1.3.2.
				$.each( props, function( key, value ) {
					if ( key === "click" ) {
						return;
					}
					if ( key in attrFn ) {
						button[ key ]( value );
					} else {
						button.attr( key, value );
					}
				});
				if ($.fn.button) {
					button.button();
				}
			});
			uiDialogButtonPane.appendTo(self.uiDialog);
		}
	},

	_makeDraggable: function() {
		var self = this,
			options = self.options,
			doc = $(document),
			heightBeforeDrag;

		function filteredUi(ui) {
			return {
				position: ui.position,
				offset: ui.offset
			};
		}

		self.uiDialog.draggable({
			cancel: '.ui-dialog-content, .ui-dialog-titlebar-close',
			handle: '.ui-dialog-titlebar',
			containment: 'document',
			start: function(event, ui) {
				heightBeforeDrag = options.height === "auto" ? "auto" : $(this).height();
				$(this).height($(this).height()).addClass("ui-dialog-dragging");
				self._trigger('dragStart', event, filteredUi(ui));
			},
			drag: function(event, ui) {
				self._trigger('drag', event, filteredUi(ui));
			},
			stop: function(event, ui) {
				options.position = [ui.position.left - doc.scrollLeft(),
					ui.position.top - doc.scrollTop()];
				$(this).removeClass("ui-dialog-dragging").height(heightBeforeDrag);
				self._trigger('dragStop', event, filteredUi(ui));
				$.ui.dialog.overlay.resize();
			}
		});
	},

	_makeResizable: function(handles) {
		handles = (handles === undefined ? this.options.resizable : handles);
		var self = this,
			options = self.options,
			// .ui-resizable has position: relative defined in the stylesheet
			// but dialogs have to use absolute or fixed positioning
			position = self.uiDialog.css('position'),
			resizeHandles = (typeof handles === 'string' ?
				handles	:
				'n,e,s,w,se,sw,ne,nw'
			);

		function filteredUi(ui) {
			return {
				originalPosition: ui.originalPosition,
				originalSize: ui.originalSize,
				position: ui.position,
				size: ui.size
			};
		}

		self.uiDialog.resizable({
			cancel: '.ui-dialog-content',
			containment: 'document',
			alsoResize: self.element,
			maxWidth: options.maxWidth,
			maxHeight: options.maxHeight,
			minWidth: options.minWidth,
			minHeight: self._minHeight(),
			handles: resizeHandles,
			start: function(event, ui) {
				$(this).addClass("ui-dialog-resizing");
				self._trigger('resizeStart', event, filteredUi(ui));
			},
			resize: function(event, ui) {
				self._trigger('resize', event, filteredUi(ui));
			},
			stop: function(event, ui) {
				$(this).removeClass("ui-dialog-resizing");
				options.height = $(this).height();
				options.width = $(this).width();
				self._trigger('resizeStop', event, filteredUi(ui));
				$.ui.dialog.overlay.resize();
			}
		})
		.css('position', position)
		.find('.ui-resizable-se').addClass('ui-icon ui-icon-grip-diagonal-se');
	},

	_minHeight: function() {
		var options = this.options;

		if (options.height === 'auto') {
			return options.minHeight;
		} else {
			return Math.min(options.minHeight, options.height);
		}
	},

	_position: function(position) {
		var myAt = [],
			offset = [0, 0],
			isVisible;

		if (position) {
			// deep extending converts arrays to objects in jQuery <= 1.3.2 :-(
	//		if (typeof position == 'string' || $.isArray(position)) {
	//			myAt = $.isArray(position) ? position : position.split(' ');

			if (typeof position === 'string' || (typeof position === 'object' && '0' in position)) {
				myAt = position.split ? position.split(' ') : [position[0], position[1]];
				if (myAt.length === 1) {
					myAt[1] = myAt[0];
				}

				$.each(['left', 'top'], function(i, offsetPosition) {
					if (+myAt[i] === myAt[i]) {
						offset[i] = myAt[i];
						myAt[i] = offsetPosition;
					}
				});

				position = {
					my: myAt.join(" "),
					at: myAt.join(" "),
					offset: offset.join(" ")
				};
			} 

			position = $.extend({}, $.ui.dialog.prototype.options.position, position);
		} else {
			position = $.ui.dialog.prototype.options.position;
		}

		// need to show the dialog to get the actual offset in the position plugin
		isVisible = this.uiDialog.is(':visible');
		if (!isVisible) {
			this.uiDialog.show();
		}
		this.uiDialog
			// workaround for jQuery bug #5781 http://dev.jquery.com/ticket/5781
			.css({ top: 0, left: 0 })
			.position($.extend({ of: window }, position));
		if (!isVisible) {
			this.uiDialog.hide();
		}
	},

	_setOptions: function( options ) {
		var self = this,
			resizableOptions = {},
			resize = false;

		$.each( options, function( key, value ) {
			self._setOption( key, value );
			
			if ( key in sizeRelatedOptions ) {
				resize = true;
			}
			if ( key in resizableRelatedOptions ) {
				resizableOptions[ key ] = value;
			}
		});

		if ( resize ) {
			this._size();
		}
		if ( this.uiDialog.is( ":data(resizable)" ) ) {
			this.uiDialog.resizable( "option", resizableOptions );
		}
	},

	_setOption: function(key, value){
		var self = this,
			uiDialog = self.uiDialog;

		switch (key) {
			//handling of deprecated beforeclose (vs beforeClose) option
			//Ticket #4669 http://dev.jqueryui.com/ticket/4669
			//TODO: remove in 1.9pre
			case "beforeclose":
				key = "beforeClose";
				break;
			case "buttons":
				self._createButtons(value);
				break;
			case "closeText":
				// ensure that we always pass a string
				self.uiDialogTitlebarCloseText.text("" + value);
				break;
			case "dialogClass":
				uiDialog
					.removeClass(self.options.dialogClass)
					.addClass(uiDialogClasses + value);
				break;
			case "disabled":
				if (value) {
					uiDialog.addClass('ui-dialog-disabled');
				} else {
					uiDialog.removeClass('ui-dialog-disabled');
				}
				break;
			case "draggable":
				var isDraggable = uiDialog.is( ":data(draggable)" );
				if ( isDraggable && !value ) {
					uiDialog.draggable( "destroy" );
				}
				
				if ( !isDraggable && value ) {
					self._makeDraggable();
				}
				break;
			case "position":
				self._position(value);
				break;
			case "resizable":
				// currently resizable, becoming non-resizable
				var isResizable = uiDialog.is( ":data(resizable)" );
				if (isResizable && !value) {
					uiDialog.resizable('destroy');
				}

				// currently resizable, changing handles
				if (isResizable && typeof value === 'string') {
					uiDialog.resizable('option', 'handles', value);
				}

				// currently non-resizable, becoming resizable
				if (!isResizable && value !== false) {
					self._makeResizable(value);
				}
				break;
			case "title":
				// convert whatever was passed in o a string, for html() to not throw up
				$(".ui-dialog-title", self.uiDialogTitlebar).html("" + (value || '&#160;'));
				break;
		}

		$.Widget.prototype._setOption.apply(self, arguments);
	},

	_size: function() {
		/* If the user has resized the dialog, the .ui-dialog and .ui-dialog-content
		 * divs will both have width and height set, so we need to reset them
		 */
		var options = this.options,
			nonContentHeight,
			minContentHeight,
			isVisible = this.uiDialog.is( ":visible" );

		// reset content sizing
		this.element.show().css({
			width: 'auto',
			minHeight: 0,
			height: 0
		});

		if (options.minWidth > options.width) {
			options.width = options.minWidth;
		}

		// reset wrapper sizing
		// determine the height of all the non-content elements
		nonContentHeight = this.uiDialog.css({
				height: 'auto',
				width: options.width
			})
			.height();
		minContentHeight = Math.max( 0, options.minHeight - nonContentHeight );
		
		if ( options.height === "auto" ) {
			// only needed for IE6 support
			if ( $.support.minHeight ) {
				this.element.css({
					minHeight: minContentHeight,
					height: "auto"
				});
			} else {
				this.uiDialog.show();
				var autoHeight = this.element.css( "height", "auto" ).height();
				if ( !isVisible ) {
					this.uiDialog.hide();
				}
				this.element.height( Math.max( autoHeight, minContentHeight ) );
			}
		} else {
			this.element.height( Math.max( options.height - nonContentHeight, 0 ) );
		}

		if (this.uiDialog.is(':data(resizable)')) {
			this.uiDialog.resizable('option', 'minHeight', this._minHeight());
		}
	}
});

$.extend($.ui.dialog, {
	version: "@VERSION",

	uuid: 0,
	maxZ: 0,

	getTitleId: function($el) {
		var id = $el.attr('id');
		if (!id) {
			this.uuid += 1;
			id = this.uuid;
		}
		return 'ui-dialog-title-' + id;
	},

	overlay: function(dialog) {
		this.$el = $.ui.dialog.overlay.create(dialog);
	}
});

$.extend($.ui.dialog.overlay, {
	instances: [],
	// reuse old instances due to IE memory leak with alpha transparency (see #5185)
	oldInstances: [],
	maxZ: 0,
	events: $.map('focus,mousedown,mouseup,keydown,keypress,click'.split(','),
		function(event) { return event + '.dialog-overlay'; }).join(' '),
	create: function(dialog) {
		if (this.instances.length === 0) {
			// prevent use of anchors and inputs
			// we use a setTimeout in case the overlay is created from an
			// event that we're going to be cancelling (see #2804)
			setTimeout(function() {
				// handle $(el).dialog().dialog('close') (see #4065)
				if ($.ui.dialog.overlay.instances.length) {
					$(document).bind($.ui.dialog.overlay.events, function(event) {
						// stop events if the z-index of the target is < the z-index of the overlay
						// we cannot return true when we don't want to cancel the event (#3523)
						if ($(event.target).zIndex() < $.ui.dialog.overlay.maxZ) {
							return false;
						}
					});
				}
			}, 1);

			// allow closing by pressing the escape key
			$(document).bind('keydown.dialog-overlay', function(event) {
				if (dialog.options.closeOnEscape && event.keyCode &&
					event.keyCode === $.ui.keyCode.ESCAPE) {
					
					dialog.close(event);
					event.preventDefault();
				}
			});

			// handle window resize
			$(window).bind('resize.dialog-overlay', $.ui.dialog.overlay.resize);
		}

		var $el = (this.oldInstances.pop() || $('<div></div>').addClass('ui-widget-overlay'))
			.appendTo(document.body)
			.css({
				width: this.width(),
				height: this.height()
			});

		if ($.fn.bgiframe) {
			$el.bgiframe();
		}

		this.instances.push($el);
		return $el;
	},

	destroy: function($el) {
		var indexOf = $.inArray($el, this.instances);
		if (indexOf != -1){
			this.oldInstances.push(this.instances.splice(indexOf, 1)[0]);
		}

		if (this.instances.length === 0) {
			$([document, window]).unbind('.dialog-overlay');
		}

		$el.remove();
		
		// adjust the maxZ to allow other modal dialogs to continue to work (see #4309)
		var maxZ = 0;
		$.each(this.instances, function() {
			maxZ = Math.max(maxZ, this.css('z-index'));
		});
		this.maxZ = maxZ;
	},

	height: function() {
		var scrollHeight,
			offsetHeight;
		// handle IE 6
		if ($.browser.msie && $.browser.version < 7) {
			scrollHeight = Math.max(
				document.documentElement.scrollHeight,
				document.body.scrollHeight
			);
			offsetHeight = Math.max(
				document.documentElement.offsetHeight,
				document.body.offsetHeight
			);

			if (scrollHeight < offsetHeight) {
				return $(window).height() + 'px';
			} else {
				return scrollHeight + 'px';
			}
		// handle "good" browsers
		} else {
			return $(document).height() + 'px';
		}
	},

	width: function() {
		var scrollWidth,
			offsetWidth;
		// handle IE 6
		if ($.browser.msie && $.browser.version < 7) {
			scrollWidth = Math.max(
				document.documentElement.scrollWidth,
				document.body.scrollWidth
			);
			offsetWidth = Math.max(
				document.documentElement.offsetWidth,
				document.body.offsetWidth
			);

			if (scrollWidth < offsetWidth) {
				return $(window).width() + 'px';
			} else {
				return scrollWidth + 'px';
			}
		// handle "good" browsers
		} else {
			return $(document).width() + 'px';
		}
	},

	resize: function() {
		/* If the dialog is draggable and the user drags it past the
		 * right edge of the window, the document becomes wider so we
		 * need to stretch the overlay. If the user then drags the
		 * dialog back to the left, the document will become narrower,
		 * so we need to shrink the overlay to the appropriate size.
		 * This is handled by shrinking the overlay before setting it
		 * to the full document size.
		 */
		var $overlays = $([]);
		$.each($.ui.dialog.overlay.instances, function() {
			$overlays = $overlays.add(this);
		});

		$overlays.css({
			width: 0,
			height: 0
		}).css({
			width: $.ui.dialog.overlay.width(),
			height: $.ui.dialog.overlay.height()
		});
	}
});

$.extend($.ui.dialog.overlay.prototype, {
	destroy: function() {
		$.ui.dialog.overlay.destroy(this.$el);
	}
});

}(jQuery));
});

require.define("/node_modules/jquery.effects.core/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"jquery.effects.core","description":"A jQuery UI widget.","version":"1.8.13","homepage":"http://jqueryui.com","authors":["jQuery UI Authors (http://jqueryui.com/about)"],"main":"./jquery.effects.core.js"}
});

require.define("/node_modules/jquery.effects.core/jquery.effects.core.js", function (require, module, exports, __dirname, __filename) {
    /*
 * jQuery UI Effects @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Effects/
 */
;jQuery.effects || (function($, undefined) {

$.effects = {};



/******************************************************************************/
/****************************** COLOR ANIMATIONS ******************************/
/******************************************************************************/

// override the animation for color styles
$.each(['backgroundColor', 'borderBottomColor', 'borderLeftColor',
	'borderRightColor', 'borderTopColor', 'borderColor', 'color', 'outlineColor'],
function(i, attr) {
	$.fx.step[attr] = function(fx) {
		if (!fx.colorInit) {
			fx.start = getColor(fx.elem, attr);
			fx.end = getRGB(fx.end);
			fx.colorInit = true;
		}

		fx.elem.style[attr] = 'rgb(' +
			Math.max(Math.min(parseInt((fx.pos * (fx.end[0] - fx.start[0])) + fx.start[0], 10), 255), 0) + ',' +
			Math.max(Math.min(parseInt((fx.pos * (fx.end[1] - fx.start[1])) + fx.start[1], 10), 255), 0) + ',' +
			Math.max(Math.min(parseInt((fx.pos * (fx.end[2] - fx.start[2])) + fx.start[2], 10), 255), 0) + ')';
	};
});

// Color Conversion functions from highlightFade
// By Blair Mitchelmore
// http://jquery.offput.ca/highlightFade/

// Parse strings looking for color tuples [255,255,255]
function getRGB(color) {
		var result;

		// Check if we're already dealing with an array of colors
		if ( color && color.constructor == Array && color.length == 3 )
				return color;

		// Look for rgb(num,num,num)
		if (result = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(color))
				return [parseInt(result[1],10), parseInt(result[2],10), parseInt(result[3],10)];

		// Look for rgb(num%,num%,num%)
		if (result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(color))
				return [parseFloat(result[1])*2.55, parseFloat(result[2])*2.55, parseFloat(result[3])*2.55];

		// Look for #a0b1c2
		if (result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(color))
				return [parseInt(result[1],16), parseInt(result[2],16), parseInt(result[3],16)];

		// Look for #fff
		if (result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(color))
				return [parseInt(result[1]+result[1],16), parseInt(result[2]+result[2],16), parseInt(result[3]+result[3],16)];

		// Look for rgba(0, 0, 0, 0) == transparent in Safari 3
		if (result = /rgba\(0, 0, 0, 0\)/.exec(color))
				return colors['transparent'];

		// Otherwise, we're most likely dealing with a named color
		return colors[$.trim(color).toLowerCase()];
}

function getColor(elem, attr) {
		var color;

		do {
				color = $.curCSS(elem, attr);

				// Keep going until we find an element that has color, or we hit the body
				if ( color != '' && color != 'transparent' || $.nodeName(elem, "body") )
						break;

				attr = "backgroundColor";
		} while ( elem = elem.parentNode );

		return getRGB(color);
};

// Some named colors to work with
// From Interface by Stefan Petre
// http://interface.eyecon.ro/

var colors = {
	aqua:[0,255,255],
	azure:[240,255,255],
	beige:[245,245,220],
	black:[0,0,0],
	blue:[0,0,255],
	brown:[165,42,42],
	cyan:[0,255,255],
	darkblue:[0,0,139],
	darkcyan:[0,139,139],
	darkgrey:[169,169,169],
	darkgreen:[0,100,0],
	darkkhaki:[189,183,107],
	darkmagenta:[139,0,139],
	darkolivegreen:[85,107,47],
	darkorange:[255,140,0],
	darkorchid:[153,50,204],
	darkred:[139,0,0],
	darksalmon:[233,150,122],
	darkviolet:[148,0,211],
	fuchsia:[255,0,255],
	gold:[255,215,0],
	green:[0,128,0],
	indigo:[75,0,130],
	khaki:[240,230,140],
	lightblue:[173,216,230],
	lightcyan:[224,255,255],
	lightgreen:[144,238,144],
	lightgrey:[211,211,211],
	lightpink:[255,182,193],
	lightyellow:[255,255,224],
	lime:[0,255,0],
	magenta:[255,0,255],
	maroon:[128,0,0],
	navy:[0,0,128],
	olive:[128,128,0],
	orange:[255,165,0],
	pink:[255,192,203],
	purple:[128,0,128],
	violet:[128,0,128],
	red:[255,0,0],
	silver:[192,192,192],
	white:[255,255,255],
	yellow:[255,255,0],
	transparent: [255,255,255]
};



/******************************************************************************/
/****************************** CLASS ANIMATIONS ******************************/
/******************************************************************************/

var classAnimationActions = ['add', 'remove', 'toggle'],
	shorthandStyles = {
		border: 1,
		borderBottom: 1,
		borderColor: 1,
		borderLeft: 1,
		borderRight: 1,
		borderTop: 1,
		borderWidth: 1,
		margin: 1,
		padding: 1
	};

function getElementStyles() {
	var style = document.defaultView
			? document.defaultView.getComputedStyle(this, null)
			: this.currentStyle,
		newStyle = {},
		key,
		camelCase;

	// webkit enumerates style porperties
	if (style && style.length && style[0] && style[style[0]]) {
		var len = style.length;
		while (len--) {
			key = style[len];
			if (typeof style[key] == 'string') {
				camelCase = key.replace(/\-(\w)/g, function(all, letter){
					return letter.toUpperCase();
				});
				newStyle[camelCase] = style[key];
			}
		}
	} else {
		for (key in style) {
			if (typeof style[key] === 'string') {
				newStyle[key] = style[key];
			}
		}
	}
	
	return newStyle;
}

function filterStyles(styles) {
	var name, value;
	for (name in styles) {
		value = styles[name];
		if (
			// ignore null and undefined values
			value == null ||
			// ignore functions (when does this occur?)
			$.isFunction(value) ||
			// shorthand styles that need to be expanded
			name in shorthandStyles ||
			// ignore scrollbars (break in IE)
			(/scrollbar/).test(name) ||

			// only colors or values that can be converted to numbers
			(!(/color/i).test(name) && isNaN(parseFloat(value)))
		) {
			delete styles[name];
		}
	}
	
	return styles;
}

function styleDifference(oldStyle, newStyle) {
	var diff = { _: 0 }, // http://dev.jquery.com/ticket/5459
		name;

	for (name in newStyle) {
		if (oldStyle[name] != newStyle[name]) {
			diff[name] = newStyle[name];
		}
	}

	return diff;
}

$.effects.animateClass = function(value, duration, easing, callback) {
	if ($.isFunction(easing)) {
		callback = easing;
		easing = null;
	}

	return this.queue(function() {
		var that = $(this),
			originalStyleAttr = that.attr('style') || ' ',
			originalStyle = filterStyles(getElementStyles.call(this)),
			newStyle,
			className = that.attr('class');

		$.each(classAnimationActions, function(i, action) {
			if (value[action]) {
				that[action + 'Class'](value[action]);
			}
		});
		newStyle = filterStyles(getElementStyles.call(this));
		that.attr('class', className);

		that.animate(styleDifference(originalStyle, newStyle), {
			queue: false,
			duration: duration,
			easding: easing,
			complete: function() {
				$.each(classAnimationActions, function(i, action) {
					if (value[action]) { that[action + 'Class'](value[action]); }
				});
				// work around bug in IE by clearing the cssText before setting it
				if (typeof that.attr('style') == 'object') {
					that.attr('style').cssText = '';
					that.attr('style').cssText = originalStyleAttr;
				} else {
					that.attr('style', originalStyleAttr);
				}
				if (callback) { callback.apply(this, arguments); }
				$.dequeue( this );
			}
		});
	});
};

$.fn.extend({
	_addClass: $.fn.addClass,
	addClass: function(classNames, speed, easing, callback) {
		return speed ? $.effects.animateClass.apply(this, [{ add: classNames },speed,easing,callback]) : this._addClass(classNames);
	},

	_removeClass: $.fn.removeClass,
	removeClass: function(classNames,speed,easing,callback) {
		return speed ? $.effects.animateClass.apply(this, [{ remove: classNames },speed,easing,callback]) : this._removeClass(classNames);
	},

	_toggleClass: $.fn.toggleClass,
	toggleClass: function(classNames, force, speed, easing, callback) {
		if ( typeof force == "boolean" || force === undefined ) {
			if ( !speed ) {
				// without speed parameter;
				return this._toggleClass(classNames, force);
			} else {
				return $.effects.animateClass.apply(this, [(force?{add:classNames}:{remove:classNames}),speed,easing,callback]);
			}
		} else {
			// without switch parameter;
			return $.effects.animateClass.apply(this, [{ toggle: classNames },force,speed,easing]);
		}
	},

	switchClass: function(remove,add,speed,easing,callback) {
		return $.effects.animateClass.apply(this, [{ add: add, remove: remove },speed,easing,callback]);
	}
});



/******************************************************************************/
/*********************************** EFFECTS **********************************/
/******************************************************************************/

$.extend($.effects, {
	version: "@VERSION",

	// Saves a set of properties in a data storage
	save: function(element, set) {
		for(var i=0; i < set.length; i++) {
			if(set[i] !== null) element.data("ec.storage."+set[i], element[0].style[set[i]]);
		}
	},

	// Restores a set of previously saved properties from a data storage
	restore: function(element, set) {
		for(var i=0; i < set.length; i++) {
			if(set[i] !== null) element.css(set[i], element.data("ec.storage."+set[i]));
		}
	},

	setMode: function(el, mode) {
		if (mode == 'toggle') mode = el.is(':hidden') ? 'show' : 'hide'; // Set for toggle
		return mode;
	},

	getBaseline: function(origin, original) { // Translates a [top,left] array into a baseline value
		// this should be a little more flexible in the future to handle a string & hash
		var y, x;
		switch (origin[0]) {
			case 'top': y = 0; break;
			case 'middle': y = 0.5; break;
			case 'bottom': y = 1; break;
			default: y = origin[0] / original.height;
		};
		switch (origin[1]) {
			case 'left': x = 0; break;
			case 'center': x = 0.5; break;
			case 'right': x = 1; break;
			default: x = origin[1] / original.width;
		};
		return {x: x, y: y};
	},

	// Wraps the element around a wrapper that copies position properties
	createWrapper: function(element) {

		// if the element is already wrapped, return it
		if (element.parent().is('.ui-effects-wrapper')) {
			return element.parent();
		}

		// wrap the element
		var props = {
				width: element.outerWidth(true),
				height: element.outerHeight(true),
				'float': element.css('float')
			},
			wrapper = $('<div></div>')
				.addClass('ui-effects-wrapper')
				.css({
					fontSize: '100%',
					background: 'transparent',
					border: 'none',
					margin: 0,
					padding: 0
				});

		element.wrap(wrapper);
		wrapper = element.parent(); //Hotfix for jQuery 1.4 since some change in wrap() seems to actually loose the reference to the wrapped element

		// transfer positioning properties to the wrapper
		if (element.css('position') == 'static') {
			wrapper.css({ position: 'relative' });
			element.css({ position: 'relative' });
		} else {
			$.extend(props, {
				position: element.css('position'),
				zIndex: element.css('z-index')
			});
			$.each(['top', 'left', 'bottom', 'right'], function(i, pos) {
				props[pos] = element.css(pos);
				if (isNaN(parseInt(props[pos], 10))) {
					props[pos] = 'auto';
				}
			});
			element.css({position: 'relative', top: 0, left: 0, right: 'auto', bottom: 'auto' });
		}

		return wrapper.css(props).show();
	},

	removeWrapper: function(element) {
		if (element.parent().is('.ui-effects-wrapper'))
			return element.parent().replaceWith(element);
		return element;
	},

	setTransition: function(element, list, factor, value) {
		value = value || {};
		$.each(list, function(i, x){
			unit = element.cssUnit(x);
			if (unit[0] > 0) value[x] = unit[0] * factor + unit[1];
		});
		return value;
	}
});


function _normalizeArguments(effect, options, speed, callback) {
	// shift params for method overloading
	if (typeof effect == 'object') {
		callback = options;
		speed = null;
		options = effect;
		effect = options.effect;
	}
	if ($.isFunction(options)) {
		callback = options;
		speed = null;
		options = {};
	}
        if (typeof options == 'number' || $.fx.speeds[options]) {
		callback = speed;
		speed = options;
		options = {};
	}
	if ($.isFunction(speed)) {
		callback = speed;
		speed = null;
	}

	options = options || {};

	speed = speed || options.duration;
	speed = $.fx.off ? 0 : typeof speed == 'number'
		? speed : speed in $.fx.speeds ? $.fx.speeds[speed] : $.fx.speeds._default;

	callback = callback || options.complete;

	return [effect, options, speed, callback];
}

function standardSpeed( speed ) {
	// valid standard speeds
	if ( !speed || typeof speed === "number" || $.fx.speeds[ speed ] ) {
		return true;
	}
	
	// invalid strings - treat as "normal" speed
	if ( typeof speed === "string" && !$.effects[ speed ] ) {
		return true;
	}
	
	return false;
}

$.fn.extend({
	effect: function(effect, options, speed, callback) {
		var args = _normalizeArguments.apply(this, arguments),
			// TODO: make effects take actual parameters instead of a hash
			args2 = {
				options: args[1],
				duration: args[2],
				callback: args[3]
			},
			mode = args2.options.mode,
			effectMethod = $.effects[effect];
		
		if ( $.fx.off || !effectMethod ) {
			// delegate to the original method (e.g., .show()) if possible
			if ( mode ) {
				return this[ mode ]( args2.duration, args2.callback );
			} else {
				return this.each(function() {
					if ( args2.callback ) {
						args2.callback.call( this );
					}
				});
			}
		}
		
		return effectMethod.call(this, args2);
	},

	_show: $.fn.show,
	show: function(speed) {
		if ( standardSpeed( speed ) ) {
			return this._show.apply(this, arguments);
		} else {
			var args = _normalizeArguments.apply(this, arguments);
			args[1].mode = 'show';
			return this.effect.apply(this, args);
		}
	},

	_hide: $.fn.hide,
	hide: function(speed) {
		if ( standardSpeed( speed ) ) {
			return this._hide.apply(this, arguments);
		} else {
			var args = _normalizeArguments.apply(this, arguments);
			args[1].mode = 'hide';
			return this.effect.apply(this, args);
		}
	},

	// jQuery core overloads toggle and creates _toggle
	__toggle: $.fn.toggle,
	toggle: function(speed) {
		if ( standardSpeed( speed ) || typeof speed === "boolean" || $.isFunction( speed ) ) {
			return this.__toggle.apply(this, arguments);
		} else {
			var args = _normalizeArguments.apply(this, arguments);
			args[1].mode = 'toggle';
			return this.effect.apply(this, args);
		}
	},

	// helper functions
	cssUnit: function(key) {
		var style = this.css(key), val = [];
		$.each( ['em','px','%','pt'], function(i, unit){
			if(style.indexOf(unit) > 0)
				val = [parseFloat(style), unit];
		});
		return val;
	}
});



/******************************************************************************/
/*********************************** EASING ***********************************/
/******************************************************************************/

/*
 * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
 *
 * Uses the built in easing capabilities added In jQuery 1.1
 * to offer multiple easing options
 *
 * TERMS OF USE - jQuery Easing
 *
 * Open source under the BSD License.
 *
 * Copyright 2008 George McGinley Smith
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list
 * of conditions and the following disclaimer in the documentation and/or other materials
 * provided with the distribution.
 *
 * Neither the name of the author nor the names of contributors may be used to endorse
 * or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
*/

// t: current time, b: begInnIng value, c: change In value, d: duration
$.easing.jswing = $.easing.swing;

$.extend($.easing,
{
	def: 'easeOutQuad',
	swing: function (x, t, b, c, d) {
		//alert($.easing.default);
		return $.easing[$.easing.def](x, t, b, c, d);
	},
	easeInQuad: function (x, t, b, c, d) {
		return c*(t/=d)*t + b;
	},
	easeOutQuad: function (x, t, b, c, d) {
		return -c *(t/=d)*(t-2) + b;
	},
	easeInOutQuad: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t + b;
		return -c/2 * ((--t)*(t-2) - 1) + b;
	},
	easeInCubic: function (x, t, b, c, d) {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeInQuart: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart: function (x, t, b, c, d) {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	easeInQuint: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t*t + b;
	},
	easeOutQuint: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	},
	easeInOutQuint: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
		return c/2*((t-=2)*t*t*t*t + 2) + b;
	},
	easeInSine: function (x, t, b, c, d) {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	easeOutSine: function (x, t, b, c, d) {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	},
	easeInOutSine: function (x, t, b, c, d) {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	easeInExpo: function (x, t, b, c, d) {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo: function (x, t, b, c, d) {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo: function (x, t, b, c, d) {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},
	easeInCirc: function (x, t, b, c, d) {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc: function (x, t, b, c, d) {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	easeInElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	},
	easeOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	},
	easeInOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	},
	easeInBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	easeInBounce: function (x, t, b, c, d) {
		return c - $.easing.easeOutBounce (x, d-t, 0, c, d) + b;
	},
	easeOutBounce: function (x, t, b, c, d) {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce: function (x, t, b, c, d) {
		if (t < d/2) return $.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
		return $.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
});

/*
 *
 * TERMS OF USE - EASING EQUATIONS
 *
 * Open source under the BSD License.
 *
 * Copyright 2001 Robert Penner
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list
 * of conditions and the following disclaimer in the documentation and/or other materials
 * provided with the distribution.
 *
 * Neither the name of the author nor the names of contributors may be used to endorse
 * or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

})(jQuery);

});

require.define("/node_modules/jquery.effects.drop/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"jquery.effects.drop","description":"A jQuery UI widget.","version":"1.8.13","homepage":"http://jqueryui.com","authors":["jQuery UI Authors (http://jqueryui.com/about)"],"main":"./jquery.effects.drop.js","dependencies":{"jquery.effects.core":"1.8.13"}}
});

require.define("/node_modules/jquery.effects.drop/jquery.effects.drop.js", function (require, module, exports, __dirname, __filename) {
    /*
 * jQuery UI Effects Drop @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Effects/Drop
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function( $, undefined ) {

$.effects.drop = function(o) {

	return this.queue(function() {

		// Create element
		var el = $(this), props = ['position','top','bottom','left','right','opacity'];

		// Set options
		var mode = $.effects.setMode(el, o.options.mode || 'hide'); // Set Mode
		var direction = o.options.direction || 'left'; // Default Direction

		// Adjust
		$.effects.save(el, props); el.show(); // Save & Show
		$.effects.createWrapper(el); // Create Wrapper
		var ref = (direction == 'up' || direction == 'down') ? 'top' : 'left';
		var motion = (direction == 'up' || direction == 'left') ? 'pos' : 'neg';
		var distance = o.options.distance || (ref == 'top' ? el.outerHeight({margin:true}) / 2 : el.outerWidth({margin:true}) / 2);
		if (mode == 'show') el.css('opacity', 0).css(ref, motion == 'pos' ? -distance : distance); // Shift

		// Animation
		var animation = {opacity: mode == 'show' ? 1 : 0};
		animation[ref] = (mode == 'show' ? (motion == 'pos' ? '+=' : '-=') : (motion == 'pos' ? '-=' : '+=')) + distance;

		// Animate
		el.animate(animation, { queue: false, duration: o.duration, easing: o.options.easing, complete: function() {
			if(mode == 'hide') el.hide(); // Hide
			$.effects.restore(el, props); $.effects.removeWrapper(el); // Restore
			if(o.callback) o.callback.apply(this, arguments); // Callback
			el.dequeue();
		}});

	});

};

})(jQuery);

});

require.define("/node_modules/jquery.effects.slide/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"jquery.effects.slide","description":"A jQuery UI widget.","version":"1.8.13","homepage":"http://jqueryui.com","authors":["jQuery UI Authors (http://jqueryui.com/about)"],"main":"./jquery.effects.slide.js","dependencies":{"jquery.effects.core":"1.8.13"}}
});

require.define("/node_modules/jquery.effects.slide/jquery.effects.slide.js", function (require, module, exports, __dirname, __filename) {
    /*
 * jQuery UI Effects Slide @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Effects/Slide
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function( $, undefined ) {

$.effects.slide = function(o) {

	return this.queue(function() {

		// Create element
		var el = $(this), props = ['position','top','bottom','left','right'];

		// Set options
		var mode = $.effects.setMode(el, o.options.mode || 'show'); // Set Mode
		var direction = o.options.direction || 'left'; // Default Direction

		// Adjust
		$.effects.save(el, props); el.show(); // Save & Show
		$.effects.createWrapper(el).css({overflow:'hidden'}); // Create Wrapper
		var ref = (direction == 'up' || direction == 'down') ? 'top' : 'left';
		var motion = (direction == 'up' || direction == 'left') ? 'pos' : 'neg';
		var distance = o.options.distance || (ref == 'top' ? el.outerHeight({margin:true}) : el.outerWidth({margin:true}));
		if (mode == 'show') el.css(ref, motion == 'pos' ? (isNaN(distance) ? "-" + distance : -distance) : distance); // Shift

		// Animation
		var animation = {};
		animation[ref] = (mode == 'show' ? (motion == 'pos' ? '+=' : '-=') : (motion == 'pos' ? '-=' : '+=')) + distance;

		// Animate
		el.animate(animation, { queue: false, duration: o.duration, easing: o.options.easing, complete: function() {
			if(mode == 'hide') el.hide(); // Hide
			$.effects.restore(el, props); $.effects.removeWrapper(el); // Restore
			if(o.callback) o.callback.apply(this, arguments); // Callback
			el.dequeue();
		}});

	});

};

})(jQuery);

});

require.define("/node_modules/async/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"async","description":"Higher-order functions and common patterns for asynchronous code","main":"./index","author":"Caolan McMahon","version":"0.1.15","repository":{"type":"git","url":"http://github.com/caolan/async.git"},"bugs":{"url":"http://github.com/caolan/async/issues"},"licenses":[{"type":"MIT","url":"http://github.com/caolan/async/raw/master/LICENSE"}]}
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

    var _indexOf = function (arr, item) {
        if (arr.indexOf) {
            return arr.indexOf(item);
        }
        for (var i = 0; i < arr.length; i += 1) {
            if (arr[i] === item) {
                return i;
            }
        }
        return -1;
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
            _forEach(listeners, function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
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
        if (!tasks.length) {
            return callback();
        }
        callback = callback || function () {};
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
                q.tasks.push({data: data, callback: callback});
                if(q.saturated && q.tasks.length == concurrency) q.saturated();
                async.nextTick(q.process);
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

require.define("/node_modules/cm1-route/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"cm1-route","version":"0.6.1","author":"Derek Kastner <dkastner@gmail.com>","description":"Routing API based on HootRoot","homepage":"http://github.com/brighterplanet/cm1-route","main":"lib/cm1-route.js","engine":"*","dependencies":{"async":"*","CM1":"0.6.x"},"devDependencies":{"coffee-script":"*","dkastner-browserify":"1.5.1","dkastner-http-browserify":"*","fakeweb":"*","jsdom":"*","sinon":"*","vows":"*"},"repository":{"type":"git","url":"git://github.com/brighterplanet/cm1-route.git"},"engines":{"node":"*"}}
});

require.define("/node_modules/cm1-route/lib/cm1-route.js", function (require, module, exports, __dirname, __filename) {
    if(!process.env) process.env = {};

var DirectionsFactory = require('./directions-factory'),
    FlyingDirections = require('./directions/flying-directions'),
    GoogleDirections = require('./directions/google-directions'),
    HopStopDirections = require('./directions/hop-stop-directions');

var Cm1Route = module.exports = {
  NumberFormatter: require('./number-formatter'),
  DirectionsFactory: DirectionsFactory,
  FlyingDirections: FlyingDirections,
  GoogleDirections: GoogleDirections,
  HopStopDirections: HopStopDirections
};

});

require.define("/node_modules/cm1-route/lib/directions-factory.js", function (require, module, exports, __dirname, __filename) {
    var FlyingDirections = require('./directions/flying-directions'),
    GoogleDirections = require('./directions/google-directions'),
    HopStopDirections = require('./directions/hop-stop-directions');

var DirectionsFactory = module.exports = {
  create: function(origin, destination, mode, day, time) {
    if(mode == 'PUBLICTRANSIT' || mode == 'SUBWAYING' || mode == 'BUSSING') {
      return new HopStopDirections(origin, destination, mode, day, time);
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
  this.geocodeOrigin = Directions.events.geocode(this, 'origin', 'originLatLng');
  this.geocodeDestination = Directions.events.geocode(this, 'destination', 'destinationLatLng');
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

    var directionsResult = { routes: [{
      legs: [{
        duration: { value: directions.duration() },
        distance: { value: directions.distanceInMeters },
        steps: steps
      }],
      warnings: [],
      bounds: GoogleDirectionsRoute.generateBounds(steps)
    }]};
    directions.storeRoute(directionsResult);

    callback(null, directions);
  };
};

});

require.define("/node_modules/cm1-route/lib/directions.js", function (require, module, exports, __dirname, __filename) {
    var async = require('async');

var DirectionsEvents = require('./directions-events'),
    SegmentFactory = require('./segment-factory'),
    TimeFormatter = require('./time-formatter');

var Directions = module.exports = function(origin, destination, mode) {
  this.origin = origin;
  this.destination = destination;
  this.mode = mode;
};

Directions.events = new DirectionsEvents();

Directions.prototype.isRouted = function() {
  return (typeof this.directionsResult != 'undefined');
};

Directions.prototype.storeRoute = function(result) {
  this.directionsResult = result;
  this.steps = result.routes[0].legs[0].steps;
  this.segments = [];
  for(var i = 0; i < this.steps.length; i++) {
    var step = this.steps[i];
    this.segments.push(SegmentFactory.create(i, step));
  }
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
  async.forEach(
    this.segments,
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
    HopStopSegment = require('./hop-stop-segment');

var AmtrakingSegment = module.exports = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.rail_class = 'intercity rail';
}
AmtrakingSegment.prototype = new HopStopSegment();

CM1.extend(AmtrakingSegment, {
  model: 'rail_trip',
  provides: ['duration', 'rail_class', { 'distance_estimate': 'distance' }]
});

});

require.define("/node_modules/cm1-route/node_modules/CM1/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"CM1","version":"0.6.0","author":"Derek Kastner <dkastner@gmail.com>","description":"JavaScript API for Brighter Planet's CM1 carbon/impact calculation service","homepage":"http://github.com/brighterplanet/CM1.js","main":"lib/cm1.js","engine":"*","devDependencies":{"async":"*","browserify":"*","coffee-script":"*","dkastner-http-browserify":"*","docco":"*","fakeweb":"*","jsdom":"*","sinon":"*","socket.io-client":"*","vows":"*"},"repository":{"type":"git","url":"git://github.com/brighterplanet/CM1.js.git"},"dependencies":{},"engines":{"node":"*"}}
});

require.define("/node_modules/cm1-route/node_modules/CM1/lib/cm1.js", function (require, module, exports, __dirname, __filename) {
    // Carbon, energy, and other environmental impact calculations for your 
// JavaScript objects. Built for the browser and Node.js.
var ImpactEstimate = require('./impact-estimate'),
  ImpactEstimator = require('./impact-estimator');

var CM1 = module.exports = function() {
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
  var attributes = Object.keys(properties);

  var proto = function() {};
  CM1.extend(proto, {
    model: type,
    provides: attributes
  });

  var object = new proto();
  for(var i = 0; i < attributes.length; i++) {
    var attribute = attributes[i];
    object[attribute] = properties[attribute];
  }

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
  var HttpAdapter = require('./adapters/http-adapter');
  CM1.adapter = new HttpAdapter();
};

// The **Websockets** adapter is ideal for when many calculations need to be made at once.
// You will need to `npm install socket.io-client` to use this.
CM1.useWebsocketAdapter = function() {
  var WebsocketAdapter = require('./adapters/websocket-adapter');
  CM1.adapter = new WebsocketAdapter();
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
  if(!CM1.adapter) CM1.useHttpAdapter();
  return CM1.adapter;
};

CM1.ImpactEstimate = ImpactEstimate;
CM1.ImpactEstimator = ImpactEstimator;
 
// ## Deploy With Browserify
// 
// CM1.js can be used with [browserify](http://github.com/substack/node-browserify).
// Simply `npm install CM1` and `require('CM1')` in your code.

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
    var http = require('http');

var ImpactEstimate = require('../impact-estimate'),
    Util = require('../util');

var HttpAdapter = module.exports = function() {
  this.host = 'impact.brighterplanet.com';
};

HttpAdapter.prototype.path = function(cm1) {
  return Util.pluralize(cm1.model) + '.json';
};

HttpAdapter.prototype.getImpacts = function(cm1, subject, params, callback) {
  var req = http.request({
    host: this.host, port: 80, path: this.path(cm1),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
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
      var json = JSON.parse(data);
      subject.impacts = new ImpactEstimate(subject, json);
      callback(null, subject.impacts);
    });
  });
  req.end(JSON.stringify(params));
};

});

require.define("/node_modules/cm1-route/node_modules/CM1/lib/util.js", function (require, module, exports, __dirname, __filename) {
    var Util = module.exports = {
  pluralize: function(str) {
    return str + 's';
  }
};

});

require.define("/node_modules/cm1-route/node_modules/CM1/lib/adapters/websocket-adapter.js", function (require, module, exports, __dirname, __filename) {
    var io = require('socket.io-client');

var ImpactEstimate = require('../impact-estimate'),
    Util = require('../util');

var WebsocketAdapter = module.exports = function() {
  this.host = CM1.websocketHost || 'push-brighterplanet.no.de';
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
  this.socket = io.connect();
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

require.define("/node_modules/socket.io-client/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"socket.io-client","description":"Socket.IO client for the browser and node.js","version":"0.8.7","main":"./lib/io.js","browserify":"./dist/socket.io.js","homepage":"http://socket.io","keywords":["websocket","socket","realtime","socket.io","comet","ajax"],"author":"Guillermo Rauch <guillermo@learnboost.com>","contributors":[{"name":"Guillermo Rauch","email":"rauchg@gmail.com"},{"name":"Arnout Kazemier","email":"info@3rd-eden.com"},{"name":"Vladimir Dronnikov","email":"dronnikov@gmail.com"},{"name":"Einar Otto Stangvik","email":"einaros@gmail.com"}],"repository":{"type":"git","url":"https://github.com/LearnBoost/socket.io-client.git"},"dependencies":{"uglify-js":"1.0.6","websocket-client":"1.0.0","xmlhttprequest":"1.2.2"},"devDependencies":{"expresso":"0.7.7","express":"2.3.11","jade":"0.12.1","stylus":"0.13.3","socket.io":"0.8.7","socket.io-client":"0.8.7"},"engines":{"node":">= 0.4.0"}}
});

require.define("/node_modules/socket.io-client/dist/socket.io.js", function (require, module, exports, __dirname, __filename) {
    /*! Socket.IO.js build:0.8.7, development. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * IO namespace.
   *
   * @namespace
   */

  var io = exports;

  /**
   * Socket.IO version
   *
   * @api public
   */

  io.version = '0.8.7';

  /**
   * Protocol implemented.
   *
   * @api public
   */

  io.protocol = 1;

  /**
   * Available transports, these will be populated with the available transports
   *
   * @api public
   */

  io.transports = [];

  /**
   * Keep track of jsonp callbacks.
   *
   * @api private
   */

  io.j = [];

  /**
   * Keep track of our io.Sockets
   *
   * @api private
   */
  io.sockets = {};


  /**
   * Manages connections to hosts.
   *
   * @param {String} uri
   * @Param {Boolean} force creation of new socket (defaults to false)
   * @api public
   */

  io.connect = function (host, details) {
    var uri = io.util.parseUri(host)
      , uuri
      , socket;

    if (global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document
        ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port;
    }

    uuri = io.util.uniqueUri(uri);

    var options = {
        host: uri.host
      , secure: 'https' == uri.protocol
      , port: uri.port || ('https' == uri.protocol ? 443 : 80)
      , query: uri.query || ''
    };

    io.util.merge(options, details);

    if (options['force new connection'] || !io.sockets[uuri]) {
      socket = new io.Socket(options);
    }

    if (!options['force new connection'] && socket) {
      io.sockets[uuri] = socket;
    }

    socket = socket || io.sockets[uuri];

    // if path is different from '' or /
    return socket.of(uri.path.length > 1 ? uri.path : '');
  };

})('object' === typeof module ? module.exports : (this.io = {}), this);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * Utilities namespace.
   *
   * @namespace
   */

  var util = exports.util = {};

  /**
   * Parses an URI
   *
   * @author Steven Levithan <stevenlevithan.com> (MIT license)
   * @api public
   */

  var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

  var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
               'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
               'anchor'];

  util.parseUri = function (str) {
    var m = re.exec(str || '')
      , uri = {}
      , i = 14;

    while (i--) {
      uri[parts[i]] = m[i] || '';
    }

    return uri;
  };

  /**
   * Produces a unique url that identifies a Socket.IO connection.
   *
   * @param {Object} uri
   * @api public
   */

  util.uniqueUri = function (uri) {
    var protocol = uri.protocol
      , host = uri.host
      , port = uri.port;

    if ('document' in global) {
      host = host || document.domain;
      port = port || (protocol == 'https'
        && document.location.protocol !== 'https:' ? 443 : document.location.port);
    } else {
      host = host || 'localhost';

      if (!port && protocol == 'https') {
        port = 443;
      }
    }

    return (protocol || 'http') + '://' + host + ':' + (port || 80);
  };

  /**
   * Mergest 2 query strings in to once unique query string
   *
   * @param {String} base
   * @param {String} addition
   * @api public
   */

  util.query = function (base, addition) {
    var query = util.chunkQuery(base || '')
      , components = [];

    util.merge(query, util.chunkQuery(addition || ''));
    for (var part in query) {
      if (query.hasOwnProperty(part)) {
        components.push(part + '=' + query[part]);
      }
    }

    return components.length ? '?' + components.join('&') : '';
  };

  /**
   * Transforms a querystring in to an object
   *
   * @param {String} qs
   * @api public
   */

  util.chunkQuery = function (qs) {
    var query = {}
      , params = qs.split('&')
      , i = 0
      , l = params.length
      , kv;

    for (; i < l; ++i) {
      kv = params[i].split('=');
      if (kv[0]) {
        query[kv[0]] = decodeURIComponent(kv[1]);
      }
    }

    return query;
  };

  /**
   * Executes the given function when the page is loaded.
   *
   *     io.util.load(function () { console.log('page loaded'); });
   *
   * @param {Function} fn
   * @api public
   */

  var pageLoaded = false;

  util.load = function (fn) {
    if ('document' in global && document.readyState === 'complete' || pageLoaded) {
      return fn();
    }

    util.on(global, 'load', fn, false);
  };

  /**
   * Adds an event.
   *
   * @api private
   */

  util.on = function (element, event, fn, capture) {
    if (element.attachEvent) {
      element.attachEvent('on' + event, fn);
    } else if (element.addEventListener) {
      element.addEventListener(event, fn, capture);
    }
  };

  /**
   * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
   *
   * @param {Boolean} [xdomain] Create a request that can be used cross domain.
   * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest.
   * @api private
   */

  util.request = function (xdomain) {

    if (xdomain && 'undefined' != typeof XDomainRequest) {
      return new XDomainRequest();
    }

    if ('undefined' != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
      return new XMLHttpRequest();
    }

    if (!xdomain) {
      try {
        return new ActiveXObject('Microsoft.XMLHTTP');
      } catch(e) { }
    }

    return null;
  };

  /**
   * XHR based transport constructor.
   *
   * @constructor
   * @api public
   */

  /**
   * Change the internal pageLoaded value.
   */

  if ('undefined' != typeof window) {
    util.load(function () {
      pageLoaded = true;
    });
  }

  /**
   * Defers a function to ensure a spinner is not displayed by the browser
   *
   * @param {Function} fn
   * @api public
   */

  util.defer = function (fn) {
    if (!util.ua.webkit || 'undefined' != typeof importScripts) {
      return fn();
    }

    util.load(function () {
      setTimeout(fn, 100);
    });
  };

  /**
   * Merges two objects.
   *
   * @api public
   */
  
  util.merge = function merge (target, additional, deep, lastseen) {
    var seen = lastseen || []
      , depth = typeof deep == 'undefined' ? 2 : deep
      , prop;

    for (prop in additional) {
      if (additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
        if (typeof target[prop] !== 'object' || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop]);
        } else {
          util.merge(target[prop], additional[prop], depth - 1, seen);
        }
      }
    }

    return target;
  };

  /**
   * Merges prototypes from objects
   *
   * @api public
   */
  
  util.mixin = function (ctor, ctor2) {
    util.merge(ctor.prototype, ctor2.prototype);
  };

  /**
   * Shortcut for prototypical and static inheritance.
   *
   * @api private
   */

  util.inherit = function (ctor, ctor2) {
    function f() {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  };

  /**
   * Checks if the given object is an Array.
   *
   *     io.util.isArray([]); // true
   *     io.util.isArray({}); // false
   *
   * @param Object obj
   * @api public
   */

  util.isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   * Intersects values of two arrays into a third
   *
   * @api public
   */

  util.intersect = function (arr, arr2) {
    var ret = []
      , longest = arr.length > arr2.length ? arr : arr2
      , shortest = arr.length > arr2.length ? arr2 : arr;

    for (var i = 0, l = shortest.length; i < l; i++) {
      if (~util.indexOf(longest, shortest[i]))
        ret.push(shortest[i]);
    }

    return ret;
  }

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  util.indexOf = function (arr, o, i) {
    if (Array.prototype.indexOf) {
      return Array.prototype.indexOf.call(arr, o, i);
    }

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0; 
         i < j && arr[i] !== o; i++) {}

    return j <= i ? -1 : i;
  };

  /**
   * Converts enumerables to array.
   *
   * @api public
   */

  util.toArray = function (enu) {
    var arr = [];

    for (var i = 0, l = enu.length; i < l; i++)
      arr.push(enu[i]);

    return arr;
  };

  /**
   * UA / engines detection namespace.
   *
   * @namespace
   */

  util.ua = {};

  /**
   * Whether the UA supports CORS for XHR.
   *
   * @api public
   */

  util.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
    try {
      var a = new XMLHttpRequest();
    } catch (e) {
      return false;
    }

    return a.withCredentials != undefined;
  })();

  /**
   * Detect webkit.
   *
   * @api public
   */

  util.ua.webkit = 'undefined' != typeof navigator
    && /webkit/i.test(navigator.userAgent);

})('undefined' != typeof io ? io : module.exports, this);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.EventEmitter = EventEmitter;

  /**
   * Event emitter constructor.
   *
   * @api public.
   */

  function EventEmitter () {};

  /**
   * Adds a listener
   *
   * @api public
   */

  EventEmitter.prototype.on = function (name, fn) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = fn;
    } else if (io.util.isArray(this.$events[name])) {
      this.$events[name].push(fn);
    } else {
      this.$events[name] = [this.$events[name], fn];
    }

    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  /**
   * Adds a volatile listener.
   *
   * @api public
   */

  EventEmitter.prototype.once = function (name, fn) {
    var self = this;

    function on () {
      self.removeListener(name, on);
      fn.apply(this, arguments);
    };

    on.listener = fn;
    this.on(name, on);

    return this;
  };

  /**
   * Removes a listener.
   *
   * @api public
   */

  EventEmitter.prototype.removeListener = function (name, fn) {
    if (this.$events && this.$events[name]) {
      var list = this.$events[name];

      if (io.util.isArray(list)) {
        var pos = -1;

        for (var i = 0, l = list.length; i < l; i++) {
          if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
            pos = i;
            break;
          }
        }

        if (pos < 0) {
          return this;
        }

        list.splice(pos, 1);

        if (!list.length) {
          delete this.$events[name];
        }
      } else if (list === fn || (list.listener && list.listener === fn)) {
        delete this.$events[name];
      }
    }

    return this;
  };

  /**
   * Removes all listeners for an event.
   *
   * @api public
   */

  EventEmitter.prototype.removeAllListeners = function (name) {
    // TODO: enable this when node 0.5 is stable
    //if (name === undefined) {
      //this.$events = {};
      //return this;
    //}

    if (this.$events && this.$events[name]) {
      this.$events[name] = null;
    }

    return this;
  };

  /**
   * Gets all listeners for a certain event.
   *
   * @api publci
   */

  EventEmitter.prototype.listeners = function (name) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = [];
    }

    if (!io.util.isArray(this.$events[name])) {
      this.$events[name] = [this.$events[name]];
    }

    return this.$events[name];
  };

  /**
   * Emits an event.
   *
   * @api public
   */

  EventEmitter.prototype.emit = function (name) {
    if (!this.$events) {
      return false;
    }

    var handler = this.$events[name];

    if (!handler) {
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    if ('function' == typeof handler) {
      handler.apply(this, args);
    } else if (io.util.isArray(handler)) {
      var listeners = handler.slice();

      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }

    return true;
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Based on JSON2 (http://www.JSON.org/js.html).
 */

(function (exports, nativeJSON) {
  "use strict";

  // use native JSON if it's available
  if (nativeJSON && nativeJSON.parse){
    return exports.JSON = {
      parse: nativeJSON.parse
    , stringify: nativeJSON.stringify
    }
  }

  var JSON = exports.JSON = {};

  function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
  }

  function date(d, key) {
    return isFinite(d.valueOf()) ?
        d.getUTCFullYear()     + '-' +
        f(d.getUTCMonth() + 1) + '-' +
        f(d.getUTCDate())      + 'T' +
        f(d.getUTCHours())     + ':' +
        f(d.getUTCMinutes())   + ':' +
        f(d.getUTCSeconds())   + 'Z' : null;
  };

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

      if (value instanceof Date) {
          value = date(key);
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

// If the JSON object does not yet have a parse method, give it one.

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

})(
    'undefined' != typeof io ? io : module.exports
  , typeof JSON !== 'undefined' ? JSON : undefined
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Parser namespace.
   *
   * @namespace
   */

  var parser = exports.parser = {};

  /**
   * Packet types.
   */

  var packets = parser.packets = [
      'disconnect'
    , 'connect'
    , 'heartbeat'
    , 'message'
    , 'json'
    , 'event'
    , 'ack'
    , 'error'
    , 'noop'
  ];

  /**
   * Errors reasons.
   */

  var reasons = parser.reasons = [
      'transport not supported'
    , 'client not handshaken'
    , 'unauthorized'
  ];

  /**
   * Errors advice.
   */

  var advice = parser.advice = [
      'reconnect'
  ];

  /**
   * Shortcuts.
   */

  var JSON = io.JSON
    , indexOf = io.util.indexOf;

  /**
   * Encodes a packet.
   *
   * @api private
   */

  parser.encodePacket = function (packet) {
    var type = indexOf(packets, packet.type)
      , id = packet.id || ''
      , endpoint = packet.endpoint || ''
      , ack = packet.ack
      , data = null;

    switch (packet.type) {
      case 'error':
        var reason = packet.reason ? indexOf(reasons, packet.reason) : ''
          , adv = packet.advice ? indexOf(advice, packet.advice) : '';

        if (reason !== '' || adv !== '')
          data = reason + (adv !== '' ? ('+' + adv) : '');

        break;

      case 'message':
        if (packet.data !== '')
          data = packet.data;
        break;

      case 'event':
        var ev = { name: packet.name };

        if (packet.args && packet.args.length) {
          ev.args = packet.args;
        }

        data = JSON.stringify(ev);
        break;

      case 'json':
        data = JSON.stringify(packet.data);
        break;

      case 'connect':
        if (packet.qs)
          data = packet.qs;
        break;

      case 'ack':
        data = packet.ackId
          + (packet.args && packet.args.length
              ? '+' + JSON.stringify(packet.args) : '');
        break;
    }

    // construct packet with required fragments
    var encoded = [
        type
      , id + (ack == 'data' ? '+' : '')
      , endpoint
    ];

    // data fragment is optional
    if (data !== null && data !== undefined)
      encoded.push(data);

    return encoded.join(':');
  };

  /**
   * Encodes multiple messages (payload).
   *
   * @param {Array} messages
   * @api private
   */

  parser.encodePayload = function (packets) {
    var decoded = '';

    if (packets.length == 1)
      return packets[0];

    for (var i = 0, l = packets.length; i < l; i++) {
      var packet = packets[i];
      decoded += '\ufffd' + packet.length + '\ufffd' + packets[i];
    }

    return decoded;
  };

  /**
   * Decodes a packet
   *
   * @api private
   */

  var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;

  parser.decodePacket = function (data) {
    var pieces = data.match(regexp);

    if (!pieces) return {};

    var id = pieces[2] || ''
      , data = pieces[5] || ''
      , packet = {
            type: packets[pieces[1]]
          , endpoint: pieces[4] || ''
        };

    // whether we need to acknowledge the packet
    if (id) {
      packet.id = id;
      if (pieces[3])
        packet.ack = 'data';
      else
        packet.ack = true;
    }

    // handle different packet types
    switch (packet.type) {
      case 'error':
        var pieces = data.split('+');
        packet.reason = reasons[pieces[0]] || '';
        packet.advice = advice[pieces[1]] || '';
        break;

      case 'message':
        packet.data = data || '';
        break;

      case 'event':
        try {
          var opts = JSON.parse(data);
          packet.name = opts.name;
          packet.args = opts.args;
        } catch (e) { }

        packet.args = packet.args || [];
        break;

      case 'json':
        try {
          packet.data = JSON.parse(data);
        } catch (e) { }
        break;

      case 'connect':
        packet.qs = data || '';
        break;

      case 'ack':
        var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
        if (pieces) {
          packet.ackId = pieces[1];
          packet.args = [];

          if (pieces[3]) {
            try {
              packet.args = pieces[3] ? JSON.parse(pieces[3]) : [];
            } catch (e) { }
          }
        }
        break;

      case 'disconnect':
      case 'heartbeat':
        break;
    };

    return packet;
  };

  /**
   * Decodes data payload. Detects multiple messages
   *
   * @return {Array} messages
   * @api public
   */

  parser.decodePayload = function (data) {
    // IE doesn't like data[i] for unicode chars, charAt works fine
    if (data.charAt(0) == '\ufffd') {
      var ret = [];

      for (var i = 1, length = ''; i < data.length; i++) {
        if (data.charAt(i) == '\ufffd') {
          ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
          i += Number(length) + 1;
          length = '';
        } else {
          length += data.charAt(i);
        }
      }

      return ret;
    } else {
      return [parser.decodePacket(data)];
    }
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.Transport = Transport;

  /**
   * This is the transport template for all supported transport methods.
   *
   * @constructor
   * @api public
   */

  function Transport (socket, sessid) {
    this.socket = socket;
    this.sessid = sessid;
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Transport, io.EventEmitter);

  /**
   * Handles the response from the server. When a new response is received
   * it will automatically update the timeout, decode the message and
   * forwards the response to the onMessage function for further processing.
   *
   * @param {String} data Response from the server.
   * @api private
   */

  Transport.prototype.onData = function (data) {
    this.clearCloseTimeout();
    
    // If the connection in currently open (or in a reopening state) reset the close 
    // timeout since we have just received data. This check is necessary so
    // that we don't reset the timeout on an explicitly disconnected connection.
    if (this.connected || this.connecting || this.reconnecting) {
      this.setCloseTimeout();
    }

    if (data !== '') {
      // todo: we should only do decodePayload for xhr transports
      var msgs = io.parser.decodePayload(data);

      if (msgs && msgs.length) {
        for (var i = 0, l = msgs.length; i < l; i++) {
          this.onPacket(msgs[i]);
        }
      }
    }

    return this;
  };

  /**
   * Handles packets.
   *
   * @api private
   */

  Transport.prototype.onPacket = function (packet) {
    if (packet.type == 'heartbeat') {
      return this.onHeartbeat();
    }

    if (packet.type == 'connect' && packet.endpoint == '') {
      this.onConnect();
    }

    this.socket.onPacket(packet);

    return this;
  };

  /**
   * Sets close timeout
   *
   * @api private
   */
  
  Transport.prototype.setCloseTimeout = function () {
    if (!this.closeTimeout) {
      var self = this;

      this.closeTimeout = setTimeout(function () {
        self.onDisconnect();
      }, this.socket.closeTimeout);
    }
  };

  /**
   * Called when transport disconnects.
   *
   * @api private
   */

  Transport.prototype.onDisconnect = function () {
    if (this.close && this.open) this.close();
    this.clearTimeouts();
    this.socket.onDisconnect();
    return this;
  };

  /**
   * Called when transport connects
   *
   * @api private
   */

  Transport.prototype.onConnect = function () {
    this.socket.onConnect();
    return this;
  }

  /**
   * Clears close timeout
   *
   * @api private
   */

  Transport.prototype.clearCloseTimeout = function () {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  };

  /**
   * Clear timeouts
   *
   * @api private
   */

  Transport.prototype.clearTimeouts = function () {
    this.clearCloseTimeout();

    if (this.reopenTimeout) {
      clearTimeout(this.reopenTimeout);
    }
  };

  /**
   * Sends a packet
   *
   * @param {Object} packet object.
   * @api private
   */

  Transport.prototype.packet = function (packet) {
    this.send(io.parser.encodePacket(packet));
  };

  /**
   * Send the received heartbeat message back to server. So the server
   * knows we are still connected.
   *
   * @param {String} heartbeat Heartbeat response from the server.
   * @api private
   */

  Transport.prototype.onHeartbeat = function (heartbeat) {
    this.packet({ type: 'heartbeat' });
  };
 
  /**
   * Called when the transport opens.
   *
   * @api private
   */

  Transport.prototype.onOpen = function () {
    this.open = true;
    this.clearCloseTimeout();
    this.socket.onOpen();
  };

  /**
   * Notifies the base when the connection with the Socket.IO server
   * has been disconnected.
   *
   * @api private
   */

  Transport.prototype.onClose = function () {
    var self = this;

    /* FIXME: reopen delay causing a infinit loop
    this.reopenTimeout = setTimeout(function () {
      self.open();
    }, this.socket.options['reopen delay']);*/

    this.open = false;
    this.socket.onClose();
    this.onDisconnect();
  };

  /**
   * Generates a connection url based on the Socket.IO URL Protocol.
   * See <https://github.com/learnboost/socket.io-node/> for more details.
   *
   * @returns {String} Connection url
   * @api private
   */

  Transport.prototype.prepareUrl = function () {
    var options = this.socket.options;

    return this.scheme() + '://'
      + options.host + ':' + options.port + '/'
      + options.resource + '/' + io.protocol
      + '/' + this.name + '/' + this.sessid;
  };

  /**
   * Checks if the transport is ready to start a connection.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Transport.prototype.ready = function (socket, fn) {
    fn.call(this);
  };
})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: 'document' in global ? document : false
      , resource: 'socket.io'
      , transports: io.transports
      , 'connect timeout': 10000
      , 'try multiple transports': true
      , 'reconnect': true
      , 'reconnection delay': 500
      , 'reconnection limit': Infinity
      , 'reopen delay': 3000
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': true
      , 'auto connect': true
      , 'flash policy port': 10843
    };

    io.util.merge(this.options, options);

    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;

    if (this.options['sync disconnect on unload'] &&
        (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;

      io.util.on(global, 'beforeunload', function () {
        self.disconnectSync();
      }, false);
    }

    if (this.options['auto connect']) {
      this.connect();
    }
};

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Socket, io.EventEmitter);

  /**
   * Returns a namespace listener/emitter for this socket
   *
   * @api public
   */

  Socket.prototype.of = function (name) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);

      if (name !== '') {
        this.namespaces[name].packet({ type: 'connect' });
      }
    }

    return this.namespaces[name];
  };

  /**
   * Emits the given event to the Socket and all namespaces
   *
   * @api private
   */

  Socket.prototype.publish = function () {
    this.emit.apply(this, arguments);

    var nsp;

    for (var i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments);
      }
    }
  };

  /**
   * Performs the handshake
   *
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options;

    function complete (data) {
      if (data instanceof Error) {
        self.onError(data.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    var url = [
          'http' + (options.secure ? 's' : '') + ':/'
        , options.host + ':' + options.port
        , options.resource
        , io.protocol
        , io.util.query(this.options.query, 't=' + +new Date)
      ].join('/');

    if (this.isXDomain() && !io.util.ua.hasCORS) {
      var insertAt = document.getElementsByTagName('script')[0]
        , script = document.createElement('script');

      script.src = url + '&jsonp=' + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);

      io.j.push(function (data) {
        complete(data);
        script.parentNode.removeChild(script);
      });
    } else {
      var xhr = io.util.request();

      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          xhr.onreadystatechange = empty;

          if (xhr.status == 200) {
            complete(xhr.responseText);
          } else {
            !self.reconnecting && self.onError(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    }
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @api private
   */

  Socket.prototype.getTransport = function (override) {
    var transports = override || this.transports, match;

    for (var i = 0, transport; transport = transports[i]; i++) {
      if (io.Transport[transport]
        && io.Transport[transport].check(this)
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck())) {
        return new io.Transport[transport](this, this.sessionid);
      }
    }

    return null;
  };

  /**
   * Connects to the server.
   *
   * @param {Function} [fn] Callback.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.connect = function (fn) {
    if (this.connecting) {
      return this;
    }

    var self = this;

    this.handshake(function (sid, heartbeat, close, transports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      self.transports = io.util.intersect(
          transports.split(',')
        , self.options.transports
      );

      function connect (transports){
        if (self.transport) self.transport.clearTimeouts();

        self.transport = self.getTransport(transports);
        if (!self.transport) return self.publish('connect_failed');

        // once the transport is ready
        self.transport.ready(self, function () {
          self.connecting = true;
          self.publish('connecting', self.transport.name);
          self.transport.open();

          if (self.options['connect timeout']) {
            self.connectTimeoutTimer = setTimeout(function () {
              if (!self.connected) {
                self.connecting = false;

                if (self.options['try multiple transports']) {
                  if (!self.remainingTransports) {
                    self.remainingTransports = self.transports.slice(0);
                  }

                  var remaining = self.remainingTransports;

                  while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                         self.transport.name) {}

                    if (remaining.length){
                      connect(remaining);
                    } else {
                      self.publish('connect_failed');
                    }
                }
              }
            }, self.options['connect timeout']);
          }
        });
      }

      connect();

      self.once('connect', function (){
        clearTimeout(self.connectTimeoutTimer);

        fn && typeof fn == 'function' && fn();
      });
    });

    return this;
  };

  /**
   * Sends a message.
   *
   * @param {Object} data packet.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.packet = function (data) {
    if (this.connected && !this.doBuffer) {
      this.transport.packet(data);
    } else {
      this.buffer.push(data);
    }

    return this;
  };

  /**
   * Sets buffer state
   *
   * @api private
   */

  Socket.prototype.setBuffer = function (v) {
    this.doBuffer = v;

    if (!v && this.connected && this.buffer.length) {
      this.transport.payload(this.buffer);
      this.buffer = [];
    }
  };

  /**
   * Disconnect the established connect.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.disconnect = function () {
    if (this.connected) {
      if (this.open) {
        this.of('').packet({ type: 'disconnect' });
      }

      // handle disconnection immediately
      this.onDisconnect('booted');
    }

    return this;
  };

  /**
   * Disconnects the socket with a sync XHR.
   *
   * @api private
   */

  Socket.prototype.disconnectSync = function () {
    // ensure disconnection
    var xhr = io.util.request()
      , uri = this.resource + '/' + io.protocol + '/' + this.sessionid;

    xhr.open('GET', uri, true);

    // handle disconnection immediately
    this.onDisconnect('booted');
  };

  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */

  Socket.prototype.isXDomain = function () {

    var port = global.location.port ||
      ('https:' == global.location.protocol ? 443 : 80);

    return this.options.host !== global.location.hostname 
      || this.options.port != port;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    if (!this.connected) {
      this.connected = true;
      this.connecting = false;
      if (!this.doBuffer) {
        // make sure to flush the buffer
        this.setBuffer(false);
      }
      this.emit('connect');
    }
  };

  /**
   * Called when the transport opens
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @api private
   */

  Socket.prototype.onClose = function () {
    this.open = false;
  };

  /**
   * Called when the transport first opens a connection
   *
   * @param text
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && this.connected) {
        this.disconnect();
        this.reconnect();
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected) {
      this.transport.close();
      this.transport.clearTimeouts();
      this.publish('disconnect', reason);

      if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
        this.reconnect();
      }
    }
  };

  /**
   * Called upon reconnection.
   *
   * @api private
   */

  Socket.prototype.reconnect = function () {
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options['reconnection delay'];

    var self = this
      , maxAttempts = this.options['max reconnection attempts']
      , tryMultiple = this.options['try multiple transports']
      , limit = this.options['reconnection limit'];

    function reset () {
      if (self.connected) {
        for (var i in self.namespaces) {
          if (self.namespaces.hasOwnProperty(i) && '' !== i) {
              self.namespaces[i].packet({ type: 'connect' });
          }
        }
        self.publish('reconnect', self.transport.name, self.reconnectionAttempts);
      }

      self.removeListener('connect_failed', maybeReconnect);
      self.removeListener('connect', maybeReconnect);

      self.reconnecting = false;

      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;

      self.options['try multiple transports'] = tryMultiple;
    };

    function maybeReconnect () {
      if (!self.reconnecting) {
        return;
      }

      if (self.connected) {
        return reset();
      };

      if (self.connecting && self.reconnecting) {
        return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
      }

      if (self.reconnectionAttempts++ >= maxAttempts) {
        if (!self.redoTransports) {
          self.on('connect_failed', maybeReconnect);
          self.options['try multiple transports'] = true;
          self.transport = self.getTransport();
          self.redoTransports = true;
          self.connect();
        } else {
          self.publish('reconnect_failed');
          reset();
        }
      } else {
        if (self.reconnectionDelay < limit) {
          self.reconnectionDelay *= 2; // exponential back off
        }

        self.connect();
        self.publish('reconnecting', self.reconnectionDelay, self.reconnectionAttempts);
        self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
      }
    };

    this.options['try multiple transports'] = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);

    this.on('connect', maybeReconnect);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.SocketNamespace = SocketNamespace;

  /**
   * Socket namespace constructor.
   *
   * @constructor
   * @api public
   */

  function SocketNamespace (socket, name) {
    this.socket = socket;
    this.name = name || '';
    this.flags = {};
    this.json = new Flag(this, 'json');
    this.ackPackets = 0;
    this.acks = {};
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(SocketNamespace, io.EventEmitter);

  /**
   * Copies emit since we override it
   *
   * @api private
   */

  SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;

  /**
   * Creates a new namespace, by proxying the request to the socket. This
   * allows us to use the synax as we do on the server.
   *
   * @api public
   */

  SocketNamespace.prototype.of = function () {
    return this.socket.of.apply(this.socket, arguments);
  };

  /**
   * Sends a packet.
   *
   * @api private
   */

  SocketNamespace.prototype.packet = function (packet) {
    packet.endpoint = this.name;
    this.socket.packet(packet);
    this.flags = {};
    return this;
  };

  /**
   * Sends a message
   *
   * @api public
   */

  SocketNamespace.prototype.send = function (data, fn) {
    var packet = {
        type: this.flags.json ? 'json' : 'message'
      , data: data
    };

    if ('function' == typeof fn) {
      packet.id = ++this.ackPackets;
      packet.ack = true;
      this.acks[packet.id] = fn;
    }

    return this.packet(packet);
  };

  /**
   * Emits an event
   *
   * @api public
   */
  
  SocketNamespace.prototype.emit = function (name) {
    var args = Array.prototype.slice.call(arguments, 1)
      , lastArg = args[args.length - 1]
      , packet = {
            type: 'event'
          , name: name
        };

    if ('function' == typeof lastArg) {
      packet.id = ++this.ackPackets;
      packet.ack = 'data';
      this.acks[packet.id] = lastArg;
      args = args.slice(0, args.length - 1);
    }

    packet.args = args;

    return this.packet(packet);
  };

  /**
   * Disconnects the namespace
   *
   * @api private
   */

  SocketNamespace.prototype.disconnect = function () {
    if (this.name === '') {
      this.socket.disconnect();
    } else {
      this.packet({ type: 'disconnect' });
      this.$emit('disconnect');
    }

    return this;
  };

  /**
   * Handles a packet
   *
   * @api private
   */

  SocketNamespace.prototype.onPacket = function (packet) {
    var self = this;

    function ack () {
      self.packet({
          type: 'ack'
        , args: io.util.toArray(arguments)
        , ackId: packet.id
      });
    };

    switch (packet.type) {
      case 'connect':
        this.$emit('connect');
        break;

      case 'disconnect':
        if (this.name === '') {
          this.socket.onDisconnect(packet.reason || 'booted');
        } else {
          this.$emit('disconnect', packet.reason);
        }
        break;

      case 'message':
      case 'json':
        var params = ['message', packet.data];

        if (packet.ack == 'data') {
          params.push(ack);
        } else if (packet.ack) {
          this.packet({ type: 'ack', ackId: packet.id });
        }

        this.$emit.apply(this, params);
        break;

      case 'event':
        var params = [packet.name].concat(packet.args);

        if (packet.ack == 'data')
          params.push(ack);

        this.$emit.apply(this, params);
        break;

      case 'ack':
        if (this.acks[packet.ackId]) {
          this.acks[packet.ackId].apply(this, packet.args);
          delete this.acks[packet.ackId];
        }
        break;

      case 'error':
        if (packet.advice){
          this.socket.onError(packet);
        } else {
          if (packet.reason == 'unauthorized') {
            this.$emit('connect_failed', packet.reason);
          } else {
            this.$emit('error', packet.reason);
          }
        }
        break;
    }
  };

  /**
   * Flag interface.
   *
   * @api private
   */

  function Flag (nsp, name) {
    this.namespace = nsp;
    this.name = name;
  };

  /**
   * Send a message
   *
   * @api public
   */

  Flag.prototype.send = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.send.apply(this.namespace, arguments);
  };

  /**
   * Emit an event
   *
   * @api public
   */

  Flag.prototype.emit = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.emit.apply(this.namespace, arguments);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.websocket = WS;

  /**
   * The WebSocket transport uses the HTML5 WebSocket API to establish an
   * persistent connection with the Socket.IO server. This transport will also
   * be inherited by the FlashSocket fallback as it provides a API compatible
   * polyfill for the WebSockets.
   *
   * @constructor
   * @extends {io.Transport}
   * @api public
   */

  function WS (socket) {
    io.Transport.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(WS, io.Transport);

  /**
   * Transport name
   *
   * @api public
   */

  WS.prototype.name = 'websocket';

  /**
   * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.open = function () {
    var query = io.util.query(this.socket.options.query)
      , self = this
      , Socket


    if (!Socket) {
      Socket = global.MozWebSocket || global.WebSocket;
    }

    this.websocket = new Socket(this.prepareUrl() + query);

    this.websocket.onopen = function () {
      self.onOpen();
      self.socket.setBuffer(false);
    };
    this.websocket.onmessage = function (ev) {
      self.onData(ev.data);
    };
    this.websocket.onclose = function () {
      self.onClose();
      self.socket.setBuffer(true);
    };
    this.websocket.onerror = function (e) {
      self.onError(e);
    };

    return this;
  };

  /**
   * Send a message to the Socket.IO server. The message will automatically be
   * encoded in the correct message format.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.send = function (data) {
    this.websocket.send(data);
    return this;
  };

  /**
   * Payload
   *
   * @api private
   */

  WS.prototype.payload = function (arr) {
    for (var i = 0, l = arr.length; i < l; i++) {
      this.packet(arr[i]);
    }
    return this;
  };

  /**
   * Disconnect the established `WebSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.close = function () {
    this.websocket.close();
    return this;
  };

  /**
   * Handle the errors that `WebSocket` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  WS.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Returns the appropriate scheme for the URI generation.
   *
   * @api private
   */
  WS.prototype.scheme = function () {
    return this.socket.options.secure ? 'wss' : 'ws';
  };

  /**
   * Checks if the browser has support for native `WebSockets` and that
   * it's not the polyfill created for the FlashSocket transport.
   *
   * @return {Boolean}
   * @api public
   */

  WS.check = function () {
    return ('WebSocket' in global && !('__addTask' in WebSocket))
          || 'MozWebSocket' in global;
  };

  /**
   * Check if the `WebSocket` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */

  WS.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('websocket');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.flashsocket = Flashsocket;

  /**
   * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket
   * specification. It uses a .swf file to communicate with the server. If you want
   * to serve the .swf file from a other server than where the Socket.IO script is
   * coming from you need to use the insecure version of the .swf. More information
   * about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */

  function Flashsocket () {
    io.Transport.websocket.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(Flashsocket, io.Transport.websocket);

  /**
   * Transport name
   *
   * @api public
   */

  Flashsocket.prototype.name = 'flashsocket';

  /**
   * Disconnect the established `FlashSocket` connection. This is done by adding a 
   * new task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.open = function () {
    var self = this
      , args = arguments;

    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.open.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.send = function () {
    var self = this, args = arguments;
    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };

  /**
   * Disconnects the established `FlashSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.close = function () {
    WebSocket.__tasks.length = 0;
    io.Transport.websocket.prototype.close.call(this);
    return this;
  };

  /**
   * The WebSocket fall back needs to append the flash container to the body
   * element, so we need to make sure we have access to it. Or defer the call
   * until we are sure there is a body element.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Flashsocket.prototype.ready = function (socket, fn) {
    function init () {
      var options = socket.options
        , port = options['flash policy port']
        , path = [
              'http' + (options.secure ? 's' : '') + ':/'
            , options.host + ':' + options.port
            , options.resource
            , 'static/flashsocket'
            , 'WebSocketMain' + (socket.isXDomain() ? 'Insecure' : '') + '.swf'
          ];

      // Only start downloading the swf file when the checked that this browser
      // actually supports it
      if (!Flashsocket.loaded) {
        if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined') {
          // Set the correct file based on the XDomain settings
          WEB_SOCKET_SWF_LOCATION = path.join('/');
        }

        if (port !== 843) {
          WebSocket.loadFlashPolicyFile('xmlsocket://' + options.host + ':' + port);
        }

        WebSocket.__initialize();
        Flashsocket.loaded = true;
      }

      fn.call(self);
    }

    var self = this;
    if (document.body) return init();

    io.util.load(init);
  };

  /**
   * Check if the FlashSocket transport is supported as it requires that the Adobe
   * Flash Player plug-in version `10.0.0` or greater is installed. And also check if
   * the polyfill is correctly loaded.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.check = function () {
    if (
        typeof WebSocket == 'undefined'
      || !('__initialize' in WebSocket) || !swfobject
    ) return false;

    return swfobject.getFlashPlayerVersion().major >= 10;
  };

  /**
   * Check if the FlashSocket transport can be used as cross domain / cross origin 
   * transport. Because we can't see which type (secure or insecure) of .swf is used
   * we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.xdomainCheck = function () {
    return true;
  };

  /**
   * Disable AUTO_INITIALIZATION
   */

  if (typeof window != 'undefined') {
    WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
  }

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('flashsocket');
})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
if ('undefined' != typeof window) {
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O.ActiveXObject!=D){try{var ad=new ActiveXObject(W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?"ActiveX":"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
}
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

(function() {
  
  if ('undefined' == typeof window || window.WebSocket) return;

  var console = window.console;
  if (!console || !console.log || !console.error) {
    console = {log: function(){ }, error: function(){ }};
  }
  
  if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return;
  }
  if (location.protocol == "file:") {
    console.error(
      "WARNING: web-socket-js doesn't work in file:///... URL " +
      "unless you set Flash Security Settings properly. " +
      "Open the page via Web server i.e. http://...");
  }

  /**
   * This class represents a faux web socket.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler(event);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      // TODO implement jsEvent.wasClean
      jsEvent = this.__createSimpleEvent("close");
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function() {
    if (WebSocket.__flash) return;
    
    if (WebSocket.__swfLocation) {
      // For backword compatibility.
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
    }
    if (!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return;
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      WEB_SOCKET_SWF_LOCATION,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          console.error("[WebSocket] swfobject.embedSWF failed");
        }
      });
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };
  
  if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if (window.addEventListener) {
      window.addEventListener("load", function(){
        WebSocket.__initialize();
      }, false);
    } else {
      window.attachEvent("onload", function(){
        WebSocket.__initialize();
      });
    }
  }
  
})();

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   *
   * @api public
   */
  
  exports.XHR = XHR;

  /**
   * XHR constructor
   *
   * @costructor
   * @api public
   */

  function XHR (socket) {
    if (!socket) return;

    io.Transport.apply(this, arguments);
    this.sendBuffer = [];
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(XHR, io.Transport);

  /**
   * Establish a connection
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.open = function () {
    this.socket.setBuffer(false);
    this.onOpen();
    this.get();

    // we need to make sure the request succeeds since we have no indication
    // whether the request opened or not until it succeeded.
    this.setCloseTimeout();

    return this;
  };

  /**
   * Check if we need to send data to the Socket.IO server, if we have data in our
   * buffer we encode it and forward it to the `post` method.
   *
   * @api private
   */

  XHR.prototype.payload = function (payload) {
    var msgs = [];

    for (var i = 0, l = payload.length; i < l; i++) {
      msgs.push(io.parser.encodePacket(payload[i]));
    }

    this.send(io.parser.encodePayload(msgs));
  };

  /**
   * Send data to the Socket.IO server.
   *
   * @param data The message
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.send = function (data) {
    this.post(data);
    return this;
  };

  /**
   * Posts a encoded message to the Socket.IO server.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  function empty () { };

  XHR.prototype.post = function (data) {
    var self = this;
    this.socket.setBuffer(true);

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;
        self.posting = false;

        if (this.status == 200){
          self.socket.setBuffer(false);
        } else {
          self.onClose();
        }
      }
    }

    function onload () {
      this.onload = empty;
      self.socket.setBuffer(false);
    };

    this.sendXHR = this.request('POST');

    if (global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
      this.sendXHR.onload = this.sendXHR.onerror = onload;
    } else {
      this.sendXHR.onreadystatechange = stateChange;
    }

    this.sendXHR.send(data);
  };

  /**
   * Disconnects the established `XHR` connection.
   *
   * @returns {Transport} 
   * @api public
   */

  XHR.prototype.close = function () {
    this.onClose();
    return this;
  };

  /**
   * Generates a configured XHR request
   *
   * @param {String} url The url that needs to be requested.
   * @param {String} method The method the request should use.
   * @returns {XMLHttpRequest}
   * @api private
   */

  XHR.prototype.request = function (method) {
    var req = io.util.request(this.socket.isXDomain())
      , query = io.util.query(this.socket.options.query, 't=' + +new Date);

    req.open(method || 'GET', this.prepareUrl() + query, true);

    if (method == 'POST') {
      try {
        if (req.setRequestHeader) {
          req.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        } else {
          // XDomainRequest
          req.contentType = 'text/plain';
        }
      } catch (e) {}
    }

    return req;
  };

  /**
   * Returns the scheme to use for the transport URLs.
   *
   * @api private
   */

  XHR.prototype.scheme = function () {
    return this.socket.options.secure ? 'https' : 'http';
  };

  /**
   * Check if the XHR transports are supported
   *
   * @param {Boolean} xdomain Check if we support cross domain requests.
   * @returns {Boolean}
   * @api public
   */

  XHR.check = function (socket, xdomain) {
    try {
      if (io.util.request(xdomain)) {
        return true;
      }
    } catch(e) {}

    return false;
  };

  /**
   * Check if the XHR transport supports corss domain requests.
   * 
   * @returns {Boolean}
   * @api public
   */

  XHR.xdomainCheck = function () {
    return XHR.check(null, true);
  };

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.htmlfile = HTMLFile;

  /**
   * The HTMLFile transport creates a `forever iframe` based transport
   * for Internet Explorer. Regular forever iframe implementations will 
   * continuously trigger the browsers buzy indicators. If the forever iframe
   * is created inside a `htmlfile` these indicators will not be trigged.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */

  function HTMLFile (socket) {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(HTMLFile, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  HTMLFile.prototype.name = 'htmlfile';

  /**
   * Creates a new ActiveX `htmlfile` with a forever loading iframe
   * that can be used to listen to messages. Inside the generated
   * `htmlfile` a reference will be made to the HTMLFile transport.
   *
   * @api private
   */

  HTMLFile.prototype.get = function () {
    this.doc = new ActiveXObject('htmlfile');
    this.doc.open();
    this.doc.write('<html></html>');
    this.doc.close();
    this.doc.parentWindow.s = this;

    var iframeC = this.doc.createElement('div');
    iframeC.className = 'socketio';

    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement('iframe');

    iframeC.appendChild(this.iframe);

    var self = this
      , query = io.util.query(this.socket.options.query, 't='+ +new Date);

    this.iframe.src = this.prepareUrl() + query;

    io.util.on(window, 'unload', function () {
      self.destroy();
    });
  };

  /**
   * The Socket.IO server will write script tags inside the forever
   * iframe, this function will be used as callback for the incoming
   * information.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */

  HTMLFile.prototype._ = function (data, doc) {
    this.onData(data);
    try {
      var script = doc.getElementsByTagName('script')[0];
      script.parentNode.removeChild(script);
    } catch (e) { }
  };

  /**
   * Destroy the established connection, iframe and `htmlfile`.
   * And calls the `CollectGarbage` function of Internet Explorer
   * to release the memory.
   *
   * @api private
   */

  HTMLFile.prototype.destroy = function () {
    if (this.iframe){
      try {
        this.iframe.src = 'about:blank';
      } catch(e){}

      this.doc = null;
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;

      CollectGarbage();
    }
  };

  /**
   * Disconnects the established connection.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  HTMLFile.prototype.close = function () {
    this.destroy();
    return io.Transport.XHR.prototype.close.call(this);
  };

  /**
   * Checks if the browser supports this transport. The browser
   * must have an `ActiveXObject` implementation.
   *
   * @return {Boolean}
   * @api public
   */

  HTMLFile.check = function () {
    if ('ActiveXObject' in window){
      try {
        var a = new ActiveXObject('htmlfile');
        return a && io.Transport.XHR.check();
      } catch(e){}
    }
    return false;
  };

  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */

  HTMLFile.xdomainCheck = function () {
    // we can probably do handling for sub-domains, we should
    // test that it's cross domain but a subdomain here
    return false;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('htmlfile');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports['xhr-polling'] = XHRPolling;

  /**
   * The XHR-polling transport uses long polling XHR requests to create a
   * "persistent" connection with the server.
   *
   * @constructor
   * @api public
   */

  function XHRPolling () {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(XHRPolling, io.Transport.XHR);

  /**
   * Merge the properties from XHR transport
   */

  io.util.merge(XHRPolling, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  XHRPolling.prototype.name = 'xhr-polling';

  /** 
   * Establish a connection, for iPhone and Android this will be done once the page
   * is loaded.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  XHRPolling.prototype.open = function () {
    var self = this;

    io.Transport.XHR.prototype.open.call(self);
    return false;
  };

  /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */

  function empty () {};

  XHRPolling.prototype.get = function () {
    if (!this.open) return;

    var self = this;

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;

        if (this.status == 200) {
          self.onData(this.responseText);
          self.get();
        } else {
          self.onClose();
        }
      }
    };

    function onload () {
      this.onload = empty;
      self.onData(this.responseText);
      self.get();
    };

    this.xhr = this.request();

    if (global.XDomainRequest && this.xhr instanceof XDomainRequest) {
      this.xhr.onload = this.xhr.onerror = onload;
    } else {
      this.xhr.onreadystatechange = stateChange;
    }

    this.xhr.send(null);
  };

  /**
   * Handle the unclean close behavior.
   *
   * @api private
   */

  XHRPolling.prototype.onClose = function () {
    io.Transport.XHR.prototype.onClose.call(this);

    if (this.xhr) {
      this.xhr.onreadystatechange = this.xhr.onload = empty;
      try {
        this.xhr.abort();
      } catch(e){}
      this.xhr = null;
    }
  };

  /**
   * Webkit based browsers show a infinit spinner when you start a XHR request
   * before the browsers onload event is called so we need to defer opening of
   * the transport until the onload event is called. Wrapping the cb in our
   * defer method solve this.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  XHRPolling.prototype.ready = function (socket, fn) {
    var self = this;

    io.util.defer(function () {
      fn.call(self);
    });
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('xhr-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {
  /**
   * There is a way to hide the loading indicator in Firefox. If you create and
   * remove a iframe it will stop showing the current loading indicator.
   * Unfortunately we can't feature detect that and UA sniffing is evil.
   *
   * @api private
   */

  var indicator = global.document && "MozAppearance" in
    global.document.documentElement.style;

  /**
   * Expose constructor.
   */

  exports['jsonp-polling'] = JSONPPolling;

  /**
   * The JSONP transport creates an persistent connection by dynamically
   * inserting a script tag in the page. This script tag will receive the
   * information of the Socket.IO server. When new information is received
   * it creates a new script tag for the new data stream.
   *
   * @constructor
   * @extends {io.Transport.xhr-polling}
   * @api public
   */

  function JSONPPolling (socket) {
    io.Transport['xhr-polling'].apply(this, arguments);

    this.index = io.j.length;

    var self = this;

    io.j.push(function (msg) {
      self._(msg);
    });
  };

  /**
   * Inherits from XHR polling transport.
   */

  io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);

  /**
   * Transport name
   *
   * @api public
   */

  JSONPPolling.prototype.name = 'jsonp-polling';

  /**
   * Posts a encoded message to the Socket.IO server using an iframe.
   * The iframe is used because script tags can create POST based requests.
   * The iframe is positioned outside of the view so the user does not
   * notice it's existence.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  JSONPPolling.prototype.post = function (data) {
    var self = this
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (!this.form) {
      var form = document.createElement('form')
        , area = document.createElement('textarea')
        , id = this.iframeId = 'socketio_iframe_' + this.index
        , iframe;

      form.className = 'socketio';
      form.style.position = 'absolute';
      form.style.top = '-1000px';
      form.style.left = '-1000px';
      form.target = id;
      form.method = 'POST';
      form.setAttribute('accept-charset', 'utf-8');
      area.name = 'd';
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.prepareUrl() + query;

    function complete () {
      initIframe();
      self.socket.setBuffer(false);
    };

    function initIframe () {
      if (self.iframe) {
        self.form.removeChild(self.iframe);
      }

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
      } catch (e) {
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
      }

      iframe.id = self.iframeId;

      self.form.appendChild(iframe);
      self.iframe = iframe;
    };

    initIframe();

    // we temporarily stringify until we figure out how to prevent
    // browsers from turning `\n` into `\r\n` in form inputs
    this.area.value = io.JSON.stringify(data);

    try {
      this.form.submit();
    } catch(e) {}

    if (this.iframe.attachEvent) {
      iframe.onreadystatechange = function () {
        if (self.iframe.readyState == 'complete') {
          complete();
        }
      };
    } else {
      this.iframe.onload = complete;
    }

    this.socket.setBuffer(true);
  };
  
  /**
   * Creates a new JSONP poll that can be used to listen
   * for messages from the Socket.IO server.
   *
   * @api private
   */

  JSONPPolling.prototype.get = function () {
    var self = this
      , script = document.createElement('script')
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.prepareUrl() + query;
    script.onerror = function () {
      self.onClose();
    };

    var insertAt = document.getElementsByTagName('script')[0]
    insertAt.parentNode.insertBefore(script, insertAt);
    this.script = script;

    if (indicator) {
      setTimeout(function () {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  /**
   * Callback function for the incoming message stream from the Socket.IO server.
   *
   * @param {String} data The message
   * @api private
   */

  JSONPPolling.prototype._ = function (msg) {
    this.onData(msg);
    if (this.open) {
      this.get();
    }
    return this;
  };

  /**
   * The indicator hack only works after onload
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  JSONPPolling.prototype.ready = function (socket, fn) {
    var self = this;
    if (!indicator) return fn.call(this);

    io.util.load(function () {
      fn.call(self);
    });
  };

  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */

  JSONPPolling.check = function () {
    return 'document' in global;
  };

  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */

  JSONPPolling.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('jsonp-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

});

require.define("/node_modules/cm1-route/lib/segment/hop-stop-segment.js", function (require, module, exports, __dirname, __filename) {
    var Segment = require('../segment');

var HopStopSegment = module.exports = function() {};
HopStopSegment.prototype = new Segment();

HopStopSegment.prototype.durationInMinutes = function() {
  if(this.duration)
    return this.duration / 60;
};

});

require.define("/node_modules/cm1-route/lib/segment.js", function (require, module, exports, __dirname, __filename) {
    var Segment = module.exports = function() {};

});

require.define("/node_modules/cm1-route/lib/segment/bicycling-segment.js", function (require, module, exports, __dirname, __filename) {
    var CM1 = require('CM1'),
    Segment = require('../segment');

var BicyclingSegment = module.exports = function(index, step) {
  this.index = index;
  this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
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
    HopStopSegment = require('./hop-stop-segment');

var BussingSegment = module.exports = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.bus_class = 'city transit';
  this.mode = 'BUSSING';
}
BussingSegment.prototype = new HopStopSegment();

CM1.extend(BussingSegment, {
  model: 'bus_trip',
  provides: ['distance', 'bus_class', { 'duration': 'durationInMinutes' }]
});

});

require.define("/node_modules/cm1-route/lib/segment/commuter-railing-segment.js", function (require, module, exports, __dirname, __filename) {
    var CM1 = require('CM1'),
    HopStopSegment = require('./hop-stop-segment');

var CommuterRailingSegment = module.exports = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.rail_class = 'commuter rail';
}
CommuterRailingSegment.prototype = new HopStopSegment();

CM1.extend(CommuterRailingSegment, {
  model: 'rail_trip',
  provides: ['duration', 'rail_class', { 'distance_estimate': 'distance' }]
});

});

require.define("/node_modules/cm1-route/lib/segment/driving-segment.js", function (require, module, exports, __dirname, __filename) {
    var CM1 = require('CM1'),
    Segment = require('../segment');

var DrivingSegment = module.exports = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.mode = 'DRIVING';
}
DrivingSegment.prototype = new Segment();

CM1.extend(DrivingSegment, {
  model: 'automobile_trip',
  provides: ['distance']
});

});

require.define("/node_modules/cm1-route/lib/segment/flying-segment.js", function (require, module, exports, __dirname, __filename) {
    var CM1 = require('CM1'),
    Segment = require('../segment');

var FlyingSegment = module.exports = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  this.instructions = step.instructions;
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
    HopStopSegment = require('./hop-stop-segment');

var LightRailingSegment = module.exports = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.rail_class = 'light rail';
}
LightRailingSegment.prototype = new HopStopSegment();

CM1.extend(LightRailingSegment, {
  model: 'rail_trip',
  provides: ['duration', 'rail_class', { 'distance_estimate': 'distance' }]
});

});

require.define("/node_modules/cm1-route/lib/segment/subwaying-segment.js", function (require, module, exports, __dirname, __filename) {
    var CM1 = require('CM1'),
    HopStopSegment = require('./hop-stop-segment');

var SubwayingSegment = module.exports = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
  this.rail_class = 'heavy rail';
  this.mode = 'SUBWAYING';
}
SubwayingSegment.prototype = new HopStopSegment();

CM1.extend(SubwayingSegment, {
  model: 'rail_trip',
  provides: ['duration', 'rail_class', { 'distance_estimate': 'distance' }]
});

});

require.define("/node_modules/cm1-route/lib/segment/walking-segment.js", function (require, module, exports, __dirname, __filename) {
    var CM1 = require('CM1'),
    Segment = require('../segment');

var WalkingSegment = module.exports = function(index, step) {
  this.index = index;
  if(step.distance)
    this.distance = parseFloat(step.distance.value) / 1000.0;
  if(step.duration)
    this.duration = step.duration.value;
  this.instructions = step.instructions;
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
    var GoogleDirectionsRoute = module.exports = function(hopstopData) {
  this.hopstopData = hopstopData;
  this.copyrights = 'Copyright HopStop.com, Inc.';
  this.overview_path = GoogleDirectionsRoute.generateOverviewPath(hopstopData.steps);
  this.legs = [{
    duration: { value: this.hopstopData.duration },
    start_address: '',
    start_location: this.overview_path[0],
    end_address: '',
    end_location: this.overview_path[this.overview_path.length - 1],
    steps: GoogleDirectionsRoute.generateSteps(this.hopstopData.steps),
    via_waypoints: []
  }];
  this.warnings = [];
  this.bounds = GoogleDirectionsRoute.generateBounds(this.hopstopData.steps);
};

GoogleDirectionsRoute.generateOverviewPath = function(steps) {
  var path = [];
  for(i in steps) {
    var step = steps[i];
    if(step.start_location) {
      var startLatLng = new google.maps.LatLng(
        step.start_location.lat, step.start_location.lon );
      path.push(startLatLng);
      var endLatLng = new google.maps.LatLng(
          step.end_location.lat, step.end_location.lon);
      path.push(endLatLng);
    }
  }

  return path;
};

GoogleDirectionsRoute.generateBounds = function(steps) {
  var coords = {};

  for(i in steps) {
    var step = steps[i];
    coords = GoogleDirectionsRoute.recordCoords(step.start_location, coords);
    coords = GoogleDirectionsRoute.recordCoords(step.end_location, coords);
  }

  if(coords.sWLat != null && coords.sWLng != null && 
     coords.nELat != null && coords.nELng != null) {
    var southWest = new google.maps.LatLng(coords.sWLat, coords.sWLng);
    var northEast = new google.maps.LatLng(coords.nELat, coords.nELng);
    return new google.maps.LatLngBounds(southWest, northEast);
  } else {
    return null;
  }
};

GoogleDirectionsRoute.recordCoords = function(location, coords) {
  if(location) {
    var lat = location.lat;
    var lng = location.lon;
    coords.sWLat = (coords.sWLat == null ? lat : Math.min(coords.sWLat, lat));
    coords.sWLng = (coords.sWLng == null ? lng : Math.min(coords.sWLng, lng));
    coords.nELat = (coords.nELat == null ? lat : Math.max(coords.nELat, lat));
    coords.nELng = (coords.nELng == null ? lng : Math.max(coords.nELng, lng));
  }

  return coords;
};

GoogleDirectionsRoute.generateSteps = function(steps) {
  var googleSteps = [];

  for(i in steps) {
    var step = steps[i];
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
  }

  return googleSteps;
};

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
  this.geocodeOrigin = Directions.events.geocode(this, 'origin', 'originLatLng');
  this.geocodeDestination = Directions.events.geocode(this, 'destination', 'destinationLatLng');
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

require.define("/node_modules/cm1-route/lib/directions/hop-stop-directions.js", function (require, module, exports, __dirname, __filename) {
    var Directions = require('../directions'),
    DirectionsEvents = require('../directions-events'),
    DirectBusDirections = require('./direct-bus-directions'),
    DirectRailDirections = require('./direct-rail-directions'),
    GoogleDirectionsRoute = require('./google-directions-route'),
    HootrootApi = require('../hootroot-api'),
    WalkingSegment = require('../segment/walking-segment');
var async = require('async'),
    http = require('http');

var HopStopDirections = module.exports = function(origin, destination, mode, when) {
  this.origin = origin;
  this.destination = destination;
  this.mode = mode || 'PUBLICTRANSIT';
  this.when = when || 'now';
  this.geocoder = new google.maps.Geocoder();
  this.geocodeOrigin = Directions.events.geocode(this, 'origin', 'originLatLng');
  this.geocodeDestination = Directions.events.geocode(this, 'destination', 'destinationLatLng');
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
  var walkingError = (err && err.name == 'AllWalkingSegmentsError');
  return (walkingError && process.env.TRANSIT_DIRECT_DEFAULT.toString() == 'true');
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
    if(err) {
      callback(err, directions);
    } else {
      async.series({ hopstop: HopStopDirections.events.fetchHopStop(directions) },
        HopStopDirections.events.processHopStop(directions, callback));
    }
  });
};

HopStopDirections.prototype.isAllWalkingSegments = function() {
  var result = true;
  this.eachSegment(function(segment) {
    result = result && segment instanceof WalkingSegment;
  });
  return result;
};

HopStopDirections.prototype.calculateDistance = function() {
  this.distanceInMeters = google.maps.geometry.spherical.
    computeDistanceBetween(this.originLatLng, this.destinationLatLng);
  this.distance = this.distanceInMeters / 1000;
};


// Events

HopStopDirections.events.fetchHopStop = function(directions) {
  return function(callback) {
    var params = {
      x1: directions.originLatLng.lng(), 
      y1: directions.originLatLng.lat(), 
      x2: directions.destinationLatLng.lng(), 
      y2: directions.destinationLatLng.lat(), 
      mode: directions.mode,
      when: directions.when
    };

    HootrootApi.hopstop(params, callback);
  };
};

HopStopDirections.events.processHopStop = function(directions, callback) {
  return function(err, results) {
    if(err) return callback(err, directions);

    var directionsResult = { routes: [new GoogleDirectionsRoute(results.hopstop)] };
    directions.storeRoute(directionsResult);

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
  this.geocodeOrigin = Directions.events.geocode(this, 'origin', 'originLatLng');
  this.geocodeDestination = Directions.events.geocode(this, 'destination', 'destinationLatLng');
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
      end_location: directions.destinationLatLng,
    }];

    var directionsResult = { routes: [{
      legs: [{
        duration: { value: directions.duration() },
        distance: { value: directions.distanceInMeters },
        steps: steps
      }],
      warnings: [],
      bounds: GoogleDirectionsRoute.generateBounds(steps)
    }]};
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
  this.geocodeOrigin = Directions.events.geocode(this, 'origin', 'originLatLng');
  this.geocodeDestination = Directions.events.geocode(this, 'destination', 'destinationLatLng');
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
      end_location: directions.destinationLatLng,
    }];

    var directionsResult = { routes: [{
      legs: [{
        duration: { value: directions.duration() },
        distance: { value: directions.distanceInMeters },
        steps: steps
      }],
      warnings: [],
      bounds: GoogleDirectionsRoute.generateBounds(steps)
    }]};
    directions.storeRoute(directionsResult);

    callback(null, directions);
  };
};

module.exports = DirectRailDirections;

});

require.define("/node_modules/cm1-route/lib/hootroot-api.js", function (require, module, exports, __dirname, __filename) {
    var http = require('http');

var HootrootApi = module.exports = {
  hopstop: function(params, callback) {
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

    //var $ = require('jquery');

    //$.ajax({
      //url: '/hopstops',
      //data: request,
      //success: function(data) {
        //callback(null, data);
      //},
      //error: callback
    //});
  }
};

});

require.define("/models/flight-path.js", function (require, module, exports, __dirname, __filename) {
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
    this._polyLine = new google.maps.Polyline({
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
    this._markers.push(new google.maps.Marker({ position: this.originLatLng(), icon: 'http://maps.gstatic.com/intl/en_us/mapfiles/marker_greenA.png' }));
    this._markers.push(new google.maps.Marker({ position: this.destinationLatLng(), icon: 'http://maps.gstatic.com/intl/en_us/mapfiles/marker_greenB.png' }));
  }

  return this._markers;
};

FlightPath.prototype.display = function() {
  this.polyLine().setMap(this.controller.mapView.googleMap());
  for(var i in this.markers()) {
    this.markers()[i].setMap(this.controller.mapView.googleMap());
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
    var $ = require('jquery');

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
  $('#about').toggle(); //'slide', { direction: 'up' }, 500);
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


});

require.define("/views/map-view.js", function (require, module, exports, __dirname, __filename) {
    var $ = require('jquery');

var MapView = module.exports = function(mapId) {
  this.mapId = mapId;
  var ll = new google.maps.LatLng(39.57, -97.82);
  this.options = {
    zoom: 4,
    center: ll,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  this.canvas = $(this.mapId);

  return true;
}

MapView.prototype.googleMap = function () {
  if(this.google_map == null) {
    this.google_map = new google.maps.Map(this.canvas.get(0), this.options);
  }
  return this.google_map;
}

MapView.prototype.resize = function() {
  this.canvas.width('100%');
  this.canvas.height('100%');
}

});

require.define("/views/route-view.js", function (require, module, exports, __dirname, __filename) {
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
    // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9]+:)/i,
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
    if (delims.indexOf(rest.charAt(i)) === -1) break;
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
    var atSign = rest.indexOf('@');
    if (atSign !== -1) {
      // there *may be* an auth
      var hasAuth = true;
      for (var i = 0, l = nonAuthChars.length; i < l; i++) {
        var index = rest.indexOf(nonAuthChars[i]);
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
      var index = rest.indexOf(nonHostChars[i]);
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
    if (out.auth) out.host = out.auth + '@' + out.host;
    var keys = Object.keys(p);
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

    out.host = ((out.auth) ? out.auth + '@' : '') +
        (out.hostname || '') +
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
      var c = rest.indexOf(delims[i]);
      if (c !== -1) {
        chop = Math.min(c, chop);
      }
    }
    rest = rest.substr(0, chop);
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    out.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
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

  var auth = obj.auth;
  if (auth) {
    auth = auth.split('@').join('%40');
    for (var i = 0, l = nonAuthChars.length; i < l; i++) {
      var nAC = nonAuthChars[i];
      auth = auth.split(nAC).join(encodeURIComponent(nAC));
    }
  }

  var protocol = obj.protocol || '',
      host = (obj.host !== undefined) ? obj.host :
          obj.hostname !== undefined ? (
              (auth ? auth + '@' : '') +
              obj.hostname +
              (obj.port ? ':' + obj.port : '')
          ) :
          false,
      pathname = obj.pathname || '',
      query = obj.query &&
              ((typeof obj.query === 'object' &&
                Object.keys(obj.query).length) ?
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

  if (relative.href === '') return source;

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    relative.protocol = source.protocol;
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

    if (!slashedProtocol[relative.protocol]) return relative;

    source.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      relative.pathname = relPath.join('/');
    }
    source.pathname = relative.pathname;
    source.search = relative.search;
    source.query = relative.query;
    source.host = relative.host || '';
    delete source.auth;
    delete source.hostname;
    source.port = relative.port;
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
          !slashedProtocol[source.protocol] &&
          source.host !== undefined;

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // source.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {

    delete source.hostname;
    delete source.auth;
    delete source.port;
    if (source.host) {
      if (srcPath[0] === '') srcPath[0] = source.host;
      else srcPath.unshift(source.host);
    }
    delete source.host;

    if (relative.protocol) {
      delete relative.hostname;
      delete relative.auth;
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
      source.host = srcPath.shift();
    }
    source.search = relative.search;
    source.query = relative.query;
    return source;
  }
  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    delete source.pathname;
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
    source.host = isAbsolute ? '' : srcPath.shift();
  }

  mustEndAbs = mustEndAbs || (source.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  source.pathname = srcPath.join('/');


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

require.define("/node_modules/querystring/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"querystring","id":"querystring","version":"0.0.4","description":"Node's querystring module for all engines.","keywords":["commonjs","query","querystring"],"author":"Irakli Gozalishvili <rfobic@gmail.com>","repository":{"type":"git","url":"git://github.com/Gozala/querystring.git","web":"https://github.com/Gozala/querystring"},"bugs":{"web":"http://github.com/Gozala/querystring/issues/"},"directories":{"doc":"./docs","lib":"./lib","test":"./test"},"devDependencies":{"test":">=0.4.0"},"main":"./lib/querystring.js","engines":{"node":"0.4.x","teleport":">=0.2.0"},"scripts":{"test":"node tests/test-querystring.js"}}
});

require.define("querystring", function (require, module, exports, __dirname, __filename) {
    var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.toString.call(xs) === '[object Array]'
    }
;

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
                obj[Object.keys(obj).length] = val;
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
    , keys = Object.keys(obj)
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

require.define("/node_modules/jquery-placeholdize/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"name":"jquery-placeholdize","version":"0.3.0","author":"Romain Ruetschi <romain.ruetschi@gmail.com>","description":"simulates the HTML5 'placeholder' attribute for legacy browsers","main":"./jquery.placeholdize.js","engine":"*","devDependencies":{"browserify":"*"},"browserify":{"main":"./browserify.js"},"keywords":["jquery","html5","plugin","browser"],"repository":{"type":"git","url":"http://github.com/romac/jQuery.placeHoldize.git"},"license":"MIT"}
});

require.define("/node_modules/jquery-placeholdize/browserify.js", function (require, module, exports, __dirname, __filename) {
    /*
 * Copyright (c) 2011 Romain Ruetschi <romain.ruetschi@gmail.com>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
    
module.exports = function($) {
  function supportsPlaceholder( element )
  {
      return element.placeholder === '' && element.placeholder !== undefined;
  }
  
  // Feature test for placeholder support as found in Modernizr
  // as well as in http://miketaylr.com/code/input-type-attr.html
  // via Mike Taylor's work
  var placeHolderSupport = {
    input    : supportsPlaceholder( document.createElement( 'input' ) ),
    textarea : supportsPlaceholder( document.createElement( 'textarea' ) )
  };
  
  $.fn.placeHoldize = ( function()
  {
    function _placeHoldize( force )
    {
        // Store a reference to the current jQuery element.
        var $this = $( this ),
            type  = this.nodeName.toLowerCase();
        
        if( !force && ( placeHolderSupport[ type ] || !$this.attr( 'placeholder' ) ) )
        {
            // There is no need for this plugin.
            return;
        }
            
        // Store the "placeholder"'s value.
        var placeHolder = $this.attr( 'placeholder' );
        
        // Only replace the "value" attribute's value if it's empty.
        // Thanks to kiddailey for the patch.
        if( $this.val().length <= 0 || $this.val() == placeHolder )
        {
            // To prevent flickering as classes are manipulated.
            // Thanks to kiddailey for the patch.
            $this.val( '' );
            
            // Remove the "placeholder" as it is no longer used
            // and add a "placeholdized" class to be able to reference
            // these elements later.
            $this.removeAttr( 'placeholder' ).addClass( 'placeholder-visible' );
                 
            // Copy the "placeholder" attribute's value to the "value" attribute.
            $this.val( placeHolder );
        }
        else
        {
            $this.removeClass( 'placeholder-visible' )
                 .addClass( 'placeholder-hidden' );
        }
        
        $this.addClass( 'placeholdized' );
        
        // On focus
        $this.focus( function()
        {
            // If the element's value is equal to the previously setted
            // placeholder's value:
            if( $this.val() === placeHolder )
            {
                // Empty the value.
                $this.val( '' );
                
                // Swap some classes to be able to style the element.
                $this.removeClass( 'placeholder-visible' )
                     .addClass( 'placeholder-hidden' );
            }
        } );
        
        // On focus
        $this.blur( function()
        {
            // If the element's value is empty:
            if( $this.val() === '' )
            {
                // Restore the placeholder's value.
                $this.val( placeHolder );
                
                // Swap some classes to be able to style the element.
                $this.removeClass( 'placeholder-hidden' )
                     .addClass( 'placeholder-visible' );
            }
            else
            {
                // Swap some classes to be able to style the element.
                $this.removeClass( 'placeholder-visible' )
                     .addClass( 'placeholder-hidden' );
            }
        } );
    }
    
    function _emptyFormOnSubmit( $elements )
    {
        var $forms = $elements.closest( 'form' );
            
        $forms.submit( function()
        {
            var $this = $( this );
            
            // This check avoid processing more than once the same form.
            if( $this.data( 'placeHoldize.submitHandlerCalled' ) )
            {
                return;
            }
            
            $this.find( '.placeholder-visible' )
                 .val( '' )
                 .data( 'placeHoldize.submitHandlerCalled', true );
        } );
        
        return true;
    }
    
    return function( force )
    {
        // Apply the _placeHoldize function on every element.
        this.each( function()
        {
            _placeHoldize.call( this, force );
        } );
        
        // Empty the "value" attribute before the form is submitted to fully mimics the
        // HTML5 "placeholder" attribute behavior.
        _emptyFormOnSubmit( this );
        
        return this;
    };
  } )();
};

});

require.alias("jquery-browserify", "/node_modules/jquery");

require.alias("dkastner-http-browserify", "/node_modules/http");

(function () {
    var module = { exports : {} };
    var exports = module.exports;
    var __dirname = "/";
    var __filename = "//Users/dkastner/hootroot/app/assets/javascripts";
    
    var require = function (file) {
        return __require(file, "/");
    };
    require.modules = __require.modules;
    
    var $ = require('jquery'),
    IndexController = require('./controllers/index-controller');

require('jquery-placeholdize')($);

$(document).ready( function() {
  $(document).ready(function() {
    mc = new IndexController('#map_canvas');
    mc.init();
    $( 'input[placeholder], textarea[placeholder]' ).placeHoldize();
  });
});
;
})();
