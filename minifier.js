var coffee = require('coffee-script');
var request = require('request');
var uglify = require('uglify-js');
var events = require('events');
var sqwish = require('sqwish');
var utils = require('utils');
var path = require('path');
var less = require('less');
var fs = require('fs');

/**
 * Normalize the options provided by the user immediately, to avoid constant
 * checking within the application.
 */
function normalize(options, additional) {
  var defaults = {
    compress: true
  };

  // filesIn should be an array, or fileIn should be a string.
  // loosen the interface to accept filesIn as a string.
  if (typeof options.fileIn === "string") {
    options.filesIn = [options.fileIn];
  } else if (!(options.filesIn instanceof Array)) {
    options.filesIn = [options.filesIn];
  }

  [defaults, additional].forEach(function (defaults) {
    if (typeof defaults === "object" && defaults !== null) {
      Object.keys(defaults).forEach(function (key) {
        if (!options.hasOwnProperty(key)) {
          options[key] = defaults[key];
        }
      })
    }
  });

  return options;
}

/**
 * Use case: We have an array of filenames, and "filters" (which are either our
 * readers or our filters; each of which has a "match" (a RegExp) and a handler
 * which is called when the match, is a match).
 *
 * By passing the files and filter as the first two parameters, this function
 * asynchronously loops though each file sequentially, and for each finds a
 * matching filter. It then calls "each(array[i], i, next())" on the matching
 * element. The final parameter to each is the function to call when each() has
 * finished processing. callback() is called by our function when it reaches the
 * end of array. It passes no parameters
 *
 * @param array Array of strings to match each filter's "match" to.
 * @param filters Array of filters; each element must be an object with a "match"
 *        property, which is a RegExp.
 * @param each Called when a filter is matched for i. Callback is passed the
 *        matched string, i, and a callback to call when it has finished processing
 * @param callback Called when all array elements have been handled. Passed no
 *        parameters.
 * @return undefined
 */
function filter(array, filters, each, callback) {
  var slice = [].slice;

  (function next(i) {
    if (i < array.length) {
      var curr = array[i];

      for (var j=0;j<filters.length;j++) {
        if (filters[j].match.test(curr)) {
          each(filters[j], i, function () {
            next(++i);
          });

          break;
        }
      }
    } else {
      callback();
    }
  }(0));
}

/**
 * @param destination Where to write "code" to
 * @param code The code to write to "destination"
 * @param error Function called if an error occurs. First arg passed will be err string
 * @param complete Function called when write was successful. code and destination
 *        are passed (in that order).
 * @return undefined
 */
function save(destination, code, error, complete) {
  if (destination) {
    fs.writeFile(destination, code, 'utf8', function (err) {
      if (err) {
        error(err);
      } else {
        complete(code, destination);
      }
    });
  } else {
    complete(code);
  }
}

function Minifier() {
  this._readers = [];
  this._filters = [];

  // Default Reader which reads the file from disk
  this.addReader('.', function (file, options, callback) {
    if (options.srcPath) {
      file = path.join(options.srcPath, file);
    }

    fs.readFile(file, 'utf8', function (err, data) {
      if (err) {
        callback(err);
      } else {
        callback(null, data);
      }
    });
  });

  // Handle HTTP(s) URLS
  this.addReader('^https?://', function (url, options, callback) {
    request(url, function (err, res, body) {
      if (err) {
        callback(err);
      } else if (res.statusCode !== 200) {
        callback(new Error('HTTP status code was ' + res.statusCode));
      } else {
        callback(null, body)
      }
    });
  });

  // Default filter which returns the file unchanged
  this.addFilter('.', function (filename, contents, options, callback) {
    callback(null, contents);
  });

  // Compiles LESS files into CSS
  this.addFilter('\\.less$', function (filename, contents, options, callback) {
    less.render(contents, function (err, css) {
      callback(err, css);
    });
  });

  // Compiles CoffeeScript into JavaScript.
  this.addFilter('\\.coffee$', function (filename, contents, options, callback) {
    callback(null, coffee.compile(contents));
  });
};

// Generates "addReader", "addFilter", "removeFilter" and "removeFilter"
// addReader expects the RegExp to match the filename against, and then the handler
// to call. The handler will be given the filename, 2nd parameter for filters is
// the contents, but for the reader, this is omitted. The next parameter is any
// options provided by the user and then the callback to call. First param of
// callback must be any errors (or null) and the second parameter should be
// either the file read in, or the filtered file depending on whether you used
// addReader or addFilter.
["Reader", "Filter"].forEach(function (key) {
  Minifier.prototype['add' + key] = function (match, handler) {
    this['_' + key.toLowerCase() + 's'].unshift({
      match: (match instanceof RegExp ? match : new RegExp(match)),
      handler: handler
    });
  };

  Minifier.prototype['remove' + key] = function (match, handler) {
    var arr = this['_' + key.toLowerCase() + 's'];

    for (var i=0;i<arr.length;i++) {
      if (arr.match.toString() === match) {
        arr.splice(i, 1);
        return true;
      }
    }

    return false;
  };
});

Minifier.prototype.css = function (options) {
  var emitter = new events.EventEmitter;
  var contents = [];

  function complete(a, b) {
    emitter.emit('complete', a, b);
  }

  function error(reason) {
    emitter.emit('error', reason);
  }

  normalize(options, {
    strict: false
  });

  this._combineAndFilter(options.filesIn, options, function (err, contents) {
    if (err) {
      error(err.toString());
    } else {
      // Either minify the bundle, or leave the bundle untouched if compress
      // was set to false.
      var output = options.compress ? sqwish.minify(contents, options.strict) : contents;

      // save() takes care of whether to write to disk, and fires the complete
      // event.
      save(options.destination, output, error, complete);
    }
  });

  return emitter;
};

Minifier.prototype.js = function (options) {
  var emitter = new events.EventEmitter;
  var contents = [];

  function complete(a, b) {
    emitter.emit('complete', a, b);
  }

  function error(reason) {
    emitter.emit('error', reason);
  }

  utils.extend(normalize(options, {
    mangle: true
  }), {
    fromString: true
  });

  this._combineAndFilter(options.filesIn, options, function (err, contents) {
    if (err) {
      error(err.toString());
    } else {
      // We don't want to pass all options to uglifyjs as I don't want to assume
      // its behaviour wont change with a random parameter. "extract" provides a
      // "view" of only the properties we ask for.
      var output = options.compress ? uglify.minify(contents, utils.extract(options, [
        'fromString',
        'mangle'
      ])).code : contents;

      // save() takes care of whether to write to disk, and fires the complete
      // event.
      save(options.destination, output, error, complete);
    }
  });

  return emitter;
};

Minifier.prototype._combineAndFilter = function (files, options, callback) {
  var contents = [];
  var that = this;

  filter(files, this._readers, function (filter, i, next) {
    filter.handler(files[i], options, function (err, data) {

      if (err) {
        callback(err);
      } else {
        contents.push(data);
        next();
      }
    });
  }, function () {
    filter(files, that._filters, function (filter, i, next) {
      filter.handler(files[i], contents[i], options, function (err, data) {
        if (err) {
          callback(err);
        } else {
          contents[i] = data;
          next();
        }
      })
    }, function () {
      callback(null, contents.join("\n"));
    });
  });
};

module.exports.create = function () {
  return new Minifier();
};