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

    grunt.registerMultiTask('partial-extract', 'Extract partials from any text based files and write json inventory file.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        options = this.options({
            // Find partials by pattern:
            //
            // <!-- extract:individual-file.html optional1:value optional2:value1:value2 -->
            //   partial
            // <!-- endextract -->
            patternExtract: new RegExp(/<!--\s*extract:(.|\n)*?endextract\s?-->/g),
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
            lengthTotal: 0,
            lengthUnique: 0,
            contentAreas: []
        };
        var uniqueBlocks = [];

        // Iterate over all specified file groups.
        this.files[0].src.forEach(function (file) {
            
            var content = grunt.util.normalizelf(grunt.file.read(file));
            var templateContent = content;
            var templateContentAreas = '';
            var templateBrand = '';

            if (!options.patternExtract.test(content)) {
                grunt.log.errorlns('No partials in file ' + file);
                grunt.verbose.writeln('');

                return;
            }

            var blocks = getPartials(content);

            grunt.log.oklns('Found ' + blocks.length + ' partials in file ' + file);

            // Write blocks to separate files
            blocks.map(function (block) {
                // init inventory object
                var opts = _.assign({}, options);
                var processed = new InventoryObject();
                var isDuplicate = false;
                var blockContent = '';

                // process block
                processed.parseData(block, opts);
                processed.contentFile = options.partials + '/' + processed.options.brand + '/' + processed.name + ".html";
                blockContent = processed.content;
                processed = _.omit(processed, 'content');
                
                processedBlocks.contentAreas.push(processed);
                
                processedBlocks.lengthTotal++;
                
                templateBrand = processed.options.brand;

                if (uniqueBlocks.indexOf(processed.id) < 0) {
                    uniqueBlocks.push(processed.id);
                } else {
                    isDuplicate = true;
                }

                // store partial if not a duplicate
                if (options.storePartials && !isDuplicate) {
                    grunt.file.write(path.resolve(options.base, options.partials, processed.options.brand, processed.name + ".html"), blockContent);
                }
                
            });

            grunt.verbose.writeln('');
            
            options.templateContentAreas.forEach(function(area) {
                templateContentAreas += '<custom type="content" name="' + area + '">\n';
            });
            
            // replace modules with content area code for template content
            templateContent = templateContent.replace(options.patternExtract, '');
            templateContent = templateContent.replace(options.templatePatternExtract, templateContentAreas);
            
            // write out template to file
            grunt.file.write(path.resolve(options.base, options.templates, templateBrand + ".html"), templateContent);
            grunt.log.oklns('Created template for ' + templateBrand + '.');

            grunt.verbose.writeln('');
        });

        processedBlocks.lengthUnique = uniqueBlocks.length;

        grunt.file.write(options.storage, JSON.stringify(processedBlocks, null, '\t'));

        grunt.log.writeln('');

        grunt.log.oklns('Extracted ' + processedBlocks.lengthTotal + ' partials, ' + processedBlocks.lengthUnique + ' unique.');
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
