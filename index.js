var through = require('through');
var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;
var Buffer = require('buffer').Buffer;
var Concat = require('concat-with-sourcemaps');

module.exports = function(file, opt) {
  if (!file) {
    throw new PluginError('gulp-concat', 'Missing file option for gulp-concat');
  }
  opt = opt || {};

  // to preserve existing |undefined| behaviour and to introduce |newLine: ""| for binaries
  if (typeof opt.newLine !== 'string') {
    opt.newLine = gutil.linefeed;
  }

  var isUsingSourceMaps = false;
  var firstFile;
  var fileName;
  var concat;

  if (typeof file === 'string') {
    fileName = file;
  } else if (typeof file.path === 'string') {
    fileName = path.basename(file.path);
    firstFile = new File(file);
  } else {
    throw new PluginError('gulp-concat', 'Missing path in file options for gulp-concat');
  }

  function bufferContents(file) {
    // ignore empty files
    if (file.isNull()) {
      return;
    }

    if (file.isStream()) {
      return this.emit('error', new PluginError('gulp-concat',  'Streaming not supported'));
    }

    // enable sourcemap support for concat
    // if a sourcemap initialized file comes in
    if (file.sourceMap && isUsingSourceMaps === false) {
      isUsingSourceMaps = true;
    }

    // set first file if not already set
    if (!firstFile) {
      firstFile = file;
    }

    // construct concat instance
    if (!concat) {
      concat = new Concat(isUsingSourceMaps, fileName, opt.newLine);
    }

    // add file to concat instance
    concat.add(file.relative, file.contents.toString(), file.sourceMap);
  }

  function endStream() {
    // no files passed in, no file goes out
    if (!firstFile) {
      return this.emit('end');
    }

    var joinedFile = firstFile;

    if (typeof file === 'string') {
      joinedFile = firstFile.clone({contents: false});
      joinedFile.path = path.join(firstFile.base, file);
    }

    joinedFile.contents = new Buffer(concat.content);

    if (concat.sourceMapping) {
      joinedFile.sourceMap = JSON.parse(concat.sourceMap);
    }

    this.emit('data', joinedFile);
    this.emit('end');
  }

  return through(bufferContents, endStream);
};
