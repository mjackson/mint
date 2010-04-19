__Mint__ is a small, fast documentation generator for [literate-style programming][lit]
that produces HTML files from your source code. In literate programming, the
emphasis is placed on writing clear documentation in ordinary human language
instead of writing terse half-sentences. The code is considered merely an
artifact of the documentation. Thus, in Mint the documentation is displayed
most prominently, right alongside the fragments of code to which each section
pertains.

Mint was inspired by (and borrows heavily from) [Docco][docco], the original quick-n-dirty
literate documentation generator by [Jeremy Ashkenas][ashkenas]. However, Mint is written
in JavaScript instead of [CoffeeScript][coffee]. Code comments are written in [Markdown][markdown]
and templates use [Mustache][mustache].

### Installation

Mint has several dependencies, including [Node.js][node] and [Pygments][pygments]. Please consult
the websites of these projects for instructions on how to install them.

Once you have Node and Pygments installed, simply clone the repository and run
a `make && make install` from the project root.

    $ git clone git://github.com/mjijackson/mint.git
    $ cd mint
    $ make && make install

By default the Mint installer uses the `/usr/local` prefix. You can however
change this prefix to point to a different place on your system.

    $ sudo make install prefix=/usr

Uninstalling Mint is just as easy.

    $ make uninstall

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

  - [Node.js](http://nodejs.org/)
  - [Pygments](http://pygments.org/)
  - [markdown-js](http://github.com/evilstreak/markdown-js)
  - [Mu](http://github.com/raycmorgan/Mu)
  - [optparse-js](http://github.com/jfd/optparse-js)

[lit]: http://en.wikipedia.org/wiki/Literate_programming
[docco]: http://github.com/jashkenas/docco
[ashkenas]: http://github.com/jashkenas
[coffee]: http://coffeescript.org/
[markdown]: http://daringfireball.net/projects/markdown/
[mustache]: http://mustache.github.com/
[node]: http://nodejs.org/
[pygments]: http://pygments.org/
