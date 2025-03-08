import * as ROT from "rot-js";
import {Soil, Light, Empty} from "../classes/tiles";

export default class MapService {
    constructor(tileSize = 32, chunkSize = 16, game) {
        this.game = game;
        this.game.chunkSize = 16;
        this.game.mapHeight = 1040;
        this.game.mapWidth = 320;
        this.game.loadedChunks = new Map();
        this.game.grid = this.game.grid || {};
        this.game.openSpaces = [];
        this.game.dustEmitter = this.game.add.particles(0, 0, 'dust', {
            lifespan: {min: 200, max: 500},
            speed: {min: 20, max: 50},
            scale: {start: 0.1, end: 0.1},
            alpha: {start: 0.5, end: 0},
            quantity: 100,
            emitting: false,
            blendMode: 'NORMAL'
        });
        this.game.dustEmitter.setDepth(9999);

        // this.waterSim = new WaterSimulation(this.game);

        // this.game.physics.world.setBounds(0, 0, this.game.mapWidth, this.game.mapHeight);

        this.layerCount = 7;
        this.layerHeight = Math.floor(this.game.mapHeight / this.layerCount);
    }

    getLayer(y) {
        return Math.floor(y / this.layerHeight);
    }

    generateMap() {
        let map = new ROT.Map.Cellular(this.game.mapWidth, this.game.mapHeight);

        map.randomize(0.5);

        for (let y = 0; y < this.game.mapHeight; y += this.game.chunkSize) {
            for (let x = 0; x < this.game.mapWidth; x += this.game.chunkSize) {
                let chunkKey = `${x}_${y}`;
                this.game.grid[chunkKey] = Array.from({length: this.game.chunkSize}, () =>
                    Array(this.game.chunkSize).fill({
                        ...window._tileTypes.soil
                    })
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
                if (y > window.aboveGround) {
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

    setRandomElement(element, count, widthRange = [1, 1], heightRange = [1, 1], edgeNoiseChance = 0.3, layerWeights = [1, 1, 1, 1, 1, 1, 1]) {
        let self = this;
        let placed = 0;
        let filledPositions = new Set();
        let chunkKeys = Object.keys(this.game.grid);

        function placeBlock(x, y) {
            if (y < 20) return false;
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
            if (startY < 20) continue;
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

    isWithinRadius(entityX, entityY, centerX, centerY, radius) {
        let dx = entityX - centerX;
        let dy = entityY - centerY;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
    }

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

    setTile(worldX, worldY, tileType, cellItem) {
        const {chunkKey, cellY, cellX} = cellItem;

        if (!this.game.grid[chunkKey]) return; // Ensure chunk exists

        this.game.grid[chunkKey][cellY][cellX] = tileType;

        cellItem.tileRef.destroy();

        this.placeObject(tileType, worldX, worldY, {chunkKey, cellY, cellX});

    }

    placeObject(tileType, worldX, worldY, cellDetails) {
        if (tileType.id === window._tileTypes.soil.id) {
            new Soil({
                game: this.game,
                cellDetails: cellDetails,
                tileDetails: tileType,
                worldX: worldX,
                worldY: worldY
            });
        }
        if (tileType.id === window._tileTypes.light.id) {
            new Light({
                game: this.game,
                cellDetails: cellDetails,
                tileDetails: tileType,
                worldX: worldX,
                worldY: worldY
            })
        }

    }

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

    unloadChunk(chunkKey) {
        const [chunkStartX, chunkStartY] = chunkKey.split('_').map(Number);
        const chunkPixelX = chunkStartX * this.game.tileSize;
        const chunkPixelY = chunkStartY * this.game.tileSize;
        const chunkPixelSize = this.game.chunkSize * this.game.tileSize;

        this.game.entityChildren.forEach((entityGroup) => {
            if (entityGroup.children) {
                entityGroup.children.getArray().slice().forEach((tile) => {
                    if (!tile.active) return; // Skip already destroyed or inactive tiles
                    const {x, y} = tile;

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
                    const {x, y} = tile;

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
