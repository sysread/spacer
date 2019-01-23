define(["require", "exports", "./common"], function (require, exports, common_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ucfirst(value) {
        return value.toString().replace(/\b([a-z])/g, (str) => str.toUpperCase());
    }
    exports.ucfirst = ucfirst;
    function shuffle(arr) {
        return arr.sort((a, b) => {
            return Math.random() > Math.random() ? 1 : -1;
        });
    }
    exports.shuffle = shuffle;
    function csn(num) {
        const sign = num < 0 ? '-' : '';
        num = Math.abs(num);
        const parts = [];
        const three = new RegExp(/(\d{3})$/);
        let [integer, decimal] = `${num}`.split('.', 2);
        while (three.test(integer)) {
            integer = integer.replace(three, (match) => { parts.unshift(match); return ''; });
        }
        if (integer) {
            parts.unshift(integer);
        }
        integer = parts.join(',');
        return decimal ? `${sign}${integer}.${decimal}` : `${sign}${integer}`;
    }
    exports.csn = csn;
    function pct(fraction, places) {
        const pct = R(fraction * 100, places);
        return pct + '%';
    }
    exports.pct = pct;
    function uniq(items, sep = ' ') {
        if (!(items instanceof Array)) {
            items = `${items}`.split(sep).filter((s) => { return s != ''; });
        }
        let set = new Set(items);
        let arr = [];
        set.forEach((val) => { arr.push(val); });
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
        const factor = Math.pow(10, places);
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
        const rand = Math.random();
        return rand <= pct;
    }
    exports.chance = chance;
    /*
     * "Fuzzes" a number, randomizing it by +/- pct%.
     */
    function fuzz(n, pct) {
        const low = n - (n * pct);
        const high = n + (n * pct);
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
    function resourceMap(dflt = 0, entries) {
        entries = entries || {};
        for (const item of common_1.resources) {
            if (!(item in entries)) {
                entries[item] = dflt;
            }
        }
        return entries;
    }
    exports.resourceMap = resourceMap;
    window.memo_stats = { hit: 0, miss: 0, clear: 0 };
    function memoized(opt) {
        return function (target, propertyKey, descriptor) {
            const orig = descriptor.value;
            const keyName = opt.key;
            const getKey = keyName == undefined
                ? (obj) => obj.constructor.name
                : (obj) => obj[keyName] || obj.constructor.name;
            let memo = {};
            let turns = opt.turns || getRandomInt(3, 12);
            descriptor.value = function () {
                if (window.game.turns % turns == 0) {
                    turns = opt.turns || getRandomInt(3, 12);
                    memo = {};
                    ++window.memo_stats.clear;
                }
                const key = JSON.stringify([getKey(this), arguments]);
                if (memo[key] == undefined) {
                    memo[key] = orig.apply(this, arguments);
                    ++window.memo_stats.miss;
                }
                else {
                    ++window.memo_stats.hit;
                }
                return memo[key];
            };
            return descriptor;
        };
    }
    exports.memoized = memoized;
    ;
});
