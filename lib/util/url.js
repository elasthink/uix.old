/**
 * @namespace
 */
var URL = {

    /**
     * ...
     * @param url
     * @return {{}}
     */
    parse: function(url) {
        var r = {};
        var match = /^([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/.exec(url);
        if (match) {
            r.pathname = match[1];
            if (match[2] !== undefined) {
                r.query = this.parseQuery(r.search = match[2]);
            }
            if (match[3] !== undefined) {
                r.hash = match[3];
            }
        }
        return r;
    },

    /**
     *
     */
    parseQuery: function(query) {
        var q = {};
        var s = query.split('&');
        for (var i = 0, p, k, v; i < s.length; i++) {
            p = s[i].split('=');
            k = p[0];
            v = (p.length > 1) ? p[1] : ''
            if (q[k] === undefined) {
                q[k] = v;
            } else {
                if (Array.isArray(q[k])) {
                    q[k].push(v);
                } else {
                    q[k] = [q[k], v];
                }
            }
        }
        return q;
    },

    /**
     *
     */
    formatQuery: function(data) {
        var params = [];
        for (var name in data) {
            if (data.hasOwnProperty(name)) {
                params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
            }
        }
        return params.join('&').replace(/%20/g, '+');
    },

    /**
     *
     */
    resolve: function(path, base) {
        // Absolute URL
        if (path.match(/^[a-z]*:\/\//)) {
            return path;
        }
        // Protocol relative URL
        if (path.indexOf('//') === 0) {
            return base.replace(/\/\/.*/, path)
        }
        // Upper directory
        if (path.indexOf('../') === 0) {
            return this.resolve(path.slice(3), base.replace(/\/[^\/]*$/, ''));
        }
        // Relative to the root
        if (path.indexOf('/') === 0) {
            var match = base.match(/(\w*:\/\/)?[^\/]*\//) || [base];
            return match[0] + path.slice(1);
        }
        // Relative to the current directory
        return base.replace(/\/[^\/]*$/, '') + '/' + path.replace(/^\.\//, '');
    }
};


// Module Exports
// =====================================================================================================================
if (typeof(module) !== 'undefined') {
    module.exports = URL;
}
