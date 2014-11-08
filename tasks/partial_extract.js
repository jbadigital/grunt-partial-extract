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

  grunt.registerMultiTask('partial-extract', 'Extract partials from any text based file and write to distinct file.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      punctuation: '.',
      separator: ', ',
      newline: '\n'
    });

    var patternbegin = /\<\!--\s*extract:\s*(([\w\/-_]+\/)([\w_\.-]+))\s*--\>/;
    var patternend = /\<\!--\s*endextract\s*--\>/;

    grunt.log.writeln('');
    grunt.log.writeln('Destination: ' + options.dest);
    grunt.log.writeln('Files: ' + this.files.length);
    grunt.log.writeln('');

    // Iterate over all specified file groups.
    this.files.forEach(function(f) {
      var content = grunt.file.read(f.src);

      if (!patternbegin.test(content)) {
        grunt.log.writeln('Nothing found in file ' + f.src + ', continue...');
        grunt.log.writeln('');

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

      grunt.log.writeln('Found ' + blocks.length + ' partials in file ' + f.src);

      // Write blocks to separate files
      blocks.forEach(function (block) {
        var lines = block.lines.map(properIndentation);
        var leadingWhitespace = lines.map(countWhitespace);
        var crop = leadingWhitespace.reduce(getLeadingWhitespace);

        lines = trimLines(lines, crop);

        grunt.file.write(options.dest + block.dest, lines.join(options.newline));
        grunt.log.writeln('Created "' + block.dest + '"');
      });

      grunt.log.writeln('');
    });
  });

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
