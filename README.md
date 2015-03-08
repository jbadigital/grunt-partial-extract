# grunt-partial-extract

> Extract partials from any text based file and write to distinct file.

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-partial-extract --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-partial-extract');
```

## The "partial-extract" task

### Overview
In your project's Gruntfile, add a section named `partial-extract` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  'partial-extract': {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

```js
grunt.initConfig({
  'partial-extract': {
    options: {
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
        // Remove path from partial destination, put files to partials directory
        flatten: false,
        // Store inventory data as JSON file
        storage: 'partial-extract.json',
        // Enable storing partials as individual files
        storePartials: false,
        // Set indent value of partial code
        indent: '    '
    },
    files: [],
  },
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
