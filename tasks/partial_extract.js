/*
 * grunt-partial-extract
 * https://github.com/tilmanjusten/grunt-partial-extract
 *
 * Copyright (c) 2015 Tilman Justen
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    var util = require('util');
    var _ = require('lodash');
    var path = require('path');
    var options = {};
    var InventoryObject = require('./lib/inventory-object');

    grunt.registerMultiTask('partial-extract', 'Extract partials from any text based file and write to individual files.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        options = this.options({
            // Find partials by pattern:
            //
            // <!-- extract:individual-file.html optional1:value optional2:value1:value2 -->
            //   partial
            // <!-- endextract -->
            patternExtract: new RegExp(/<!--\s*extract:(.|\n)*?endextract\s?-->/g),
            // Get partial options and content
            patternPartial: new RegExp(/<!--\s*((?:.|\n)*?)-->((?:.|\n)*?)<!--\s*endextract\s*-->/i),
            // Wrap partial in template element and add options as data attributes
            templateWrap: {
                before: '<template id="partial" {{wrapData}}>',
                after:  '</template>'
            },
            // Wrap component for viewing purposes: e.g. add production context
            //
            // <!-- extract:individual-file.html wrap:<div class="context">:</div> -->
            //   partial
            // <!-- endextract -->
            //
            // results in
            //
            // <div class="context">
            //   partial
            // </div>
            viewWrap: {
                before: '',
                after: ''
            },
            // Base directory
            base: './inventory',
            // Partial directory where individual partial files will be stored (relative to base)
            partials: './partials',
            // Remove path from partial destination, put files to partials directory
            flatten: false,
            // Store inventory data as JSON file
            storage: 'partial-extract.json',
            // Enable storing partials as individual files
            storePartials: false,
            // Set indent value of partial code
            indent: '    '
        });

        grunt.log.writeln('Destination: ' + options.base);
        grunt.verbose.writeln('Files: ' + this.files.length);
        grunt.log.writeln('');

        var existingFiles = [];
        var processedBlocks = {
            options: options,
            length: 0,
            items: []
        };

        // Iterate over all specified file groups.
        this.files.forEach(function (file) {
            var content = grunt.util.normalizelf(grunt.file.read(file.src));

            if (!options.patternExtract.test(content)) {
                grunt.log.errorlns('No partials in file ' + file.src);
                grunt.verbose.writeln('');

                return;
            }

            var blocks = getPartials(content);

            grunt.log.oklns('Found ' + blocks.length + ' partials in file ' + file.src);

            // Write blocks to separate files
            blocks.map(function (block) {
                // init inventory object
                var opts = {
                    flatten: options.flatten,
                    origin: file.src
                };
                var processed = new InventoryObject(opts);

                // process block
                processed.parseData(block.content, block.options);

                if (existingFiles.indexOf(processed.dest) !== -1) {
                    grunt.verbose.warn("Skip file " + processed.dest + " which already exists.");

                    return;
                }

                existingFiles.push(processed.dest);

                processedBlocks.items.push(processed);

                if (options.storePartials) {
                    grunt.file.write(path.resolve(options.base, options.partials, processed.dest), processed.template);
                }
            });

            grunt.verbose.writeln('');
        });

        processedBlocks.length = processedBlocks.items.length;

        grunt.file.write(path.resolve(options.base, options.storage), JSON.stringify(processedBlocks, null, '\t'));

        grunt.log.writeln('');

        grunt.log.oklns('Extracted ' + existingFiles.length + ' unique partials.');
    });

    /**
     * extract partials
     *
     * @param src
     * @returns {Array}
     */
    function getPartials(src) {
        var blocks = src.match(options.patternExtract);
        var partials = [];

        blocks.forEach(function (block) {
            var parts = block.match(options.patternPartial);

            // prepare block data
            partials.push({
                options: getBlockOptions(parts[1]),
                content: _.trim(parts[2])
            });
        });

        return partials;
    }

    /**
     * read options from annotation
     *
     * e.g.: <!-- extract:teaser/content-teaser--small.html wrap:<div class="teaser-list teaser-list--small">:</div> -->
     * gets:
     * {
     *   extract: 'teaser/content-teaser--small.html',
     *   viewWrap: {before: '<div class="teaser-list teaser-list--small">', after: '</div>'}
     * }
     *
     * @param annotation
     * @returns {{}}
     */
    function getBlockOptions(annotation) {
        var optionValues = annotation.split(/\w+:/).map(function (item) {
            return item.replace(/<!--\s?|\s?-->|^\s+|\s+$/, '');
        }).filter(function (item) {
            return !!item.length;
        });
        var optionKeys = annotation.match(/(\w+):/g).map(function (item) {
            return item.replace(/[^\w]/, '');
        });

        var opts = {};

        optionValues.forEach(function (v, i) {
            var k = optionKeys[i];

            if (typeof k !== 'string') {
                return;
            }

            // Treat option value as array if it has a colon
            // @todo: Allow escaped colons to be ignored
            // RegEx lookbehind negate does not work :(
            // Should be /(?<!\\):/
            if (v.indexOf(':') > -1) {
                v = v.split(':');
            }

            opts[k] = v;
        });

        // Process options
        opts.wrap = formalizeWrap(opts.wrap || options.viewWrap);

        return opts;
    }

    /**
     * Formalize any given value as wrap object
     *
     * @param wrap
     * @returns {{before: '', after: ''}}
     */
    function formalizeWrap(wrap) {
        var result = {before: '', after: ''};

        if ((typeof wrap === 'string' && wrap.length > 0) || typeof wrap === 'number') {
            result.before = result.after = wrap;
        } else if  (Array.isArray(wrap) && wrap.length > 0) {
            result.before = [].slice.call(wrap, 0, 1)[0];
            result.after = wrap.length > 1 ? [].slice.call(wrap, 1, 2)[0] : result.before;
        } else if (_.isPlainObject(wrap)) {
            var i = 0;
            var el;

            // crappy method getting the value of the first and second item in object
            for (el in wrap) {
                if (!wrap.hasOwnProperty(el)) {
                    continue;
                }

                if (i < 2) {
                    result.before = wrap[el];
                }

                i++;
            }

            // set value of after to the value of before if after is empty
            result.after = result.after.length < 1 ? result.before : result.after;
        }

        return result;
    }
};
