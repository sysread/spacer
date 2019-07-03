var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
define(["require", "exports", "./data", "./game", "./common"], function (require, exports, data_1, game_1, t) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    data_1 = __importDefault(data_1);
    game_1 = __importDefault(game_1);
    t = __importStar(t);
    class FabricationQueue {
        constructor(opt) {
            const res = data_1.default.resources[opt.item];
            if (t.isCraft(res)) {
                this.item = opt.item;
                this.goal = opt.goal || 1;
                this.player = game_1.default.player;
                this.planet = game_1.default.here;
                this.recipe = res.recipe.materials;
                this.completed = 0;
                this.result = null;
                this.success = null;
                this.ignore_fab_health = false;
            }
            else {
                throw new Error('expected craftable resource');
            }
        }
        /*
         * Updates the goal and resets the queue state.
         */
        set_goal(new_goal) {
            this.goal = new_goal;
            this.completed = 0;
            this.result = null;
            this.ignore_fab_health = false;
        }
        /*
         * Returns the number of items remaining to craft to meet the goal.
         */
        get remaining() {
            return this.goal - this.completed;
        }
        /*
         * Returns the number of turns required to fabricate the next item in the
         * queue based on the availability of fabrication resources in the market.
         */
        get next_turns() {
            return this.planet.fabricationTime(this.item, 1);
        }
        /*
         * Returns the fee for fabricating the next item in the queue based on the
         * player's standing, faction tax, and the availability of fabrication
         * resources in the market.
         */
        get next_fee() {
            return this.planet.fabricationFee(this.item, 1, this.player);
        }
        /*
         * Returns true if the player has the materials required for the crafting
         * recipe.
         */
        get has_materials() {
            return this.player.canCraft(this.item) > 0;
        }
        /*
         * Returns true if the player has the money necessary to pay the fee for
         * crafting the next time in the queue.
         */
        get has_money() {
            return this.next_fee <= this.player.money;
        }
        /*
         * Returns true if the goal number of items to fabricate has been reached.
         */
        get goal_reached() {
            return this.completed == this.goal;
        }
        /*
         * Returns true if fabricator health is sufficient to fully cover the
         * fabrication of the batch.
         */
        get has_fab_resources() {
            return this.planet.hasFabricationResources(this.item, this.goal);
        }
        /*
         * Fabricates the next item in the queue. Removes the items required for
         * crafting the item from the player's ship, debits the fee from the
         * player's wallet, places the crafted item in the player's cargo hold,
         * runs the number of turns required. Does NOT save the game or refresh the
         * status bar.
         */
        fabricate() {
            if (!this.ignore_fab_health && !this.has_fab_resources) {
                this.result = 'Fabricator availability is temporarily depleted. You may continue, but it will cost more and take longer.';
                this.success = false;
                return false;
            }
            if (!this.has_materials) {
                this.result = 'Materials required for fabrication have been exhausted.';
                this.success = false;
                return false;
            }
            if (!this.has_money) {
                this.result = 'You do not have enough money to pay for the fabrication fee.';
                this.success = false;
                return false;
            }
            const turns = this.next_turns;
            const fee = this.next_fee;
            // Pay for use of the fabricator
            this.player.debit(fee);
            // Remove required materials from the player's cargo
            for (const mat of Object.keys(this.recipe)) {
                this.player.ship.unloadCargo(mat, this.recipe[mat] || 0);
            }
            // Use fabricators
            this.planet.fabricate(this.item);
            // Load crafted item onto player's ship
            this.player.ship.loadCargo(this.item, 1);
            // Run the game the specified number of turns
            game_1.default.turn(turns);
            // Increment the completed count
            ++this.completed;
            if (this.goal_reached) {
                this.result = `Successfully fabricated ${this.completed} units of ${this.item}. They have been placed in your ship's cargo hold.`;
                this.success = true;
                return false;
            }
            else {
                return true;
            }
        }
    }
    exports.FabricationQueue = FabricationQueue;
});
