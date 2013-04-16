# mini-fier

The worlds simplest, no bullshit CSS/LESS and JS/CoffeeScript minifier/ compressor/ bundler. 

***Why another one?***: Because I couldn't find one that:

 1. Uses UglifyJS and sqwish.
 2. Allows me to combine CSS and LESS files, without parsing the CSS files as LESS files
 3. Allows me to combine files and *then* compress the result.

mini-fier does all of that, and has an easy to use and extensible API.

## Install & Setup

    npm install git://github.com/mattlunn/mini-fier.git

Create an instance of `minifier` as follows:

    var minifier = require('minifier');
    var instance = minifier.create();
    
`instance` gives you methods such as `css()` and `js()` (which allow you to minify CSS and JS files), and also `addFilter()`,
`addReader()`, `removeFilter()` and `removeReader()`; lets look at each of them in more detail...
## Usage

The `css()` and `js()` API methods share a number of common options:

 - `srcPath`: If a string is provided, its value is prefixed to all input files. This value does not affect
the destination in any way.

 - `filesIn`: An array of files you want to compress. If you have only one file, use `fileIn` instead. The
 `css()` method accepts `.css` or `.less` files. The `js()` method accepts `.js` and `.coffee` files. HTTP(S) URLs are 
 accepted, and the response bodys will be included in the combined file.

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
be provided using the `addFilter()` extension specified below.

    var minifier = require('mini-fier').create();
    
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

If any `.coffee` files are in the input file list, they will first be compiled to their JS equivalents. Additional mappings can be provided using the `addFilters` extension specified below.
    
    var minifier = require('mini-fier').create();
    
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

### `addFilter(string, callback)`

"filters" are mini-fiers way of converting file contents from one format to another. mini-fier uses filters internally
to convert LESS and CoffeeScript files to their CSS and JS equivalents. You can extend mini-fier to do the same for
SASS or other formats.

 - `string`: A string which is converted to a regular expression. Each file (filepath or URL) is tested against each
 filter until a matching regular expression is found. That filter's callback is then executed.

 - `callback`: Executed when a file matches the provided string. The callback is provided with `(filename, contents, options, next)`,
 where `filename` is the name of the file matched (path or URL), `contents` is the original state of the file,
 `options` is the normalized options object passed to either `css()` or `js()`, and `next` is the function to be 
 executed when you've done with your filtering.

 `next` expects an error object as the first parameter (or `null`), and the filtered file as the second parameter.
 
Below is the most basic way of using  filters to convert CoffeeScript to JS:
  
    instance.addFilter('\\.coffee$', function (filename, contents, options, callback) {
      callback(null, require('coffee-script').compile(contents));
    });
  
### `removeFilter(string)` (returns `boolean`)

Removes the filter which was added with `string`. Returns a `boolean` depending on whether a filter was found and removed or not.

### `addReader(sring, callback)` 

"Readers" are mini-fiers way of reading in filepaths or URLS. Existing readers are used to read files off the filesystem,
and to retrieve URLs. It is *unlikely* that you will need to add your own readers, but the option is here should you need it.

 - `string`: A string which is converted to a regular expression. Each file (filepath or URL) is tested against each
 filter until a matching regular expression is found. That filter's callback is then executed.

 - `callback`: Executed when a file matches the provided string. The callback is provided with `(filename, options, next)`,
 where `filename` is the name of the file matched (path or URL), `options` is the normalized options object passed to either
 `css()` or `js()`, and `next` is the function to be executed when you've read in the file appropiately.

 `next` expects an error object as the first parameter (or `null`), and the read-in-file as the second parameter.
 
Below is the most basic way of using readers to retrieve URLs
  
    var request = require('request');
  
    instance.addReader('^https?://', function (url, options, callback) {
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
    
### `removeReader(string)` (returns `boolean`)

Removes the reader which was added with `string`. Returns a `boolean` depending on whether a reader was found and removed or not.

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
