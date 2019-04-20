define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // TODO: is the correct date January 1, 2000, 11:58:55.816 UTC?
    // https://en.wikipedia.org/wiki/Equinox_(celestial_coordinates)//J2000.0
    exports.J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    exports.dayInSeconds = 86400;
    exports.averageYearInDays = 365.24;
    function parse(str) {
        return new Date(str + 'T12:00:00Z');
    }
    exports.parse = parse;
    function addMilliseconds(date, ms) {
        return new Date(date.getTime() + ms);
    }
    exports.addMilliseconds = addMilliseconds;
    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    exports.addDays = addDays;
    function daysBetween(a, b) {
        return (a.getTime() - b.getTime()) / 1000 / exports.dayInSeconds;
    }
    exports.daysBetween = daysBetween;
    function centuriesBetween(a, b) {
        return (a.getTime() - b.getTime()) / 1000 / exports.dayInSeconds / exports.averageYearInDays / 100;
    }
    exports.centuriesBetween = centuriesBetween;
    // used to display periods in user-friendly format
    function secondsToDays(secs) {
        return secs / exports.dayInSeconds;
    }
    exports.secondsToDays = secondsToDays;
});
