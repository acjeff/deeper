export default class WaterSimulation {
    constructor(game) {
        this.game = game;
        this.flowQueue = new Set(); // Tracks active moving water tiles
    }

    addWaterTile(waterTile) {
        this.flowQueue.add(waterTile);
    }

    update() {
        let updatedTiles = new Set();

        this.flowQueue.forEach(tile => {
            if (this.spreadWater(tile)) {
                updatedTiles.add(tile); // Keep in queue if still moving
            }
        });

        this.flowQueue = updatedTiles; // Remove stationary tiles
    }

    spreadWater(tile) {
        let self = this;
        let { x, y } = tile;
        let moved = false;

        function getChunkKey(x, y) {
            let chunkX = Math.floor(x / self.game.chunkSize) * self.game.chunkSize;
            let chunkY = Math.floor(y / self.game.chunkSize) * self.game.chunkSize;
            return `${chunkX}_${chunkY}`;
        }

        function isEmpty(x, y) {
            let chunkKey = getChunkKey(x, y);
            if (!self.game.grid[chunkKey]) return false;
            let chunk = self.game.grid[chunkKey];

            let localX = x % self.game.chunkSize;
            let localY = y % self.game.chunkSize;

            if (!chunk[localY] || chunk[localX] === undefined) return false;
            return chunk[localY][localX] === null; // Check if empty
        }

        // First, check if there is space directly to the left or right
        let directions = Phaser.Utils.Array.Shuffle([-1, 1]); // Random left or right first
        for (let dir of directions) {
            if (isEmpty(x + dir, y)) {
                // Move sideways
                tile.x += dir * this.game.tileSize;
                moved = true;
                break;
            }
        }

        return moved; // Return if the tile is still moving
    }
}