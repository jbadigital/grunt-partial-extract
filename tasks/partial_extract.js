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

    grunt.registerMultiTask('partial-extract', 'Extract partials from any text based file and write to individual files.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        options = this.options({
            // Find partials by pattern:
            //
            // <!-- extract:individual-file.html optional1:value optional2:value1:value2 -->
            //   partial
            // <!-- endextract -->
            patternExtract: new RegExp(/<\!--\s*extract:(.|\n)*?endextract\s?-->/g),
            // Get partial options and content
            patternPartial: new RegExp(/<!--\s*((?:.|\n)*?)-->((?:.|\n)*?)<!--\s*endextract\s*-->/i),
            // Wrap partial in template element and add options as data attributes
            templateWrap: {
                before: '<template id="partial" {{options}}>',
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
        grunt.log.writeln();

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
                grunt.verbose.writeln();

                return;
            }

            var blocks = getPartials(content);

            grunt.log.oklns('Found ' + blocks.length + ' partials in file ' + file.src);

            // Write blocks to separate files
            blocks.map(function (block) {
                var processed = processPartial(block, file.src);

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

            grunt.verbose.writeln();
        });

        processedBlocks.length = processedBlocks.items.length;

        grunt.file.write(path.resolve(options.base, options.storage), JSON.stringify(processedBlocks, null, '\t'));

        grunt.log.writeln();

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
     * process partial
     *
     * @param block
     * @returns {*}
     */
    function processPartial(block, origin) {
        var category = '';
        var name = '';

        // continue if path is empty
        if (!block.options.hasOwnProperty('extract')) {
            return;
        }

        // get filename from extract option
        var matchFilename = block.options.extract.match(/\/([^\/^\s]+)$/i);
        var filename = (matchFilename && matchFilename.length > -1) ? matchFilename[1] : block.options.extract;

        // get path from extract option
        var matchPath = block.options.extract.match(/^([^\s]+\/)/i);
        var path = (matchPath && matchPath.length > -1) ? matchPath[1] : '';

        // set first folder as category name if not in item options
        if (!block.options.hasOwnProperty('category')) {
            var matchCategory = block.options.extract.match(/^([^\s\/]+)\//i);
            category = (matchCategory && matchCategory.length > -1) ? matchCategory[1] : false;
            category = typeof category === 'string' ? _.startCase(category) : false;
        } else {
            category = _.startCase(block.options.category);
        }

        // get name from filename if not in options
        if (!block.options.hasOwnProperty('name')) {
            var matchName = filename.match(/^([^\s]+)\./i);
            name = (matchName && matchName.length > -1) ? matchName[1] : '';
            name = typeof name === 'string' ? _.startCase(name) : '';
        } else {
            name = block.options.name;
        }

        // remove nested path from dest if required
        var dest = options.flatten ? filename : block.options.extract;
        var lines = block.content.split(grunt.util.linefeed).map(properIndentation);
        var leadingWhitespace = lines.map(countWhitespace);
        var crop = leadingWhitespace.reduce(getLeadingWhitespace);
        var viewWrap = block.options.wrap;
        var templateWrapOptions = optionsToDataString(block.options);

        lines = trimLines(lines, crop);

        var viewLines = util._extend([], lines);
        var templateLines = util._extend([], lines);

        // wrap partial if inline option viewWrap: exists
        if (viewWrap.before.length) {
            viewLines = raiseIndent(viewLines);
            viewLines.unshift('');
            viewLines.unshift(viewWrap.before);
            viewLines.push('');
            viewLines.push(viewWrap.after);
        }

        // add templateWrap
        if (typeof options.templateWrap === 'object') {
            var before = options.templateWrap.before || '';
            var after = options.templateWrap.after || '';

            before = before.replace('{{options}}', templateWrapOptions);
            after = after.replace('{{options}}', templateWrapOptions);

            templateLines.unshift(before);
            templateLines.push(after);
        }

        return {
            category: category,
            dest: dest,
            filename: filename,
            lines: lines,
            name: name,
            options: block.options,
            optionsData: templateWrapOptions,
            origin: origin,
            partial: lines.join(grunt.util.linefeed),
            path: path,
            template: templateLines.join(grunt.util.linefeed),
            view: viewLines.join(grunt.util.linefeed)
        };
    }

    /**
     * replace tabs by indent value
     *
     * @param line
     * @return string
     */
    function properIndentation(line) {
        return line.replace(/\t/, options.indent || '');
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
        var optionValues = annotation.split(/\w+\:/).map(function (item) {
            return item.replace(/<\!--\s?|\s?-->|^\s+|\s+$/, '');
        }).filter(function (item) {
            return !!item.length;
        });
        var optionKeys = annotation.match(/(\w+)\:/g).map(function (item) {
            return item.replace(/[^\w]/, '');
        });

        var opts = {};
        var patternMultiple = new RegExp(/\:/);

        optionValues.forEach(function (v, i) {
            var k = optionKeys[i];

            if (typeof k !== 'string') {
                return;
            }

            // Treat option value as array if it has a colon
            // @todo: Allow escaped colons to be ignored
            // RegEx lookbehind negate does not work :(
            // Should be /(?<!\\)\:/
            if (v.match(patternMultiple)) {
                v = v.split(patternMultiple);
            }

            opts[k] = v;
        });

        // Process options
        opts.wrap = formalizeWrap(opts.wrap || options.viewWrap);

        return opts;
    }

    /**
     * raise offset in lines
     *
     * @param lines
     * @param offset
     * @returns {Array}
     */
    function raiseIndent(lines, offset) {
        offset = offset || '    ';

        return lines.map(function (line) {
            return offset + line;
        });
    }

    /**
     * Format options as string of HTML data parameters
     *
     * @param options
     * @returns {string}
     */
    function optionsToDataString(options) {
        if (typeof options !== 'object') {
            return '';
        }

        var prepared = [];
        var el;
        var processedOptions = _.assign({}, options);

        // prepare wrap option
        if (processedOptions.hasOwnProperty('wrap')) {
            processedOptions['wrap-before'] = processedOptions.wrap.before;
            processedOptions['wrap-after'] = processedOptions.wrap.after;

            delete(processedOptions.wrap);
        }

        // create data attributes
        for (el in processedOptions) {
            if (processedOptions.hasOwnProperty(el) === false) {
                continue;
            }

            var value = processedOptions[el];
            var preparedVal = JSON.stringify(processedOptions[el]);
            var param = '';

            // Ignore callbacks
            if (typeof value === 'function') {
                continue;
            }

            // Cleanup: Remove leading and trailing " and ', replace " by ' (e.g. in stringified objects)
            preparedVal = preparedVal.replace(/^[\'\"]|[\'\"]$/g, '').replace(/\\?\"/g, '\'');

            // Build data parameter: data-name="value"
            param = 'data-' + el + '="' + preparedVal + '"';

            prepared.push(param);
        }

        return prepared.join(' ');
    }

    /**
     * Formalize any given value as wrap object
     *
     * @param wrap
     * @returns {{before: string, after: string}}
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
                    return;
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
