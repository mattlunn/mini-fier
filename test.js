var minifier = require('./minifier');
var counter = 0;

function test(emitter) {
  counter++;

  emitter.on('complete', function (data, filename) {
    console.log(filename + ' complete (' + data.length + ' chars)');

    if (--counter === 0) {
      console.log('Complete');
    }
  }).on('error', function () {
    for (var i=0;i<arguments.length;i++) {
      console.log(arguments[i].toString());
    }
  });
}

/**
 * JS Tests
 */

// Check single file works.
test(minifier.js({
  srcPath: __dirname + '/tests/',
  fileIn: 'jquery.js',
  destination: __dirname + '/tests/out/single.min.js'
}));

// Check multiple files works.
test(minifier.js({
  srcPath: __dirname + '/tests/',
  filesIn: ['jquery.js', 'main.coffee'],
  destination: __dirname + '/tests/out/multiple.min.js'
}));

// Check mangling can be turned off.
test(minifier.js({
  srcPath: __dirname + '/tests/',
  filesIn: ['jquery.js', 'main.coffee'],
  destination: __dirname + '/tests/out/multiple.bun.js',
  compress: false
}));

/**
 * CSS Tests
 */

// Check single file works.
test(minifier.css({
  srcPath: __dirname + '/tests/',
  fileIn: 'normalize.css',
  destination: __dirname + '/tests/out/single.min.css'
}));

// Check multiple files works.
test(minifier.css({
  srcPath: __dirname + '/tests/',
  filesIn: ['normalize.css', 'main.less'],
  destination: __dirname + '/tests/out/multiple.bun.css'
}));

// Check mangling can be turned off.
test(minifier.css({
  srcPath: __dirname + '/tests/',
  filesIn: ['normalize.css', 'main.less'],
  destination: __dirname + '/tests/out/multiple.bun.css',
  compress: false
}));

// Check strict can be enabled
test(minifier.css({
  srcPath: __dirname + '/tests/',
  filesIn: ['strict.css'],
  destination: __dirname + '/tests/out/strict.css',
  compress: true,
  strict: true
}));

