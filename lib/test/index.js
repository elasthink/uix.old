var chai    = require('chai');
var expect  = chai.expect;
var URL = require('../util/url');

describe('UIX Library Tests', function() {

    describe('URLs', () => {

        describe('URL Parsing', () => {

            it('Absolute url', () => {
                var r = URL.parse('https://angel:teran@woords.com:808/this/is/the/path?key1=val1&key2=val2&key3=val3#test');
                expect(r).to.be.not.null;
                expect(r).to.be.not.empty;
                expect(r).to.have.property('scheme');
                expect(r.scheme).to.be.equal('https');
                expect(r).to.have.property('authority');
                expect(r.authority).to.be.equal('angel:teran@woords.com:808');
                expect(r).to.have.property('userinfo');
                expect(r.userinfo).to.be.equal('angel:teran');
                expect(r).to.have.property('host');
                expect(r.host).to.be.equal('woords.com');
                expect(r).to.have.property('port');
                expect(r.port).to.be.equal('808');
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/the/path');
                expect(r).to.have.property('query');
                expect(r.query).to.be.equal('key1=val1&key2=val2&key3=val3');
                expect(r).to.have.property('fragment');
                expect(r.fragment).to.be.equal('test');
            });

            it('Protocol-relative url', () => {
                var r = URL.parse('//angel:teran@woords.com:808/this/is/the/path?key1=val1&key2=val2&key3=val3#test');
                expect(r).to.be.not.null;
                expect(r).to.be.not.empty;
                expect(r).to.not.have.property('scheme');
                expect(r).to.have.property('authority');
                expect(r.authority).to.be.equal('angel:teran@woords.com:808');
                expect(r).to.have.property('userinfo');
                expect(r.userinfo).to.be.equal('angel:teran');
                expect(r).to.have.property('host');
                expect(r.host).to.be.equal('woords.com');
                expect(r).to.have.property('port');
                expect(r.port).to.be.equal('808');
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/the/path');
                expect(r).to.have.property('query');
                expect(r.query).to.be.equal('key1=val1&key2=val2&key3=val3');
                expect(r).to.have.property('fragment');
                expect(r.fragment).to.be.equal('test');
            });

            it('Root-relative url', () => {
                var r = URL.parse('/this/is/the/path?key1=val1&key2=val2&key3=val3#test');
                expect(r).to.be.not.null;
                expect(r).to.be.not.empty;
                expect(r).to.not.have.property('scheme');
                expect(r).to.not.have.property('authority');
                expect(r).to.not.have.property('userinfo');
                expect(r).to.not.have.property('host');
                expect(r).to.not.have.property('port');
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/the/path');
                expect(r).to.have.property('query');
                expect(r.query).to.be.equal('key1=val1&key2=val2&key3=val3');
                expect(r).to.have.property('fragment');
                expect(r.fragment).to.be.equal('test');
            });

            it('Parent-relative url', () => {
                var r = URL.parse('../../this/is/the/path?key1=val1&key2=val2&key3=val3#test');
                expect(r).to.be.not.null;
                expect(r).to.be.not.empty;
                expect(r).to.not.have.property('scheme');
                expect(r).to.not.have.property('authority');
                expect(r).to.not.have.property('userinfo');
                expect(r).to.not.have.property('host');
                expect(r).to.not.have.property('port');
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('../../this/is/the/path');
                expect(r).to.have.property('query');
                expect(r.query).to.be.equal('key1=val1&key2=val2&key3=val3');
                expect(r).to.have.property('fragment');
                expect(r.fragment).to.be.equal('test');
            });

            it('Simple path', () => {
                var r = URL.parse('/this/is/a/path');
                expect(r).to.be.not.null;
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/a/path');
                expect(r).to.not.have.property('query');
                expect(r).to.not.have.property('fragment');
            });

            it('Path with query string (one parameter)', () => {
                var r = URL.parse('/this/is/a/path?key1=val1');
                expect(r).to.be.not.null;
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/a/path');
                expect(r).to.have.property('query');
                expect(r.query).to.be.equal('key1=val1');
                expect(r).to.not.have.property('fragment');
            });

            it('Path with query string (multiple parameters)', () => {
                var r = URL.parse('/this/is/a/path?key1=val1&key2=val2&key3=val3');
                expect(r).to.be.not.null;
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/a/path');
                expect(r).to.have.property('query');
                expect(r.query).to.be.equal('key1=val1&key2=val2&key3=val3');
                expect(r).to.not.have.property('fragment');
            });

            it('Path with a query string and fragment', () => {
                var r = URL.parse('/this/is/a/path?key1=val1&key2=val2&key3=val3#test');
                expect(r).to.be.not.null;
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('/this/is/a/path');
                expect(r).to.have.property('query');
                expect(r.query).to.be.equal('key1=val1&key2=val2&key3=val3');
                expect(r).to.have.property('fragment');
                expect(r.fragment).to.be.equal('test');
            });

            it('Empty path with a query string with one parameter with multiple values and empty fragment', () => {
                var r = URL.parse('?key1=val1&key1=val2&key1=val3#');
                expect(r).to.be.not.null;
                expect(r).to.have.property('path');
                expect(r.path).to.be.equal('');
                expect(r).to.have.property('query');
                expect(r.query).to.be.equal('key1=val1&key1=val2&key1=val3');
                expect(r).to.have.property('fragment');
                expect(r.fragment).to.be.equal('');
            });

            it('Parsing a query string with one parameter', () => {
                var params = URL.parseQuery('key1=val1');
                expect(params).to.have.property('key1');
                expect(params.key1).to.be.equal('val1');
            });

            it('Parsing a query string with multiple parameters', () => {
                var params = URL.parseQuery('key1=val1&key2=val2&key3=val3');
                expect(params).to.have.property('key1');
                expect(params.key1).to.be.equal('val1');
                expect(params).to.have.property('key2');
                expect(params.key2).to.be.equal('val2');
                expect(params).to.have.property('key3');
                expect(params.key3).to.be.equal('val3');
            });

            it('Parsing a query string with multiple parameters with multiple values', () => {
                var params = URL.parseQuery('key1=val1&key1=val2&key2=val1&key1=val3&key2=val2');
                expect(params).to.have.property('key1');
                expect(params.key1).to.be.a('array');
                expect(params.key1).to.have.length(3);
                expect(params.key1).to.deep.equal(['val1', 'val2', 'val3']);
                expect(params).to.have.property('key2');
                expect(params.key2).to.be.a('array');
                expect(params.key2).to.have.length(2);
                expect(params.key2).to.deep.equal(['val1', 'val2']);
            });

        }); // URL Parsing

        describe('URL Resolving', () => {

            it('Absolute url', () => {
                var url = URL.resolve('https://woords.com/path/to/readme.html', 'https://woords.com');
                expect(url).to.be.equal('https://woords.com/path/to/readme.html');
            });

            it('Protocol-relative url', () => {
                var url = URL.resolve('//woords.com/path/to/readme.html', 'https://woords.com');
                expect(url).to.be.equal('https://woords.com/path/to/readme.html');
            });

            it('Root-relative url', () => {
                var url = URL.resolve('/about.html', 'https://woords.com/path/to/readme.html');
                expect(url).to.be.equal('https://woords.com/about.html');
            });

            it('Root-relative url (without scheme)', () => {
                var url = URL.resolve('/about.html', '//woords.com/path/to/readme.html');
                expect(url).to.be.equal('//woords.com/about.html');
            });

            it('Parent-relative url', () => {
                var url = URL.resolve('../about.html', 'https://woords.com/path/to/readme.html');
                expect(url).to.be.equal('https://woords.com/path/about.html');
            });

            it('Parent-relative url (two levels)', () => {
                var url = URL.resolve('../../about.html', 'https://woords.com/path/to/readme.html');
                expect(url).to.be.equal('https://woords.com/about.html');
            });

            it('Change query', () => {
                var url = URL.resolve('?key2=val2&key3=val3', 'https://woords.com/path/to/do?key1=val1#test');
                expect(url).to.be.equal('https://woords.com/path/to/do?key2=val2&key3=val3');
            });

            it('Change fragment', () => {
                var url = URL.resolve('#fixed', 'https://woords.com/path/to/do?key1=val1#test');
                expect(url).to.be.equal('https://woords.com/path/to/do?key1=val1#fixed');
            });

            it('Relative to the current directory', () => {
                var url = URL.resolve('about.html', 'https://woords.com/path/to/readme.html');
                expect(url).to.be.equal('https://woords.com/path/to/about.html');
            });

            it('Relative to the current directory (with ./)', () => {
                var url = URL.resolve('./about.html', 'https://woords.com/path/to/readme.html');
                expect(url).to.be.equal('https://woords.com/path/to/about.html');
            });
        }); // URL Resolving

        describe('URL Formatting', function () {

            it('Absolute URL', () => {
                var url = URL.format({
                    'scheme': 'https',
                    'userinfo': 'angel:teran',
                    'host': 'woords.com',
                    'port': '808',
                    'path': '/path/to/readme.html',
                    'query': 'key1=val1&key2=val2&key3=val3',
                    'fragment': 'testing'
                });
                expect(url).to.be.equal('https://angel:teran@woords.com:808/path/to/readme.html?key1=val1&key2=val2&key3=val3#testing');
            });

            it('Formatting query string', () => {
                var query = URL.formatQuery({
                    'foo': 'Esto es un parámetro',
                    'bar': 'Y esto es otro',
                    'baz': 'Y uno más'
                });
                expect(query).to.be.equal('foo=Esto+es+un+par%C3%A1metro&bar=Y+esto+es+otro&baz=Y+uno+m%C3%A1s');
            });

        }); // URL Formatting

    }); // URLs

}); // UIX Library Tests