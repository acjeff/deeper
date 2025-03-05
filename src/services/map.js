import * as ROT from "rot-js";
import WaterSimulation from "./water";

export default class MapService {
    constructor(tileSize = 32, chunkSize = 16, game) {
        this.game = game;
        this.game.chunkSize = 16;
        this.game.mapHeight = this.game.tileSize * 128;
        this.game.mapWidth = this.game.tileSize * 128;
        this.game.loadedChunks = new Map();
        this.game.grid = {};
        this.game.openSpaces = [];
        // this.waterSim = new WaterSimulation(this.game);
    }

    /** Generate the entire map but store it in chunks */
    generateMap() {
        const map = new ROT.Map.Cellular(this.game.mapWidth, this.game.mapHeight);

        // this.game.events.on('update', () => {
        //     this.waterSim.update();
        // });
        map.randomize(0.5);

        // Initialize grid storage
        for (let y = 0; y < this.game.mapHeight; y += this.game.chunkSize) {
            for (let x = 0; x < this.game.mapWidth; x += this.game.chunkSize) {
                let chunkKey = `${x}_${y}`;
                this.game.grid[chunkKey] = Array.from({length: this.game.chunkSize}, () =>
                    Array(this.game.chunkSize).fill(2) // Default soil
                );
            }
        }

        // Fill grid using cellular automata
        map.create((x, y, wall) => {
            let chunkX = Math.floor(x / this.game.chunkSize) * this.game.chunkSize;
            let chunkY = Math.floor(y / this.game.chunkSize) * this.game.chunkSize;
            let chunkKey = `${chunkX}_${chunkY}`;

            if (this.game.grid[chunkKey]) {
                let localX = x % this.game.chunkSize;
                let localY = y % this.game.chunkSize;
                this.game.grid[chunkKey][localY][localX] = wall ? 2 : 1;
            }
        });

        // console.log(this.game.grid, ' : this.game.grid');

        // Randomly place water
        window._randomElements.forEach(element => {
            this.setRandomElement(element.id, element.count, element.widthRange, element.heightRange, element.edgeNoiseChance);
        })

        // this.setRandomElement(window._tileTypes.stone, 100000);
    }

    getChunkKey(x, y) {
        let chunkX = Math.floor(x / this.game.chunkSize) * this.game.chunkSize;
        let chunkY = Math.floor(y / this.game.chunkSize) * this.game.chunkSize;
        return `${chunkX}_${chunkY}`;
    }

    /** Randomly places empty tiles (energy spaces) */
    setRandomElement(id, count, widthRange = [1, 1], heightRange = [1, 1], edgeNoiseChance = 0.3) {
        let self = this;
        let placed = 0;
        let filledPositions = new Set();
        let chunkKeys = Object.keys(this.game.grid); // Only use existing chunks

        function placeBlock(x, y) {
            let chunkKey = self.getChunkKey.call(this, x, y);
            if (!this.game.grid[chunkKey]) return false;

            let localX = x % this.game.chunkSize;
            let localY = y % this.game.chunkSize;
            this.game.grid[chunkKey][localY][localX] = id;
            filledPositions.add(`${x}_${y}`);
            return true;
        }

        while (placed < count) {
            // Pick a random **existing** chunk to start a cluster
            let chunkKey = chunkKeys[Math.floor(Math.random() * chunkKeys.length)];
            let [chunkX, chunkY] = chunkKey.split("_").map(Number);
            let startX = chunkX + Math.floor(Math.random() * this.game.chunkSize);
            let startY = chunkY + Math.floor(Math.random() * this.game.chunkSize);

            let key = `${startX}_${startY}`;
            if (filledPositions.has(key)) continue;

            // Generate a random aspect ratio based on width and height ranges
            let clusterWidth = Math.floor(Math.random() * (widthRange[1] - widthRange[0] + 1)) + widthRange[0];
            let clusterHeight = Math.floor(Math.random() * (heightRange[1] - heightRange[0] + 1)) + heightRange[0];

            let clusterSize = clusterWidth * clusterHeight;
            let aspectRatio = clusterWidth / clusterHeight; // Aspect ratio factor

            // Start growing from the center using weighted expansion
            let queue = [{x: startX, y: startY}];
            let added = 0;

            while (queue.length > 0 && placed < count && added < clusterSize) {
                let {x, y} = queue.shift();
                let posKey = `${x}_${y}`;

                if (!filledPositions.has(posKey) && placeBlock.call(this, x, y)) {
                    placed++;
                    added++;

                    // Weighted random expansion, prioritizing horizontal or vertical growth
                    let expandDirections = [];

                    // Adjust based on aspect ratio
                    if (Math.random() < aspectRatio) {
                        expandDirections.push({x: x + 1, y});
                        expandDirections.push({x: x - 1, y});
                    } else {
                        expandDirections.push({x, y: y + 1});
                        expandDirections.push({x, y: y - 1});
                    }

                    // Introduce diagonal noise occasionally
                    if (Math.random() < edgeNoiseChance) {
                        expandDirections.push({x: x + 1, y: y + 1});
                        expandDirections.push({x: x - 1, y: y - 1});
                    }

                    // Shuffle and add new expansion points
                    Phaser.Utils.Array.Shuffle(expandDirections);
                    for (let neighbor of expandDirections) {
                        let neighborKey = `${neighbor.x}_${neighbor.y}`;

                        if (!filledPositions.has(neighborKey) && Math.random() > edgeNoiseChance * 0.5) {
                            queue.push(neighbor);
                        }
                    }
                }
            }
        }
    }

    updateWorldBounds() {
        if (this.game.loadedChunks.size === 0) return; // Avoid errors if no chunks are loaded

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (let key of this.game.loadedChunks.keys()) {
            let [cx, cy] = key.split('_').map(Number);

            // Convert chunk coordinates to pixel coordinates
            let chunkStartX = cx * this.game.tileSize;
            let chunkStartY = cy * this.game.tileSize;
            let chunkEndX = chunkStartX + this.game.chunkSize * this.game.tileSize;
            let chunkEndY = chunkStartY + this.game.chunkSize * this.game.tileSize;

            // Track min/max bounds
            minX = Math.min(minX, chunkStartX);
            minY = Math.min(minY, chunkStartY);
            maxX = Math.max(maxX, chunkEndX);
            maxY = Math.max(maxY, chunkEndY);
        }

        // Set new bounds (width and height calculated from min/max)
        let worldWidth = maxX - minX;
        let worldHeight = maxY - minY;
        this.game.wx = minX;
        this.game.wy = minY;
        this.game.ww = worldWidth;
        this.game.wh = worldHeight;
        this.game.physics.world.setBounds(minX, minY, worldWidth, worldHeight);
    //     ADD SHADOW LAYER
    }


    /** Loads chunks around the player */
    loadChunks(playerX, playerY, renderDistance = window._renderDistance) {
        let chunkX = Math.floor(playerX / (this.game.chunkSize * this.game.tileSize)) * this.game.chunkSize;
        let chunkY = Math.floor(playerY / (this.game.chunkSize * this.game.tileSize)) * this.game.chunkSize;
        let newChunks = new Map(); // Keep existing chunks

        for (let dx = -renderDistance; dx <= renderDistance; dx++) {
            for (let dy = -renderDistance; dy <= renderDistance; dy++) {
                let cx = chunkX + dx * this.game.chunkSize;
                let cy = chunkY + dy * this.game.chunkSize;
                let chunkKey = `${cx}_${cy}`;

                if (this.game.grid[chunkKey]) {
                    // Only render if it's not already loaded
                    if (!this.game.loadedChunks.has(chunkKey)) {
                        this.renderChunk(cx, cy);
                    }
                    newChunks.set(chunkKey, this.game.grid[chunkKey]);
                }
            }
        }

        // Unload only chunks outside of the render distance
        for (let key of [...this.game.loadedChunks.keys()]) {
            if (!newChunks.has(key)) {
                this.unloadChunk(key);
                this.game.loadedChunks.delete(key); // Remove from loadedChunks
            }
        }

        this.game.loadedChunks = newChunks;
        this.updateWorldBounds();
        this.game.children.bringToTop(this.game.shadowGraphics);
    }

    getRandomWaterColor(baseColor, variation = 15) {
        // Extract RGB from base color
        let r = (baseColor >> 16) & 0xFF;
        let g = (baseColor >> 8) & 0xFF;
        let b = baseColor & 0xFF;

        // Apply small random variation (clamp to 0-255)
        r = Phaser.Math.Clamp(r + Phaser.Math.Between(-variation, variation), 0, 255);
        g = Phaser.Math.Clamp(g + Phaser.Math.Between(-variation, variation), 0, 255);
        b = Phaser.Math.Clamp(b + Phaser.Math.Between(-variation, variation), 0, 255);

        // Convert back to hex
        return (r << 16) | (g << 8) | b;
    }


    /** Render a chunk */
    renderChunk(cx, cy) {
        let chunkKey = `${cx}_${cy}`;

        // Prevent duplicate rendering of chunks
        if (!this.game.grid[chunkKey] || this.game.loadedChunks.has(chunkKey)) return;

        // console.log("Rendering chunk:", chunkKey);

        for (let y = 0; y < this.game.chunkSize; y++) {
            for (let x = 0; x < this.game.chunkSize; x++) {
                let worldX = (cx + x) * this.game.tileSize;
                let worldY = (cy + y) * this.game.tileSize;
                let tileType = this.game.grid[chunkKey][y][x];

                if (tileType === window._tileTypes.heavy_soil) {
                    // Place hard soil
                    let soil = this.game.add.rectangle(worldX, worldY, this.game.tileSize, this.game.tileSize, this.getRandomWaterColor(0x654321, 2));
                    soil.strength = 3;
                    this.game.soilGroup.add(soil);
                } else if (tileType === window._tileTypes.standard_soil) {
                    // Place regular soil
                    let soil = this.game.add.rectangle(worldX, worldY, this.game.tileSize, this.game.tileSize, this.getRandomWaterColor(0x724c25, 2));
                    soil.strength = 1;
                    this.game.soilGroup.add(soil);
                } else if (tileType === window._tileTypes.stone) {
                    // Place regular soil
                    let stone = this.game.add.rectangle(worldX, worldY, this.game.tileSize, this.game.tileSize, this.getRandomWaterColor(0x969696, 5));
                    stone.strength = 10;
                    this.game.soilGroup.add(stone);
                } else if (tileType === window._tileTypes.water) {
                    // Place Energy
                    let waterTile = this.game.add.rectangle(worldX, worldY, this.game.tileSize * 1.3, this.game.tileSize, 0x89CFF0);
                    waterTile.setAlpha(0.5)
                    this.game.physics.add.existing(waterTile);
                    const circleRadius = this.game.tileSize / 4;
                    waterTile.body.setCircle(circleRadius); // Make it circular
                    waterTile.body.setBounce(0.05); // Minimal bounce to prevent jittering
                    waterTile.body.setFriction(0); // Remove friction completely
                    waterTile.body.setDamping(true); // Enables damping to prevent infinite sliding
                    waterTile.body.setDrag(0, 0); // No drag for smoother movement
                    waterTile.body.setVelocityX(Phaser.Math.Between(-30, 30)); // Tiny random movement to start spreading
                    waterTile.body.setMass(0.01);
                    waterTile.body.allowGravity = true; // Gravity still pulls it down
                    waterTile.body.allowRotation = true; // Gravity still pulls it down
                    this.game.waterGroup.add(waterTile);
                    // this.game.physics.add.overlap(this.game.player, waterTile, this.game.swimming, null, this);
                } else {
                    this.game.openSpaces.push({x: worldX, y: worldY});
                }
            }
        }
    }

    /** Remove chunk from rendering */
    unloadChunk(chunkKey) {
        // console.log('Unloading chunk: ', chunkKey);
        this.game.entityChildren.forEach((entityGroup) => {
            entityGroup.children.each((tile) => {
                let {x, y} = tile;
                let chunkX = Math.floor(x / (this.game.chunkSize * this.game.tileSize)) * this.game.chunkSize;
                let chunkY = Math.floor(y / (this.game.chunkSize * this.game.tileSize)) * this.game.chunkSize;

                if (`${chunkX}_${chunkY}` === chunkKey) {
                    tile.destroy();
                }
            });
        })

        this.game.loadedChunks.delete(chunkKey); // Ensure removed chunks are cleared from memory
    }

}
