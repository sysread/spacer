var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "vue", "../game", "../data", "../system"], function (require, exports, vue_1, game_1, data_1, system_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    vue_1 = __importDefault(vue_1);
    game_1 = __importDefault(game_1);
    data_1 = __importDefault(data_1);
    system_1 = __importDefault(system_1);
    vue_1.default.mixin({
        data() {
            return {
                game: game_1.default,
            };
        },
        computed: {
            inDev() { return window.DEV; },
            data() { return data_1.default; },
            system() { return system_1.default; },
        },
    });
});
