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
 * @param map (path, data, next (err, data)). Optional. A filter function which can map the contents of a file to something else
 * @param callback (err, data).
 */
function combine(files, prefix, map, callback) {
  var str = '';

  // Handle all the optional parameters
  if (typeof callback === "undefined") {
    callback = map;
    map = undefined;
  }

  if (typeof prefix === "function") {
    map = prefix;
    prefix = undefined;
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

module.exports.css = function (opts) {
  var files = (opts.filesIn instanceof Array ? opts.filesIn : opts.fileIn);
  var emitter = new events.EventEmitter;

  function complete(a, b) {
    emitter.emit('complete', a, b);
  }

  function error(reason) {
    emitter.emit('error', reason);
  }

  combine(files, opts.srcPath || '', function (location, contents, next) {
    switch (path.extname(location)) {
      case '.less':
        less.render(contents, function (e, css) {
          next(e, css);
        });
      break;
      default:
        next(null, contents);
    };
  }, function (err, data) {
    if (err) {
      error(err);
    } else {
     save(opts.destination, sqwish.minify(data), error, complete);
    }
  });

  return emitter;
}

module.exports.js = function (opts) {
  var files = (opts.filesIn instanceof Array ? opts.filesIn : opts.fileIn);
  var emitter = new events.EventEmitter;

  function complete(a, b) {
    emitter.emit('complete', a, b);
  }

  function error(reason) {
    emitter.emit('error', reason);
  }

  combine(files, opts.srcPath || '', function (err, data) {
    if (err) {
      error(err);
    } else {
      save(opts.destination, uglify.minify(data, {
        fromString: true
      }).code, error, complete);
    }
  });

  return emitter;
}