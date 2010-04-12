* Mint *

Mint is a small, fast documentation generator for [literate-style programming][lit]
that produces HTML files from your source code. In literate programming, the
emphasis is placed on writing clear documentation in ordinary human language
instead of writing terse half-sentences. The code is considered merely an
artifact of the documentation. Thus, in Mint the documentation is displayed
most prominently, right alongside the fragments of code to which each section
pertains.

Mint was inspired by (and borrows heavily from) [Docco][docco], the original quick-n-dirty
documentation generator by Jeremy Ashkenas, with the main difference being that
Mint is written in JavaScript instead of [CoffeeScript][cof]. Code comments are written
in [Markdown][md] and templates use [Mustache][mu].

### Installation

Mint has several dependencies, including [Node.js][node] and [Pygments][pyg]. Please consult
the websites of these projects for instructions on how to install them.

Once you've done that, get a copy of the code either by downloading the tarball
or cloning the source repository.

    $ git clone git://github.com/mjijackson/mint.git

Then set up a symlink to the Mint executable from somewhere in your $PATH.

    $ ln -s /path/to/bin/mint /usr/local/bin/mint

### Usage

Invoke the `mint` program from the command line with a list of files you would
like to generate documentation for. To specify the location for the output,
use the `-o` flag. For example, to generate documentation for all JavaScript
files in the `lib` directory and put the output in the `doc` directory, you
would do the following:

    $ mint -o doc lib/*.js

For more information, try `--help`.

    $ mint --help

Use the `node` program to run the Mint test suite.

    $ node test/mint.js

### Credits

Mint uses the following libraries to get the job done:

  - [Node.js][node]
  - [Pygments][pyg]
  - [markdown-js](http://github.com/evilstreak/markdown-js)
  - [optparse-js](http://github.com/jfd/optparse-js)
  - [Mu](http://github.com/raycmorgan/Mu)

[lit]: http://en.wikipedia.org/wiki/Literate_programming
[docco]: http://github.com/jashkenas/docco
[cof]: http://jashkenas.github.com/coffee-script/
[md]: http://daringfireball.net/projects/markdown/
[mu]: http://mustache.github.com/
[node]: http://nodejs.org/
[pyg]: http://pygments.org/
