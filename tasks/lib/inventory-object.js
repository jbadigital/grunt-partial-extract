var _ = require('lodash');
var util = require('util');
var os = require('os');

/**
 * replace tabs by indent value
 *
 * @param line
 * @param indent
 * @return string
 */
function properIndentation(line, indent) {
    return line.replace(/\t/, indent || '');
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
        preparedVal = preparedVal.replace(/^['"]|['"]$/g, '').replace(/\\?"/g, "'");

        // Build data parameter: data-name="value"
        param = 'data-' + el + '="' + preparedVal + '"';

        prepared.push(param);
    }

    return prepared.join(' ');
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
 * module
 * @param options
 * @param data
 * @returns {*}
 */
module.exports = function (options, data) {

    "use strict";

    options = options || {flatten: false, origin: ''};
    data = data || {};

    // set default properties
    var inventoryObject = {
        category:       data.category || undefined,
        dest:           data.dest,
        filename:       data.filename,
        lines:          data.lines,
        name:           data.name,
        options:        data.options,
        optionsData:    data.optionsData,
        origin:         options.origin,
        partial:        data.partials,
        path:           data.path,
        template:       data.template,
        view:           data.view
    };

    /**
     * parse data from extracted part
     *
     * @param content
     * @param opts
     */
    inventoryObject.parseData = function(content, opts) {
        var category = '';
        var name = '';

        // continue if path is empty
        if (!opts.hasOwnProperty('extract')) {
            return;
        }

        // get filename from extract option
        var matchFilename = opts.extract.match(/\/([^\/^\s]+)$/i);
        var filename = (matchFilename && matchFilename.length > -1) ? matchFilename[1] : opts.extract;

        // get path from extract option
        var matchPath = opts.extract.match(/^([^\s]+\/)/i);
        var path = (matchPath && matchPath.length > -1) ? matchPath[1] : '';

        // set first folder as category name if not in item options
        if (!opts.hasOwnProperty('category')) {
            var matchCategory = opts.extract.match(/^([^\s\/]+)\//i);
            category = (matchCategory && matchCategory.length > -1) ? matchCategory[1] : false;
            category = typeof category === 'string' ? _.startCase(category) : false;
        } else {
            category = _.startCase(opts.category);
        }

        // get name from filename if not in options
         if (!opts.hasOwnProperty('name')) {
             var matchName = filename.match(/^([^\s]+)\./i);
             name = (matchName && matchName.length > -1) ? matchName[1] : '';
             name = typeof name === 'string' ? _.startCase(name) : '';
         } else {
             name = opts.name;
         }

        // remove nested path from dest if required
        var dest = options.flatten ? filename : opts.extract;
        var lines = content.split('\n').map(function(line) {
            // remove possibly existing CR
            return _.trimRight(line);
        }).map(function (line) {
            return properIndentation(line, options.indent);
        });
        var leadingWhitespace = lines.map(countWhitespace);
        var crop = leadingWhitespace.reduce(getLeadingWhitespace);
        var viewWrap = opts.wrap;
        var templateWrapOptions = optionsToDataString(opts);

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

            before = before.replace('{{wrapData}}', templateWrapOptions);
            after = after.replace('{{wrapData}}', templateWrapOptions);

            templateLines.unshift(before);
            templateLines.push(after);
        }

        // set properties
        this.category       = category;
        this.dest           = dest;
        this.filename       = filename;
        this.lines          = lines;
        this.name           = name;
        this.options        = opts;
        this.optionsData    = templateWrapOptions;
        this.partial        = lines.join(os.EOL);
        this.path           = path;
        this.template       = templateLines.join(os.EOL);
        this.view           = viewLines.join(os.EOL);
    };

    /**
     * return inventory object
     */
    return inventoryObject;
};