# mini-fier

The worlds simplest, no bullshit CSS/LESS and JS/CoffeeScript minifier/ compressor/ bundler. 

***Why another one?***: Because I couldn't find one that:

 1. Uses UglifyJS and sqwish.
 2. Allows me to combine CSS and LESS files, without parsing the CSS files as LESS files
 3. Allows me to combine files and *then* compress the result.

mini-fier does all of that, and has an easy to use and extensible API.

## Install

    npm install git://github.com/mattlunn/mini-fier.git

## Usage

The `css()` and `js()` API methods share a number of common options:

 - `srcPath`: If a string is provided, its value is prefixed to all input files. This value does not affect
the destination in any way.

 - `filesIn`: An array of files you want to compress. If you have only one file, use `fileIn` instead. The
 `css()` method accepts `.css` or `.less` files. The `js()` method accepts `.js` and `.coffee` files.

 - `destination`: The final bundled & optionally minified file is written there. Existing files will be overwritten. 
 If no value is provided, the final contents will be accessible *only* as a parameter to your `complete` handler.

 - `compress`: If you want to bundle your files together, but **not** minify/ compress them, pass `false`.

Both API methods return [`EventEmitter`s](http://nodejs.org/api/events.html#events_class_events_eventemitter). Subscribe
to the `complete` event to be provided with the bundled & optionally minified contents as the first parameter, and the
`destination` (if specified) as the second parameter. The `error` event will be emitted if an error occurs, and the
first parameter will be an `Error` object representing the error that occurred. 

### `css(options)` (returns `EventEmitter`)

As well as the standard options displayed above, the `css()` method accepts the following
additional options:

 - `strict`: Whether sqwish should be ran in [strict mode](https://github.com/ded/sqwish#strict-optimizations). Default is `false`.
 This requires `compress` to be `true`.

If any `.less` files are in the input file list, they will first be compiled to their CSS equivalents. Additional mappings can
be provided using the `maps` extension specified below.

    var minifier = require('mini-fier');
    
    minifier.css({
      srcPath: __dirname + '/public/css',
      filesIn: ['normalize.css', 'application.css'],
      destination: __dirname + '/public/css/all.css'
    }).on('complete', function (code, destination) {
      if (destination) {
        console.log(code.length + " characters was written to " + destination);
      } else {
        // Do something with code (upload to CDN?)
      }
    }).on('error', function (reason) {
      console.log("Failed due to " + reason.toString());
    });

### `js(options)` (returns `EventEmitter`)

As well as the standard options displayed above, the `js()` method accepts the following
additional options:

 - `mangle`: Whether variable names should be renamed to be shorter and meaningless. Default is `true`.

If any `.coffee` files are in the input file list, they will first be compiled to their JS equivalents. Additional mappings can be provided using the `maps` extension specified below.
    
    var minifier = require('mini-fier');
    
    minifier.js({
      srcPath: __dirname + '/public/js',
      filesIn: ['jquery.js', 'application.js'],
      destination: __dirname + '/public/js/all.js'
    }).on('complete', function (code, destination) {
      if (destination) {
        console.log(code.length + " characters was written to " + destination);
      } else {
        // Do something with code (upload to CDN?)
      }
    }).on('error', function (reason) {
      console.log("Failed due to " + reason.toString());
    });

### `maps` (object)

The `maps` export is an object which maps file extensions to mapping functions. This can be used to
convert arbitrary file types to valid CSS and JS in the bundling process. `mini-fier`'s internal conversion of 
`.less` and `.coffee` files to their CSS and JS equivalents makes use of this exact functionality.

As an example, if you were to define your *own* `.less` -> `.css` converter, you would do something
like this:

    var minifier = require('mini-fier');
    var less = require('less');

    minifier.maps['.less'] = function (filepath, contents, next) {
      less.render(contents, function (e, css) {
        next(e, css);
      });  
    };

A filter function gets pass the complete filepath of the current file, the contents of that file
and a `next` function, which must be called when your conversion is complete. The `next` function
should be provided with an error object as the first parameter (or `null`) and the new state of the 
file as the second parameter.

## Testing

A very primitive method of testing is available through the `test.js` file. Run using:

    npm test

The test runner will bundle & compress a number of predefined samples, and output to `tests/out`. Validation
of whether this is actually the correct output is done using eyesight at the moment.

## Contributing

Contributions in the form of bug reports and pull requests would be welcomed.

## License (MIT)

Copyright © 2013 Matt Lunn

Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
and associated documentation files (the “Software”), to deal in the Software without restriction, 
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to 
do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or 
substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE 
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, 
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
