var coffee = require('coffee-script');
var uglify = require('uglify-js');
var events = require('events');
var sqwish = require('sqwish');
var utils = require('utils');
var path = require('path');
var less = require('less');
var fs = require('fs');

/**
 * Combines array of file paths into one file.
 *
 * @param files The array of filepaths to combine
 * @param prefix Optional. A path to prefix to all filepaths
 * @param map (path, data, next (err, data)). Optional. A filter function which 
 *        can map the contents of a file to something else
 * @param callback (err, data).
 */
function combine(files, prefix, map, callback) {
  var str = '';

  switch (arguments.length) {
    case 2:
      // Handle where prefix and map have not been specified.
      callback = prefix;
      prefix = undefined;
    case 3:
      // Handle where prefix has not been specified.
      if (typeof prefix === "function") {
        callback = map;
        map = prefix;
        prefix = '';

      // Handle where map has not been specified.
      } else {
        callback = map;
        map = undefined;
      }
  }

  // Ensure prefix is always a string to make life easier.
  if (typeof prefix !== "string") {
    prefix = '';
  }

  // Ensure map is always a function to make life easier.
  if (typeof map !== "function") {
    map = function (_, d, n) {
      n(null, d);
    }
  }

  (function read(i) {
    if (i < files.length) {
      fs.readFile(path.join(prefix, files[i]), 'utf8', function (err, data) {
        if (err) {
          callback(err);
        } else {
          map(files[i], data, function (err, result) {
            if (err) {
              callback(err);
            } else {
              str += result;

              read(++i);
            }
          });
        }
      });
    } else {
      callback(null, str);
    }
  }(0));  
}

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

function maps(filename, contents, next) {
  var ext = path.extname(filename);

  if (exports.maps.hasOwnProperty(ext)) {
    exports.maps[ext].apply(null, arguments);
  } else {
    next(null, contents);
  }
}

/**
 * Aside from standard options, css() also accepts:
 *
 * - strict Whether to run sqwish in strict mode (combine duplicate selectors).
 *          default is false. 
 */
module.exports.css = function (opts) {
  var emitter = new events.EventEmitter;

  function complete(a, b) {
    emitter.emit('complete', a, b);
  }

  function error(reason) {
    emitter.emit('error', reason);
  }

  normalize(opts, {
    strict: false
  });

  // Bundle all the specified files together
  combine(opts.filesIn, opts.srcPath, maps, function (err, data) {
    if (err) {
      error(err);
    } else {
      // Either minify the bundle, or leave the bundle untouched if compress
      // was set to false.
      var output = opts.compress ? sqwish.minify(data, opts.strict) : data;

      // save() takes care of whether to write to disk, and fires the complete 
      // event.
      save(opts.destination, output, error, complete);
    }
  });

  return emitter;
}

/**
 * js() accepts no additional properties to the standard.
 */
module.exports.js = function (opts) {
  var emitter = new events.EventEmitter;

  function complete(a, b) {
    emitter.emit('complete', a, b);
  }

  function error(reason) {
    emitter.emit('error', reason);
  }

  normalize(opts, {
    mangle: true
  });

  // Ensure that this value isn't overridden
  opts.fromString = true;

  // Create a bundle from the files specified
  combine(opts.filesIn, opts.srcPath, maps, function (err, data) {
    if (err) {
      error(err);
    } else {
      // We don't want to pass all options to uglifyjs as I don't want to assume
      // its behaviour wont change with a random parameter. "extract" provides a
      // "view" of only the properties we ask for.
      var output = opts.compress ? uglify.minify(data, utils.extract(opts, [
        'fromString',
        'mangle'
      ])).code : data;

      // save() takes care of whether to write to disk, and fires the complete 
      // event.
      save(opts.destination, output, error, complete);
    }
  });

  return emitter;
}

/**
 * .ext : function mappings which allow the contents of certain types of files
 * to be changed before they are bundled in to the same file.
 *
 * This is expected to be used for LESS, CoffeeScript, SASS etc, to convert them
 * to their raw CSS/ JS equivilents first
 */
module.exports.maps = {
  '.less': function (filename, contents, next) {
    less.render(contents, function (e, css) {
      next(e, css);
    });
  },

  '.coffee': function (filename, contents, next) {
    next(null, coffee.compile(contents));
  }
}