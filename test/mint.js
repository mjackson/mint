process.mixin(require('sys'));

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var Mint = require('./../lib/mint');

/* Utility functions to help with running the tests go here. */

var testFilesDir = path.join(__dirname, '_files');

function testFile(name) {
    return path.join(testFilesDir, name);
}

function onFinish() {
    puts('Done!');
}

function onError(error) {
    if (error) throw error;
}

function syncTests() {
    var tests = Array.prototype.slice.call(arguments);
    return tests.reduceRight(function(nextTest, test) {
        return function() {
            test.call(this, nextTest, onError);
        }
    }, onFinish);
}

/* Main test functions go here. */

function testStripDocs(callback, errback) {
    var files = [
        'docs-octothorpe-0.txt',
        'docs-octothorpe-1.txt',
        'docs-octothorpe-2.txt',
        'docs-single-0.txt',
        'docs-single-1.txt',
        'docs-single-2.txt',
        'docs-single-3.txt',
        'docs-single-4.txt',
        'docs-semicolon-0.txt',
        'docs-semicolon-1.txt',
        'docs-semicolon-2.txt',
        'docs-multi-0.txt',
        'docs-multi-1.txt',
        'docs-multi-2.txt',
        'docs-multi-3.txt',
        'docs-multi-4.txt',
        'docs-multi-5.txt',
        'docs-multi-6.txt',
        'docs-multi-7.txt',
        'docs-multi-8.txt'
    ];

    var delim = '\n\n', source, docs, expected;

    files.forEach(function(file) {
        puts('Testing Mint.stripDocs on ' + file);
        // Each source file should contain a comment as it may appear
        // in the source code, two new line characters, and then the
        // expected result. Strip the trailing newline from the expected
        // value to be sure they will match.
        source = fs.readFileSync(testFile(file)).split(delim);
        docs = source[0];
        expected = source.slice(1).join(delim).replace(/\n$/, '');
        assert.equal(expected, Mint.stripDocs(docs));
    });

    callback();
}

function testParse(callback, errback) {
    var files = {
        'parse-0.js': 'parse-0.json',
        'parse-1.js': 'parse-1.json'
    };

    for (var file in files) {
        puts('Testing Mint.parse on ' + file);
        var expected = JSON.parse(fs.readFileSync(testFile(files[file])));
        var sections = Mint.parseFile(testFile(file));
        assert.deepEqual(expected, sections);
    }

    callback();
}

/* Check the environment and kick off the tests. */

Mint.checkEnvironment(function() {
    var tests = syncTests(
        testStripDocs,
        testParse
    );

    tests();
});
