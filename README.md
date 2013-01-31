matts-minifier
==============

The worlds simpliest, no bullshit CSS/LESS and JS minifier/ compressor/ bundler. Whilst there's plenty of minifiers out
there, suprisingly I couldn't find one that:

 1. Uses UglifyJS and sqwish.
 2. Allows me to combine CSS and LESS files, without parsing the CSS files as LESS files
 3. Allows me to combine files and *then* compress the result.

matts-minifier (I will come up with a better name eventually), does all of that.

Install
-----

*It's not on `npm` yet, sorry*.

 1. Add `matts-minifier` to your `package.json` as a dependancy:

        {
          "dependencies": {
            "matts-minifier": "git://github.com/mattlunn/matts-minifier.git"
          }
        }
        
 2. `npm install`

Usage
---

    var minifier = require('matts-minifier');
    
    minifier.css({
      srcPath: 'public/css',
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
    
 - `srcPath` is optional, and provided for convenience. If a value is provided, it is prefixed to all input files 
 specified. It does **not** affect the `destination` in any way.

 - `filesIn` must be an array of files you want to compress. If you have only one file, use `fileIn` instead. The
 `css()` method accepts `.css` or `.less` files. The `js()` method accepts only `.js` files.

 - `destination` is optional. If it is provided, the final bundled & minified file is written there. Existing files
 will be overwritten.

 - Both the `css()` and `js()` methods return `EventEmitters`, which emit a single `error` or `complete` event upon 
 finishing.  The parameters of the `complete` event is the complete bundled & minified code, and, if specified, the
 destination path. The parameter to the `error` event is the `Error` object which raised the error.
