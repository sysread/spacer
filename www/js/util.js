define(["require", "exports", "./common"], function (require, exports, common_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function shuffle(arr) {
        return arr.sort(function (a, b) {
            return Math.random() > Math.random() ? 1 : -1;
        });
    }
    exports.shuffle = shuffle;
    function csn(num) {
        var sign = num < 0 ? '-' : '';
        num = Math.abs(num);
        var parts = [];
        var three = new RegExp(/(\d{3})$/);
        var _a = ("" + num).split('.', 2), integer = _a[0], decimal = _a[1];
        while (three.test(integer)) {
            integer = integer.replace(three, function (match) { parts.unshift(match); return ''; });
        }
        if (integer) {
            parts.unshift(integer);
        }
        integer = parts.join(',');
        return decimal ? "" + sign + integer + "." + decimal : "" + sign + integer;
    }
    exports.csn = csn;
    function pct(fraction, places) {
        var pct = R(fraction * 100, places);
        return pct + '%';
    }
    exports.pct = pct;
    function uniq(items, sep) {
        if (sep === void 0) { sep = ' '; }
        if (!(items instanceof Array)) {
            items = ("" + items).split(sep).filter(function (s) { return s != ''; });
        }
        var set = new Set(items);
        var arr = [];
        set.forEach(function (val) { arr.push(val); });
        return arr.join(sep);
    }
    exports.uniq = uniq;
    /*
     * Rounds `n` to `places` decimal places.
     */
    function R(n, places) {
        if (places === undefined) {
            return Math.round(n);
        }
        var factor = Math.pow(10, places);
        return Math.round(n * factor) / factor;
    }
    exports.R = R;
    /*
     * Force n to be no less than min and no more than max.
     */
    function clamp(n, min, max) {
        if (min !== undefined)
            n = Math.max(min, n);
        if (max !== undefined)
            n = Math.min(max, n);
        return n;
    }
    exports.clamp = clamp;
    /*
     * Returns a random float between min and max.
     */
    function getRandomNum(min, max) {
        return (Math.random() * (max - min)) + min;
    }
    exports.getRandomNum = getRandomNum;
    /*
     * Returns a random integer no lower than min and lower than max.
     *
     * Direct copy pasta from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
     */
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
    exports.getRandomInt = getRandomInt;
    /*
     * Returns true or false for a given decimal chance between 0 and 1.
     */
    function chance(pct) {
        if (pct === 0)
            return false;
        var rand = Math.random();
        return rand <= pct;
    }
    exports.chance = chance;
    /*
     * "Fuzzes" a number, randomizing it by +/- pct%.
     */
    function fuzz(n, pct) {
        var low = n - (n * pct);
        var high = n + (n * pct);
        return getRandomNum(low, high);
    }
    exports.fuzz = fuzz;
    /*
     * Returns a random element from an array.
     */
    function oneOf(options) {
        return options[getRandomInt(0, options.length - 1)];
    }
    exports.oneOf = oneOf;
    function resourceMap(dflt, entries) {
        if (dflt === void 0) { dflt = 0; }
        entries = entries || {};
        for (var _i = 0, resources_1 = common_1.resources; _i < resources_1.length; _i++) {
            var item = resources_1[_i];
            if (!(item in entries)) {
                entries[item] = dflt;
            }
        }
        return entries;
    }
    exports.resourceMap = resourceMap;
});
