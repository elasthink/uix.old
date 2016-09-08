var chai    = require('chai');
var expect  = chai.expect;
var url = require('../util/url');

describe('UIX Library Tests', function() {

    describe('URLs', function () {

        describe('URL Parsing', function () {
            it('Test 1: A simple url', function () {
                var r = url.parse('/this/is/a/path');
                expect(r).to.be.not.null;
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/a/path');

                expect(r).to.not.have.property('query');
                expect(r).to.not.have.property('hash');
            });

            it('Test 2: An url with query string', function () {
                var r = url.parse('/this/is/a/path?key1=val1');
                expect(r).to.be.not.null;
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/a/path');

                expect(r).to.have.property('query');
                expect(r.query).to.have.property('key1');
                expect(r.query.key1).to.be.equal('val1');

                expect(r).to.not.have.property('hash');
            });

            it('Test 3: An url with query string and fragment (hash)', function () {
                var r = url.parse('/this/is/a/path?key1=val1&key2=val2&key3=val3#thehash');
                expect(r).to.be.not.null;
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/a/path');

                expect(r).to.have.property('query');
                expect(r.query).to.have.property('key1');
                expect(r.query.key1).to.be.equal('val1');
                expect(r.query).to.have.property('key2');
                expect(r.query.key2).to.be.equal('val2');
                expect(r.query).to.have.property('key3');
                expect(r.query.key3).to.be.equal('val3');

                expect(r).to.have.property('hash');
                expect(r.hash).to.be.equal('thehash');
            });

            it('Test 4: An empty url with a query string with one parameter with multiple values and empty fragment', function () {
                var r = url.parse('?key1=val1&key1=val2&key1=val3#');
                expect(r).to.be.not.null;
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('');

                expect(r).to.have.property('query');
                expect(r.query).to.have.property('key1');
                expect(r.query.key1).to.be.a('array');
                expect(r.query.key1).to.have.length(3);
                expect(r.query.key1).to.deep.equal(['val1', 'val2', 'val3']);

                expect(r).to.have.property('hash');
                expect(r.hash).to.be.equal('');
            });
        }); // URL Parsing

        describe('URL Resolving', function () {

            it('Test 1: Relative to the current directory', function () {
                var url2 = url.resolve('readme.html', 'http://domain.com/this/is/a/path/index.html');
                expect(url2).to.be.equal('http://domain.com/this/is/a/path/readme.html');
            });

            it('Test 2: Relative to the root', function () {
                var url2 = url.resolve('/readme.html', 'http://domain.com/this/is/a/path/index.html');
                expect(url2).to.be.equal('http://domain.com/readme.html');
            });

            it('Test 3: Upper directory', function () {
                var url2 = url.resolve('../../readme.html', 'http://domain.com/this/is/a/path/index.html');
                expect(url2).to.be.equal('http://domain.com/this/is/readme.html');
            });

            it('Test 4: Protocol relative URL', function () {
                var url2 = url.resolve('//domain2.co/path/to/readme.html', 'https://domain.com/this/is/a/path/index.html');
                expect(url2).to.be.equal('https://domain2.co/path/to/readme.html');
            });

            it('Test 5: Absolute URL', function () {
                var url2 = url.resolve('https://domain2.co/path/to/readme.html', 'http://domain.com/this/is/a/path/index.html');
                expect(url2).to.be.equal('https://domain2.co/path/to/readme.html');
            });

        }); // URL Resolving

    }); // URLs

}); // UIX Library Tests