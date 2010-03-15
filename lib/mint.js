// **Mint** is a small, fast documentation generator for
// [literate-style programming](http://en.wikipedia.org/wiki/Literate_programming)
// that produces HTML files from your source code. In literate programming, the emphasis is
// placed on writing clear documentation in ordinary human language instead of writing terse
// half-sentences. The code is considered merely an artifact of the documentation. Thus, in Mint
// the documentation is displayed most prominently, right alongside the fragments of code to
// which each section pertains.
//
// Mint was inspired by (and borrows heavily from) [Docco](http://github.com/jashkenas/docco),
// with the main difference being that Mint is written in JavaScript instead of
// [CoffeeScript](http://github.com/jashkenas/coffee-script). Code comments are written in
// [Markdown](http://daringfireball.net/projects/markdown/) and templates use
// [Mustache](http://github.com/defunkt/mustache/).
//
// ### Requirements
//
// Mint runs on [Node.js](http://nodejs.org/) and uses [Pygments](http://pygments.org/) to
// highlight source code, so you'll need both of these installed on your system in order to
// use it.
process.mixin(require('sys'));
var path = require('path');
var fs = require('fs');

var root = path.dirname(__dirname);
var Mu = require(path.join(root, 'vendor', 'Mu', 'lib', 'mu'));
var Markdown = require(path.join(root, 'vendor', 'markdown-js', 'lib', 'markdown'));
var Mint = exports;

/* The start/end of each Pygments highlight block. */
var highlightStart = '<div class="highlight"><pre>';
var highlightEnd = '</pre></div>';

/* The paths to all the source files being processed. */
var allFiles = [];

// Properties
// ----------

// The current version of Mint.
Mint.version = '0.1';

// The directory to use for the output.
Mint.outputDir = './';

// The `templateRoot` and `templateExtension` properties are merely aliases
// for properties of the same name on the [Mu](http://github.com/raycmorgan/Mu)
// object.
Mint.__defineGetter__('templateRoot', function() {
    return Mu.templateRoot;
});

Mint.__defineSetter__('templateRoot', function(value) {
    Mu.templateRoot = value;
});

Mint.__defineGetter__('templateExtension', function() {
    return Mu.templateExtension;
});

Mint.__defineSetter__('templateExtension', function(value) {
    Mu.templateExtension = value;
});

// The `languages` property stores a hash of information we have about a given
// language, keyed by the file extension commonly used for files of code written
// in that language. Each entry starts out with a `name` and `symbol` property.
// The name is the language lexer name that [Pygments](http://pygments.org/) will
// be able to recognize, and the symbol is the character sequence that represents
// the beginning of a single-line (also known as end-of-line) comment in that language.
// At present, Mint only supports one style of single-line comments for a given
// language. This limited degree of support greatly simplifies parsing, as it allows
// us to split on new-line characters instead of creating a separate parser for
// each new language.
Mint.languages = {
    '.as':      { name: 'as3',           symbol: '//' },
    '.c':       { name: 'c',             symbol: '//' },
    '.cc':      { name: 'cpp',           symbol: '//' },
    '.coffee':  { name: 'coffee-script', symbol: '#'  },
    '.conf':    { name: 'text',          symbol: '#'  },
    '.ini':     { name: 'ini',           symbol: ';'  },
    '.java':    { name: 'java',          symbol: '//' },
    '.js':      { name: 'javascript',    symbol: '//' },
    '.m':       { name: 'objective-c',   symbol: '//' },
    '.php':     { name: 'php',           symbol: '//' },
    '.py':      { name: 'python',        symbol: '#'  },
    '.rb':      { name: 'ruby',          symbol: '#'  }
};

// Main Functions
// --------------

// The main point of entry for an external program, this function takes an
// array of files that are to be used in the documentation. By the time
// this function is called, all properties should already be set.
Mint.go = function(sourceFiles) {
    allFiles = sourceFiles;

    Mint.setup(function() {
        sourceFiles.forEach(function(file) {
            fs.readFile(file, function(error, source) {
                if (error) throw error;
                var sections = Mint.parse(file, source);
                Mint.format(file, sections, function() {
                    Mint.output(file, sections);
                });
            });
        });

        Mint.copyStaticFiles();
    });
};

// We need to make sure all necessary dependencies are installed and that the
// output directory exists and is writable. Otherwise, we should fail here and
// let the user know.
Mint.setup = function(callback) {
    exec('pygmentize', function(error, stdout, stderr) {
        if (error) {
            puts('No pygmentize found. Try running `sudo easy_install pygments`');
            process.exit();
        }

        path.exists(Mint.outputDir, function(exists) {
            if (!exists) {
                fs.mkdirSync(Mint.outputDir, 0755);
            }

            Mint.templateRoot = path.join(root, 'template');

            callback();
        });
    });
};

// Here we parse the `source` code from the given file into *sections*, each of
// which consists of a comment and the code that followed it in the following
// form:
//
//     {
//         docsText: '',
//         codeText: ''
//     }
Mint.parse = function(file, source) {
    var lang = Mint.getLanguage(file);
    var lines = source.split('\n');
    var sections = [];
    var hasCode, docsText, codeText;
    hasCode = docsText = codeText = '';
    var save = function(docs, code) {
        sections.push({ docsText: docs, codeText: code });
    };
    lines.forEach(function(line) {
        if (line.match(lang.commentMatcher)) {
            if (hasCode) {
                save(docsText, codeText);
                hasCode = docsText = codeText = '';
            }
            docsText += line.replace(lang.commentMatcher, '') + '\n';
        } else {
            hasCode = true;
            codeText += (line + '\n');
        }
    });
    save(docsText, codeText);
    return sections;
};

// This function expects the name of a file and its parsed *sections* (see
// `Mint.parse`). Document text is run through Markdown and code is run
// through Pygments here. After this method executes, each section will
// have `docsHtml` and `codeHtml` attributes containing the result of these
// operations.
Mint.format = function(file, sections, callback) {
    var lang = Mint.getLanguage(file);
    var pygments = process.createChildProcess('pygmentize', ['-l', lang.name, '-f', 'html']);
    var output = '';
    pygments.addListener('error', function(error) {
        if (error) process.stdio.writeError(error);
    });
    pygments.addListener('output', function(data) {
        if (data) output += data;
    });
    pygments.addListener('exit', function() {
        // Strip the wrapper <div> that Pygments inserts.
        output = output.replace(highlightStart, '').replace(highlightEnd, '');
        // Split on the divider token.
        var fragments = output.split(lang.dividerHtml);
        sections.forEach(function(section, index) {
            section.docsHtml = Markdown.toHTML(section.docsText);
            section.codeHtml = highlightStart + fragments[index] + highlightEnd;
        });
        callback();
    });
    var codeFragments = sections.map(function(s) { return s.codeText });
    pygments.write(codeFragments.join(lang.dividerText));
    pygments.close();
};

// Uses the given `obj` as data for the default template. This may be expanded
// in the future to support multiple template names for a given template.
Mint.generateHtml = function(obj, callback) {
    var html = '';
    Mu.render('default', obj, {}, function(error, output) {
        if (error) throw error;
        output.addListener('error', function(error) {
            if (error) process.stdio.writeError(error);
        });
        output.addListener('data', function(data) {
            if (data) html += data;
        });
        output.addListener('end', function() {
            callback(html);
        });
    });
};

// Given a file and its formatted *sections*, produce an HTML file in the output
// directory that contains the result of running the data through the template (see
// above).
Mint.output = function(file, sections) {
    var title = path.basename(file);
    var dest = path.join(Mint.outputDir, path.basename(file, path.extname(file))) + '.html';
    sections = sections.map(function(s, i) { return apply({ num: i }, s); });
    var obj = { title: title, sections: sections, files: allFiles };
    Mint.generateHtml(obj, function(html) {
        fs.writeFile(dest, html);
    });
};

// Utility Functions
// -----------------

// This utility function returns a *language* hash for a given file. All language
// information is stored in `Mint.languages` and keyed by file extension. If
// we have not yet encountered a file of this type during this parse, we set
// up some regular expressions and tokens here that will assist us in parsing
// the code into relevant sections.
Mint.getLanguage = function(file) {
    var ext = path.extname(file);
    var lang = Mint.languages[ext];

    // If we haven't seen this language before, we'll just call it `text` and assume
    // it has single line comments in the octothorpe style.
    if (!Mint.languages[ext]) {
        lang = Mint.languages[ext] = {};
        lang.name = 'text';
        lang.symbol = '#';
    }

    if (!lang.commentMatcher) {
        // Matches lines that begin with a comment.
        lang.commentMatcher = new RegExp('^\\s*' + lang.symbol + '\\s?');
        // The dividing token we feed into Pygments, to delimit the boundaries between
        // sections.
        lang.dividerText = '\n' + lang.symbol + 'DIVIDER\n';
        // The mirror of `dividerText` that we expect Pygments to return. We can split
        // on this to recover the original sections.
        lang.dividerHtml = new RegExp('\\n*<span class="c1">' + lang.symbol + 'DIVIDER<\\/span>\\n*');
    }

    return lang;
};

// This utility function copies all JavaScript and CSS files that are part of the
// template to the output directory, thus preserving any links to these files in
// the template code.
Mint.copyStaticFiles = function() {
    fs.readdir(Mint.templateRoot, function(error, files) {
        files.forEach(function(file) {
            var ext = path.extname(file);
            if (ext == '.css' || ext == '.js') {
                var contents = fs.readFileSync(path.join(Mint.templateRoot, file));
                var dest = path.join(Mint.outputDir, file);
                fs.writeFileSync(dest, contents);
            }
        });
    });
};

// A small utility function that applies all properties of the `ext` object to the
// `base` object. Returns the modified base.
var apply = function(base, ext) {
    for (var p in ext) {
        if (ext.hasOwnProperty(p)) base[p] = ext[p];
    }
    return base;
};
