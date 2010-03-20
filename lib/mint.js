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

var PARSE_SLASHSLASH = 1,
    PARSE_OCTOTHORP  = 1 << 1,
    PARSE_SEMICOLON  = 1 << 2,
    PARSE_SLASHSTAR  = 1 << 3;

var parseFlags = {
    '.as'       : PARSE_SLASHSLASH | PARSE_SLASHSTAR,
    '.c'        : PARSE_SLASHSTAR,
    '.cc'       : PARSE_SLASHSLASH | PARSE_SLASHSTAR,
    '.coffee'   : PARSE_OCTOTHORP,
    '.conf'     : PARSE_OCTOTHORP,
    '.css'      : PARSE_SLASHSTAR,
    '.ini'      : PARSE_SEMICOLON,
    '.java'     : PARSE_SLASHSLASH | PARSE_SLASHSTAR,
    '.js'       : PARSE_SLASHSLASH | PARSE_SLASHSTAR,
    '.m'        : PARSE_SLASHSLASH | PARSE_SLASHSTAR,
    '.php'      : PARSE_SLASHSLASH | PARSE_SLASHSTAR,
    '.py'       : PARSE_OCTOTHORP,
    '.rb'       : PARSE_OCTOTHORP
};

// Properties
// ----------

// The current version of Mint.
Mint.version = '0.2';

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

Mint.templateRoot = path.join(root, 'template');

// Main Functions
// --------------

// We need to make sure all necessary dependencies are installed. If not, we
// should fail here and let the user know.
Mint.checkEnvironment = function Mint_checkEnvironment(callback) {
    exec('pygmentize', function(error, stdout, stderr) {
        if (error) {
            puts('No pygmentize found. Try `sudo easy_install pygments`');
            process.exit(1);
        }
        callback();
    });
}

// The main point of entry for an external program, this function takes an
// array of files that are to be used in the documentation. By the time
// this function is called, all properties should already be set.
Mint.go = function Mint_go(sourceFiles) {
    allFiles = sourceFiles;

    path.exists(Mint.outputDir, function(exists) {
        if (!exists) fs.mkdirSync(Mint.outputDir, 0755);

        sourceFiles.forEach(function(file) {
            Mint.getLexer(file, function(lexer) {
                var sections = Mint.parseFile(file);
                Mint.format(lexer, sections, function() {
                    Mint.output(file, sections);
                });
            });
        });

        Mint.copyStaticFiles();
    });
}

// This function simply wraps a system call to `pygmentize -N` and retrieves
// the name of the lexer that Pygments will use to parse a given file. In the
// future, this may be overridden on a per-file/project basis in case Pygments
// isn't able to correctly guess the lexer type for a given file.
Mint.getLexer = function Mint_getLexer(file, callback) {
    exec('pygmentize -N ' + file, function(error, stdout, stderr) {
        if (error) throw error;
        var lexer = stdout.replace(/\s*$/, '');
        callback(lexer);
    });
}

Mint.stripDocs = function Mint_stripDocs(doc) {
    if (doc.match(/^\s*\/\//)) {
        return stripSymbol(doc, '\\/\\/');
    } else if (doc.match(/^\s*#/)) {
        return stripSymbol(doc, '#');
    } else if (doc.match(/^\s*;/)) {
        return stripSymbol(doc, ';');
    } else if (doc.match(/^\s*\/\*/)) {
        // Strip all preceeding stars and whitespace except for the last one.
        doc = doc.replace(/^\s*\/[\*\s\n]*\*/, '*');
        // Strip all trailing stars and whitespace.
        doc = doc.replace(/\s*\*+\/\s*$/, '');
        return stripSymbol(doc, '\\*');
    }

    // We don't recognize this comment format.
    return doc;
}

function stripSymbol(doc, symbol) {
    var indentRe = new RegExp('^\\s*' + symbol + '( *)'),
        lines = splitLines(doc),
        stripped = [],
        lineRe,
        match;

    lines.forEach(function(line, index) {
        // The indent to use for the entire block takes its queue from
        // the indent of the first line. Subsequent lines in the same block
        // may have a smaller indent, but if the indent is greater it should
        // be preserved.
        if (!lineRe) {
            match = line.match(indentRe);
            if (match) {
                var indent = match[1].length;
                lineRe = new RegExp('^\\s*' + symbol + ' {0,' + indent + '}');
            }
        }
        if (lineRe && line.match(lineRe)) {
            stripped.push(line.replace(lineRe, ''));
        }
    });

    return stripped.join('');
}

Mint.parseFile = function Mint_parseFile(file) {
    var code = fs.readFileSync(file),
        flags = parseFlags[path.extname(file)];

    if (!flags) {
        flags = PARSE_OCTOTHORP;
    }

    return Mint.parse(code, flags);
}

// Here we parse the `source` code from the given file into *sections*, each of
// which consists of a comment and the code that followed it in the following
// form:
//
//     {
//         docs: '',
//         code: ''
//     }
Mint.parse = function Mint_parse(code, flags) {
    var sections = [],
        comments = [],
        lines = splitLines(code);

    var commentsAlreadyContain = function(index) {
        return comments.some(function(c) {
            return c[0] <= index && (c[0] + c[1]) > index;
        });
    }

    if (flags & PARSE_SLASHSLASH) {
        comments = comments.concat(parseSingle(lines, /^\s*\/\/(.|\n)*$/));
    }
    if (flags & PARSE_OCTOTHORP) {
        comments = comments.concat(parseSingle(lines, /^\s*#(.|\n)*$/));
    }
    if (flags & PARSE_SEMICOLON) {
        comments = comments.concat(parseSingle(lines, /^\s*;(.|\n)*$/));
    }
    if (flags & PARSE_SLASHSTAR) {
        for (var index = 0, len = lines.length; index < len; ++index) {
            if ((/^\s*\/\*/).test(lines[index]) && !commentsAlreadyContain(index)) {
                comments.push([index, 1]);
                while (!(/\*\//).test(lines[index])) {
                    comments[comments.length - 1][1] += 1;
                    index++;
                }
            }
        }
    }

    comments = comments.sort(function(a, b) {
        if (a[0] > b[0]) return 1;
        if (a[0] < b[0]) return -1;
        return 0; // This should never happen!
    });

    var codeLines;
    comments.forEach(function(c, i) {
        if (comments[i + 1]) {
            codeLines = lines.slice(c[0] + c[1], comments[i + 1][0]);
        } else {
            codeLines = lines.splice(c[0] + c[1]);
        }

        sections.push({
            line: c[0],
            docs: lines.slice(c[0], c[0] + c[1]).join(''),
            code: codeLines.join('')
        });
    });

    return sections;
}

function parseSingle(lines, regex) {
    var comments = [],
        lastCommentLine;

    lines.forEach(function(line, index) {
        if (line.match(regex)) {
            if (lastCommentLine == index - 1) {
                comments[comments.length - 1][1] += 1;
            } else {
                comments.push([index, 1]);
            }

            lastCommentLine = index;
        }
    });

    return comments;
}

// This function expects the name of a file and its parsed *sections* (see
// `Mint.parse`). Document text is run through Markdown and code is run
// through Pygments here. After this method executes, each section will
// have `docsHtml` and `codeHtml` attributes containing the result of these
// operations.
Mint.format = function Mint_format(lexer, sections, callback) {
    var output = '';
    var child = process.createChildProcess('pygmentize', ['-l', lexer, '-f', 'html']);
    child.addListener('error', function(error) {
        if (error) process.stdio.writeError(error);
    });
    child.addListener('output', function(data) {
        if (data) output += data;
    });
    child.addListener('exit', function() {
        // Strip the wrapper <div> that Pygments inserts.
        output = output.replace(highlightStart, '').replace(highlightEnd, '');
        var lines = output.split('\n'), codeLines, codeHtml, currentLine = 0;
        sections.forEach(function(section, index) {
            // Strip all comment characters from the docs and format them using Markdown.
            section.docsHtml = Markdown.toHTML(Mint.stripDocs(section.docs));
            // Pygments preserves newlines when formatting code, so we can use the number
            // of newline characters present in a given block to extract the formatted
            // result from the HTML output. As we go, keep track of our current position
            // in the output in `currentLine` so we can extract from there on subsequent
            // sections.
            codeLines = substrCount(section.code, '\n');
            codeHtml = lines.slice(currentLine, currentLine + codeLines).join('\n');
            section.codeHtml = highlightStart + codeHtml + highlightEnd;
            currentLine += codeLines;
        });
        callback();
    });
    child.write(sections.map(function(s) { return s.code }).join(''));
    child.close();
}

// Uses the given `obj` as data for the default template. This may be expanded
// in the future to support multiple template names for a given template.
Mint.render = function Mint_render(obj, callback) {
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
}

// Given a file and its formatted *sections*, produce an HTML file in the output
// directory that contains the result of running the data through the template (see
// above).
Mint.output = function Mint_output(file, sections) {
    var title = path.basename(file);
    var dest = path.join(Mint.outputDir, path.basename(file, path.extname(file))) + '.html';
    sections.forEach(function(s, i) { s.num = i; });
    var obj = { title: title, sections: sections, files: allFiles };
    Mint.render(obj, function(html) {
        fs.writeFile(dest, html);
    });
}

// This function copies all JavaScript and CSS files that are part of the
// template to the output directory, thus preserving any links to these files
// in the template code.
Mint.copyStaticFiles = function Mint_copyStaticFiles() {
    fs.readdir(Mint.templateRoot, function(error, files) {
        if (error) throw error;
        files.forEach(function(file) {
            var ext = path.extname(file);
            if (ext == '.css' || ext == '.js') {
                var contents = fs.readFileSync(path.join(Mint.templateRoot, file));
                var dest = path.join(Mint.outputDir, file);
                fs.writeFileSync(dest, contents);
            }
        });
    });
}

// Utility Functions
// -----------------

function splitLines(str) {
    var lines = str.split('\n');
    return lines.slice(0, -1).map(function(line) {
        return line + '\n';
    }).concat(lines.slice(-1));
}

function substrCount(str, substr) {
    return str.split(substr).length - 1;
}
