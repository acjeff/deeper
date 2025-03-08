import * as ROT from "rot-js";

export default class MapService {
    constructor(tileSize = 32, chunkSize = 16, game) {
        this.game = game;
        this.game.chunkSize = 16;
        this.game.mapHeight = 1040;
        this.game.mapWidth = 320;
        this.game.loadedChunks = new Map();
        this.game.grid = this.game.grid || {};
        this.game.openSpaces = [];
        // this.waterSim = new WaterSimulation(this.game);

        // this.game.physics.world.setBounds(0, 0, this.game.mapWidth, this.game.mapHeight);

        this.layerCount = 7;
        this.layerHeight = Math.floor(this.game.mapHeight / this.layerCount);
    }

    getLayer(y) {
        return Math.floor(y / this.layerHeight);
    }

    /** Generate the entire map but store it in chunks */
    generateMap(emptyTopRows = 10) {
        let map = new ROT.Map.Cellular(this.game.mapWidth, this.game.mapHeight);

        map.randomize(0.5);

        // Initialize grid storage
        for (let y = 0; y < this.game.mapHeight; y += this.game.chunkSize) {
            for (let x = 0; x < this.game.mapWidth; x += this.game.chunkSize) {
                let chunkKey = `${x}_${y}`;
                this.game.grid[chunkKey] = Array.from({length: this.game.chunkSize}, () =>
                    Array(this.game.chunkSize).fill({
                        ...window._tileTypes.soil
                    }) // Default soil
                );
            }
        }

        map.create((x, y, wall) => {
            let chunkX = Math.floor(x / this.game.chunkSize) * this.game.chunkSize;
            let chunkY = Math.floor(y / this.game.chunkSize) * this.game.chunkSize;
            let chunkKey = `${chunkX}_${chunkY}`;

            if (this.game.grid[chunkKey]) {
                let localX = x % this.game.chunkSize;
                let localY = y % this.game.chunkSize;
                if (y > 20) {
                    this.game.grid[chunkKey][localY][localX] = wall ? {
                        ...window._tileTypes.soil
                    } : {
                        ...window._tileTypes.soil,
                        strength: 100
                    };
                } else {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...window._tileTypes.empty
                    }
                }
            }
        });

        map._map = null; // Clear internal map data
        map = null; // Clear reference completely if map won't be reused

        // Randomly place water
        window._randomElements.forEach(element => {
            this.setRandomElement(element.tile, element.count, element.widthRange, element.heightRange, element.edgeNoiseChance, element.layerWeights);
        })


        // this.setRandomElement(window._tileTypes.stone, 100000);
    }

    getChunkKey(x, y) {
        let chunkX = Math.floor(x / this.game.chunkSize) * this.game.chunkSize;
        let chunkY = Math.floor(y / this.game.chunkSize) * this.game.chunkSize;
        return `${chunkX}_${chunkY}`;
    }

    /** Randomly places empty tiles (energy spaces) */
    setRandomElement(element, count, widthRange = [1, 1], heightRange = [1, 1], edgeNoiseChance = 0.3, layerWeights = [1, 1, 1, 1, 1, 1, 1]) {
        let self = this;
        let placed = 0;
        let filledPositions = new Set();
        let chunkKeys = Object.keys(this.game.grid);

        function placeBlock(x, y) {
            let chunkKey = self.getChunkKey.call(this, x, y);
            if (!this.game.grid[chunkKey]) return false;

            let localX = x % this.game.chunkSize;
            let localY = y % this.game.chunkSize;
            this.game.grid[chunkKey][localY][localX] = element;
            filledPositions.add(`${x}_${y}`);
            return true;
        }

        // Normalize layer weights
        let totalWeight = layerWeights.reduce((sum, w) => sum + w, 0);
        let weightedLayers = [];
        layerWeights.forEach((weight, index) => {
            for (let i = 0; i < weight; i++) {
                weightedLayers.push(index);
            }
        });

        while (placed < count) {
            let chunkKey = chunkKeys[Math.floor(Math.random() * chunkKeys.length)];
            let [chunkX, chunkY] = chunkKey.split("_").map(Number);

            // Choose a weighted layer
            let chosenLayer = weightedLayers[Math.floor(Math.random() * weightedLayers.length)];
            let startY = chosenLayer * this.layerHeight + Math.floor(Math.random() * this.layerHeight);
            let startX = chunkX + Math.floor(Math.random() * this.game.chunkSize);

            let key = `${startX}_${startY}`;
            if (filledPositions.has(key)) continue;

            let clusterWidth = Math.floor(Math.random() * (widthRange[1] - widthRange[0] + 1)) + widthRange[0];
            let clusterHeight = Math.floor(Math.random() * (heightRange[1] - heightRange[0] + 1)) + heightRange[0];

            let clusterSize = clusterWidth * clusterHeight;
            let aspectRatio = clusterWidth / clusterHeight;
            let queue = [{x: startX, y: startY}];
            let added = 0;

            while (queue.length > 0 && placed < count && added < clusterSize) {
                let {x, y} = queue.shift();
                let posKey = `${x}_${y}`;

                if (!filledPositions.has(posKey) && placeBlock.call(this, x, y)) {
                    placed++;
                    added++;

                    let expandDirections = [];

                    if (Math.random() < aspectRatio) {
                        expandDirections.push({x: x + 1, y});
                        expandDirections.push({x: x - 1, y});
                    } else {
                        expandDirections.push({x, y: y + 1});
                        expandDirections.push({x, y: y - 1});
                    }

                    if (Math.random() < edgeNoiseChance) {
                        expandDirections.push({x: x + 1, y: y + 1});
                        expandDirections.push({x: x - 1, y: y - 1});
                    }

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

    getClosestBlockInDirection(startX, startY, dirX, dirY, blocks) {
        let closestBlock = null;
        let closestT = Infinity;

        blocks.forEach(block => {
            let bx = block.x;
            let by = block.y;

            // Project the block's position onto the direction vector
            let t = ((bx - startX) * dirX + (by - startY) * dirY);

            if (t > 0) { // Ensure block is in front of the player
                let projectedX = startX + t * dirX;
                let projectedY = startY + t * dirY;
                let perpendicularDistance = Math.sqrt((bx - projectedX) ** 2 + (by - projectedY) ** 2);

                // If the block is close to the direction line and is the closest so far
                if (perpendicularDistance < this.game.playerSize / 2 && t < closestT) {
                    closestT = t;
                    closestBlock = block;
                }
            }
        });

        return closestBlock;
    }


    getEntitiesAround(x, y, radius) {
        let entities = [];

        // Iterate over each group in entityChildren
        this.game.entityChildren.forEach(group => {
            if (group.children) {
                // Handle Phaser groups (e.g., soilGroup, waterGroup)
                group.children.each(entity => {
                    if (this.isWithinRadius(entity.x, entity.y, x, y, radius)) {
                        entities.push(entity);
                    }
                });
            } else if (Array.isArray(group)) {
                // Handle arrays of entities (e.g., lightingManager.lights)
                group.forEach(entity => {
                    if (this.isWithinRadius(entity.x, entity.y, x, y, radius)) {
                        entities.push(entity);
                    }
                });
            }
        });

        return entities;
    }

// Helper function to check if an entity is within the given radius
    isWithinRadius(entityX, entityY, centerX, centerY, radius) {
        let dx = entityX - centerX;
        let dy = entityY - centerY;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
    }

    getBlocksAround(x, y, radius) {
        let blocks = [];

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                let nx = x + dx;
                let ny = y + dy;

                // Ensure we don't include the center block itself
                if (dx === 0 && dy === 0) continue;

                // Determine the chunk key and local coordinates within the chunk
                let chunkKey = this.getChunkKey(nx, ny);
                let localX = nx % this.game.chunkSize;
                let localY = ny % this.game.chunkSize;

                if (this.game.grid[chunkKey] && this.game.grid[chunkKey][localY]) {
                    let block = this.game.grid[chunkKey][localY][localX];
                    blocks.push({x: nx, y: ny, block});
                }
            }
        }

        return blocks;
    }

    getGlobalRelativePosition(goalPosition, currentPosition) {
        let x = Math.round((goalPosition.chunkX + goalPosition.x) - (currentPosition.chunkX + currentPosition.x));
        let y = Math.round((goalPosition.chunkY + goalPosition.y) - (currentPosition.chunkY + currentPosition.y));

        return {x, y};
    }

    // updateWorldBounds() {
    //     if (this.game.loadedChunks.size === 0) return; // Avoid errors if no chunks are loaded
    //
    //     let minX = Infinity, minY = Infinity;
    //     let maxX = -Infinity, maxY = -Infinity;
    //
    //     for (let key of this.game.loadedChunks.keys()) {
    //         let [cx, cy] = key.split('_').map(Number);
    //
    //         // Convert chunk coordinates to pixel coordinates
    //         let chunkStartX = cx * this.game.tileSize;
    //         let chunkStartY = cy * this.game.tileSize;
    //         let chunkEndX = chunkStartX + this.game.chunkSize * this.game.tileSize;
    //         let chunkEndY = chunkStartY + this.game.chunkSize * this.game.tileSize;
    //
    //         // Track min/max bounds
    //         minX = Math.min(minX, chunkStartX);
    //         minY = Math.min(minY, chunkStartY);
    //         maxX = Math.max(maxX, chunkEndX);
    //         maxY = Math.max(maxY, chunkEndY);
    //     }
    //
    //     // Set new bounds (width and height calculated from min/max)
    //     let worldWidth = maxX - minX;
    //     let worldHeight = maxY - minY;
    //     this.game.wx = minX;
    //     this.game.wy = minY;
    //     this.game.ww = worldWidth;
    //     this.game.wh = worldHeight;
    //     //     ADD SHADOW LAYER
    // }

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
        // this.updateWorldBounds();
        // this.game.physics.world.setBounds(0, 0, 10000, 10000);
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

    setTile(worldX, worldY, tileType, cellItem) {
        const {chunkKey, cellY, cellX} = cellItem;

        if (!this.game.grid[chunkKey]) return; // Ensure chunk exists

        this.game.grid[chunkKey][cellY][cellX] = tileType;

        // Remove existing Phaser objects at this position
        this.game.soilGroup.children.each((tile) => {
            if (tile.x === worldX && tile.y === worldY) {
                tile.destroy();
            }
        });
        this.game.waterGroup.children.each((tile) => {
            if (tile.x === worldX && tile.y === worldY) {
                tile.destroy();
            }
        });

        this.placeObject(tileType, worldX, worldY, {chunkKey, cellY, cellX});

    }

    darkenColor(hexColor, factor) {
        // Ensure the hex color is a valid 6-digit hex string
        hexColor = hexColor & 0xFFFFFF;

        // Extract RGB components
        let r = (hexColor >> 16) & 0xFF;
        let g = (hexColor >> 8) & 0xFF;
        let b = hexColor & 0xFF;

        // Normalize factor to be between 0 and 1 (assuming factor is between 0-100)
        let darkenFactor = Math.min(Math.max(factor / 100, 0), 1);

        // Apply darkening
        r = Math.round(r * (1 - darkenFactor));
        g = Math.round(g * (1 - darkenFactor));
        b = Math.round(b * (1 - darkenFactor));

        // Convert back to hex
        let darkenedHex = (r << 16) | (g << 8) | b;

        // Return as a hex string
        return `0x${darkenedHex.toString(16).padStart(6, '0')}`;
    }

    placeObject(tileType, worldX, worldY, cellDetails) {
        const {chunkKey, cellX, cellY} = cellDetails;
        let groupAddFuncs = [], object;
        const tileData = tileType;

        if (tileData.id === window._tileTypes.soil.id) {
            // Place hard soil
            groupAddFuncs.push((obj) => this.game.soilGroup.add(obj));
            object = this.game.add.rectangle(worldX, worldY, this.game.tileSize, this.game.tileSize, this.darkenColor(0x724c25, parseInt(tileData.strength) / 10));
            object.strength = tileData.strength / 100;
        }
        if (tileData.id === window._tileTypes.light.id) {
            this.game.lightingManager.addLight(worldX, worldY, 20, 0.8, this.game.glowStickCols[1], false, true);
        } else if (tileData.id === window._tileTypes.stone.id) {
            // Place regular soil
            groupAddFuncs.push((obj) => this.game.soilGroup.add(obj));
            object = this.game.add.rectangle(worldX, worldY, this.game.tileSize, this.game.tileSize, this.getRandomWaterColor(0x969696, 5));
            object.strength = 10;
        } else if (tileData.id === window._tileTypes.water.id) {
            object = this.game.add.rectangle(worldX, worldY, this.game.tileSize * 1.3, this.game.tileSize, 0x89CFF0);
            object.setAlpha(0.5);
            const circleRadius = this.game.tileSize / 4;

            // Add physics first so `object.body` exists
            this.game.add.existing(object);

            object.body.setCircle(circleRadius);
            object.body.setBounce(0.05);
            object.body.setFriction(0);
            object.body.setDamping(true);
            object.body.setDrag(0, 0);
            object.body.setVelocityX(Phaser.Math.Between(-30, 30));
            object.body.setMass(0.01);
            object.body.allowGravity = true;
            object.body.allowRotation = true;

            groupAddFuncs.push(obj => this.game.waterGroup.add(obj));
        }
        if (groupAddFuncs.length && object) {
            object.chunkKey = chunkKey;
            object.cellX = cellX;
            object.cellY = cellY;
            groupAddFuncs.forEach(func => {
                if (func) {
                    func(object)
                }
            });
        }

    }

    /** Render a chunk */
    renderChunk(cx, cy) {
        let chunkKey = `${cx}_${cy}`;

        // Prevent duplicate rendering of chunks
        if (!this.game.grid[chunkKey] || this.game.loadedChunks.has(chunkKey)) return;

        for (let y = 0; y < this.game.chunkSize; y++) {
            for (let x = 0; x < this.game.chunkSize; x++) {
                let worldX = (cx + x) * this.game.tileSize;
                let worldY = (cy + y) * this.game.tileSize;
                let tileType = this.game.grid[chunkKey][y][x];

                this.placeObject(tileType, worldX, worldY, {chunkKey: chunkKey, cellX: x, cellY: y});
            }
        }
    }

    /** Remove chunk from rendering */
    unloadChunk(chunkKey) {
        const [chunkStartX, chunkStartY] = chunkKey.split('_').map(Number);
        const chunkPixelX = chunkStartX * this.game.tileSize;
        const chunkPixelY = chunkStartY * this.game.tileSize;
        const chunkPixelSize = this.game.chunkSize * this.game.tileSize;

        this.game.entityChildren.forEach((entityGroup) => {
            if (entityGroup.children) {
                entityGroup.children.getArray().slice().forEach((tile) => {
                    if (!tile.active) return; // Skip already destroyed or inactive tiles
                    const { x, y } = tile;

                    if (
                        x >= chunkPixelX && x < chunkPixelX + chunkPixelSize &&
                        y >= chunkPixelY && y < chunkPixelY + chunkPixelSize
                    ) {
                        tile.destroy();
                    }
                });
            } else if (Array.isArray(entityGroup)) {
                entityGroup.slice().forEach((tile) => {
                    if (!tile.active) return; // Check again for active tiles
                    const { x, y } = tile;

                    if (
                        x >= chunkPixelX && x < chunkPixelX + chunkPixelSize &&
                        y >= chunkPixelY && y < chunkPixelY + chunkPixelSize
                    ) {
                        tile.destroy();
                    }
                });
            }
        });

        this.game.loadedChunks.delete(chunkKey);
    }


}
