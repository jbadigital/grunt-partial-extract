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
    var InventoryObject = require('./../lib/inventory-object');

    grunt.registerMultiTask('partial-extract', 'Extract partials from any text based file and write to individual files.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        options = this.options({
            // Find partials by pattern:
            //
            // <!-- extract:individual-file.html optional1:value optional2:value1:value2 -->
            //   partial
            // <!-- endextract -->
            patternExtract: new RegExp(/<!--\s*extract:(.|\n)*?endextract\s?-->/g),
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
                var opts = _.assign({}, options);
                var processed = new InventoryObject();

                // process block
                processed.parseData(block, opts);
                processed.setProperty('origin', file.dest);

                processedBlocks.items.push(processed);

                if (options.storePartials) {
                    grunt.file.write(path.resolve(options.base, options.partials, processed.id), processed.template);
                }
            });

            grunt.verbose.writeln('');
        });

        processedBlocks.length = processedBlocks.items.length;

        grunt.file.write(path.resolve(options.base, options.storage), JSON.stringify(processedBlocks, null, '\t'));

        grunt.log.writeln('');

        grunt.log.oklns('Extracted ' + processedBlocks.length + ' partials.');
    });

    /**
     * extract partials
     *
     * @param src
     * @returns {Array}
     */
    function getPartials(src) {
        return src.match(options.patternExtract);
    }
};
