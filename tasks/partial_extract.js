/*
 * grunt-partial-extract
 * https://github.com/tilman/partial-extract
 *
 * Copyright (c) 2014 Tilman Justen
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('partial-extract', 'Extract partials from any text based file and write to distinct file.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      punctuation: '.',
      separator: ', '
    });

    var patternbegin = /\<\!--\s*extract:\s*(([\w\/-_]+\/)([\w_\.-]+))\s*--\>/;
    var patternend = /\<\!--\s*endextract\s*--\>/;

    // Iterate over all specified file groups.
    this.files.forEach(function(f) {

      grunt.log.writeln('File', f.src);

      var content = grunt.file.read(f.src);

      if (!patternbegin.test(content)) {
        grunt.log.writeln('No extraction blocks found in ', f.src);

        return;
      }

      var lines = content.replace(/\r\n/g, '\n').split(/\n/);
      var blocks = [];
      var block;
      var add = false;
      var match;

      // Import blocks from file
      lines.forEach(function (line) {
        if (line.match(patternend)) {
          add = false;
          blocks.push(block);
        }

        if (add) {
          block.lines.push(line);
        }

        if (match = line.match(patternbegin)) {
          add = true;
          block = {dest: match[1], lines: []};
        }
      });

      grunt.log.writeln("Extracted blocks", blocks.length);

      // Write blocks to separate files
      blocks.forEach(function (b) {
        grunt.file.write(options.dest + b.dest, b.lines.join("\r\n"));
        grunt.log.writeln('File "' + options.dest + b.dest + '" created.');
      });
    });
  });

};
