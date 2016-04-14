'use strict';

var _ = require('lodash');
var util = require('util');
var os = require('os');
var crypto = require('crypto');

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
 * read options from annotation
 *
 * e.g.: <!-- extract:teaser/content-teaser--small.html brand:example -->
 * gets:
 * {
     *   extract: 'teaser/content-teaser--small.html',
     *   brand: 'example'
     * }
 *
 * @param annotation
 * @param defaults
 * @returns {{}}
 */
function getBlockOptions(annotation, defaults) {
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

    return opts;
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
 * create sha1 hash from string
 *
 * @param value
 * @returns {*}
 */
function createId(value) {
    return crypto.createHash('sha1').update(value, 'utf8').digest('hex')
}

/**
 * get default options, scope as function instead of "public" property
 *
 * @returns {{indent: string}}
 */
function getDefaultOptions() {
    return {
        indent: '    '
    }
}

/**
 * Constructor
 *
 * Use named function to get better backtraces in node
 *
 * @param data
 * @constructor
 */
var InventoryObject = function (data) {
    data                = data || {};

    this.brand          = data.hasOwnProperty('brand') ? data.brand : '';
    this.id             = data.hasOwnProperty('id') ? data.id : '';
    this.name           = data.hasOwnProperty('name') ? data.name : '';
    
    this.category       = data.hasOwnProperty('category') ? data.category : '';
    this.group          = data.hasOwnProperty('group') ? data.group : '';

    this.options        = data.hasOwnProperty('options') ? data.options : {};
    this.content        = data.hasOwnProperty('content') ? data.content : '';
};

/**
 * parse data from extracted part
 *
 * @param src
 * @param opts
 */
InventoryObject.prototype.parseData = function(src, opts) {
    opts = _.assign({}, getDefaultOptions(), opts);

    var parts = src.match(/<!--\s*((?:.|\n)*?)-->((?:.|\n)*?)<!--\s*endextract\s*-->/i);
    var blockOpts = getBlockOptions(parts[1], opts);
    var content = _.trimRight(_.trimLeft(parts[2], '\n\r'));
    
    var name;
    var brand;
    var id;
    
    var category;
    var group;

    // continue if name is empty
    if (!blockOpts.hasOwnProperty('extract')) {
        return;
    }

    // label from name property and fallback to extract value
    name = blockOpts.hasOwnProperty('name') ? blockOpts.name : blockOpts.extract;

            console.log('blockOpts: ', parts[1]);

    // set id
    id = blockOpts.hasOwnProperty('id') ? blockOpts.id : this.id;

    // set brand name
    brand = blockOpts.hasOwnProperty('brand') ? blockOpts.brand : this.brand;

    // set category name
    category = blockOpts.hasOwnProperty('category') ? blockOpts.category : this.category;

    // set group
    group = blockOpts.hasOwnProperty('group') ? blockOpts.group : this.group;

    // process source code
    var lines = content.split('\n').map(function(line) {
        // remove possibly existing CR
        return _.trimRight(line);
    }).map(function (line) {
        return properIndentation(line, opts.indent);
    });
    var leadingWhitespace = lines.map(countWhitespace);
    var crop = leadingWhitespace.reduce(getLeadingWhitespace);

    lines = trimLines(lines, crop);

    // set properties
    this.name           = name;
    this.brand          = brand;
    this.id             = id;
    this.content        = lines.join(os.EOL);
    
    this.category       = category;
    this.group          = group;


    this.options        = blockOpts;
};

/**
 * set inventory object property if prop is a valid property name (property exists)
 *
 * @param prop
 * @param value
 * @returns {boolean}
 */
InventoryObject.prototype.setProperty = function (prop, value) {
    if (typeof prop !== 'string' || !this.hasOwnProperty(prop)) {
        return false;
    }

    this[prop] = value;

    return true;
};



/**
 * module
 * @param data
 * @returns {*}
 */
module.exports = InventoryObject;