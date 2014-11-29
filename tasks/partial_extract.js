/*
 * grunt-partial-extract
 * https://github.com/tilmanjusten/grunt-partial-extract
 *
 * Copyright (c) 2014 Tilman Justen
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  var options = {};

  grunt.registerMultiTask('partial-extract', 'Extract partials from any text based file and write to distinct file.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    options = this.options({
      patternbegin: /\<\!--\s*extract:\s*(([\w\/-_]+\/)([\w_\.-]+))\s*--\>/,
      patternend: /\<\!--\s*endextract\s*--\>/
    });

    grunt.verbose.writeln('Destination: ' + options.dest);
    grunt.verbose.writeln('Files: ' + this.files.length);
    grunt.verbose.writeln();
    var existingFiles = [];

    // Iterate over all specified file groups.
    this.files.forEach(function(file) {
      var content = grunt.util.normalizelf(grunt.file.read(file.src));

      if (!options.patternbegin.test(content)) {
        grunt.log.errorlns('No partials in file ' + file.src);
        grunt.verbose.writeln();

        return;
      }

      var lines = content.split(grunt.util.linefeed);
      var blocks = getPartials(lines);

      grunt.log.oklns('Found ' + blocks.length + ' partials in file ' + file.src);

      // Write blocks to separate files
      blocks.filter(function (block) {
        if (existingFiles.indexOf(block.dest) !== -1) {
          return false;
        } else {
          return true;
        }
      }).map(function (block) {
        var lines = block.lines.map(properIndentation);
        var leadingWhitespace = lines.map(countWhitespace);
        var crop = leadingWhitespace.reduce(getLeadingWhitespace);

        lines = trimLines(lines, crop);

        grunt.file.write(options.dest + block.dest, lines.join(grunt.util.linefeed));
        existingFiles.push(block.dest);
      });

      grunt.verbose.writeln();
    });
  });

  /**
   * extract partials
   *
   * @param lines
   * @returns {Array}
   */
  function getPartials(lines) {
    var block;
    var add = false;
    var match;
    var blocks = [];

    // Import blocks from file
    lines.forEach(function (line) {
      if (line.match(options.patternend)) {
        add = false;
        blocks.push(block);
      }

      if (add) {
        block.lines.push(line);
      }

      if (match = line.match(options.patternbegin)) {
        add = true;
        block = {dest: match[1], lines: []};
      }
    });

    return blocks;
  }

  /**
   * replace tabs by four spaces
   *
   * @param line
   * @return string
   */
  function properIndentation(line) {
    return line.replace(/\t/, '    ');
  }

  /**
   * count leading whitespace chars
   *
   * @param line
   * @return integer
   */
  function countWhitespace(line) {
    // return a somewhat high value for empty lines
    return line.length ? line.match(/^\s*/)[0].length : 9999;
  }

  /**
   * get lowest value of leading whitespace in a given block
   *
   * @param previous
   * @param current
   * @returns integer
   */
  function getLeadingWhitespace(previous, current) {
    return previous <= current ? previous : current;
  }

  /**
   * trim given number of leading characters
   *
   * @param lines
   * @param num Number of chars to be removed
   * @returns Array
   */
  function trimLines(lines, num) {
    return lines.map(function (line) {
      return line.substr(num);
    });
  }
};
