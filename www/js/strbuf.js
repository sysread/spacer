define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /*
     * v8 strings are limited to 12 bytes; longer strings are actually implemented
     * as ConsStrings. In order to generate very large strings quickly, it is then
     * important to observe that 12 byte boundary to prevent intermediate string
     * fragments from being generated as ConsStrings themselves.
     */
    const align = 12;
    function builder(initial) {
        let major = '';
        let minor = '';
        if (initial !== undefined) {
            major = initial;
        }
        return {
            append: function (str) {
                if (minor.length + str.length > align) {
                    major += minor;
                    minor = '';
                }
                minor += str;
                if (minor.length >= align) {
                    major += minor;
                    minor = '';
                }
            },
            getbuffer: function () {
                if (minor) {
                    major += minor;
                    minor = '';
                }
                return major;
            },
        };
    }
    exports.builder = builder;
});
