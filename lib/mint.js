process.mixin(require('sys'));
var path = require('path');
var fs = require('fs');

var root = path.dirname(__dirname);
var Mu = require(path.join(root, 'vendor', 'Mu', 'lib', 'mu'));
var Markdown = require(path.join(root, 'vendor', 'markdown-js', 'lib', 'markdown'));

// The start of each Pygments highlight block.
var highlightStart = '<div class="highlight"><pre>';

// The end of each Pygments highlight block.
var highlightEnd = '</pre></div>';

// The paths to all the source files being processed.
var allFiles = [];

var Mint = {};

// The current version of Mint.
Mint.version = '0.1';

// The directory to use for the output.
Mint.outputDir = './';

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

Mint.languages = {
    '.coffee':  { name: 'coffee-script', symbol: '#' },
    '.js':      { name: 'javascript',    symbol: '//' },
    '.rb':      { name: 'ruby',          symbol: '#' }
};

Mint.go = function Mint_go(sourceFiles) {
    allFiles = sourceFiles;

    Mint.setup(function() {
        sourceFiles.forEach(function(file, index) {
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

// Make sure that Pygments is installed and that the output directory
// exists.
Mint.setup = function Mint_setup(callback) {
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
            Mint.compileLanguages();

            callback();
        });
    });
};

Mint.compileLanguages = function() {
    for (var ext in Mint.languages) {
        var lang = Mint.languages[ext];
        // Matches lines that begin with a comment.
        lang.commentMatcher = new RegExp('^\\s*' + lang.symbol + '\\s?');
        // The dividing token we feed into Pygments, to delimit the boundaries between
        // sections.
        lang.dividerText = '\n' + lang.symbol + 'DIVIDER\n';
        // The mirror of `dividerText` that we expect Pygments to return. We can split
        // on this to recover the original sections.
        lang.dividerHtml = new RegExp('\\n*<span class="c1">' + lang.symbol + 'DIVIDER<\\/span>\\n*');
    }
};

Mint.getLanguage = function Mint_getLanguage(file) {
    return Mint.languages[path.extname(file)];
};

// Parses the `source` code from the given file into *sections*, each of
// which consists of a comment and the code that followed it in the following
// form:
//
//     {
//         docsText: '',
//         codeText: ''
//     }
Mint.parse = function Mint_parse(file, source) {
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

// Given a `file` and its parsed *sections*, use [Pygments](http://pygments.org)
// and [Markdown](http://daringfireball.net/projects/markdown/) to format the code
// and comment, respectively, from each section. After this method executes, each
// section will have `docsHtml` and `codeHtml` attributes.
Mint.format = function Mint_format(file, sections, callback) {
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

Mint.output = function Mint_output(file, sections) {
    var title = path.basename(file);
    var dest = path.join(Mint.outputDir, path.basename(file, path.extname(file))) + '.html';
    var obj = { title: title, sections: sections, files: allFiles };
    Mint.generateHtml(obj, function(html) {
        fs.writeFile(dest, html);
    });
};

Mint.generateHtml = function Mint_generateHtml(obj, callback) {
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

Mint.copyStaticFiles = function Mint_copyStaticFiles() {
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

exports.Mint = Mint;
