import * as ROT from "rot-js";
import {Breakable, Light, Empty, Liquid, Buttress} from "../classes/tiles";

export default class MapService {
    constructor(tileSize = 32, chunkSize = 16, game) {
        this.game = game;
        this.game.chunkSize = 6;
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
            const entryEvery = 10;
            const blockEvery = 9;

            if (this.game.grid[chunkKey]) {
                let localX = x % this.game.chunkSize;
                let localY = y % this.game.chunkSize;
                const EveryNinteenthDownAndOneSideOfColumn = ((x < window.chasmRange[0] || x > window.chasmRange[1]) && y % blockEvery === 0);
                if (y > window.aboveGround && (x < window.chasmRange[0] - 5 || x > window.chasmRange[1] + 5) && x !== 0 && x !== this.game.mapWidth - 1) {
                    this.game.grid[chunkKey][localY][localX] = wall ? {
                        ...window._tileTypes.soil
                    } : {
                        ...window._tileTypes.soil,
                        strength: 100
                    };
                } else if ((((x === window.chasmRange[0] || x === window.chasmRange[1]) && y > window.aboveGround && y % entryEvery !== 0) || (y === window.aboveGround + 1 && x > window.chasmRange[0] && x < window.chasmRange[1])) || (x === 0) || (x === this.game.mapWidth - 1)) {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...window._tileTypes.soil,
                        strength: 999999,
                        type: 2
                    }
                } else if (EveryNinteenthDownAndOneSideOfColumn && y > window.aboveGround) {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...window._tileTypes.soil,
                        strength: 999999,
                        type: 2
                    }
                } else if (((x < window.chasmRange[0] || x > window.chasmRange[1]) && y > window.aboveGround) && !EveryNinteenthDownAndOneSideOfColumn) {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...window._tileTypes.soil,
                        strength: 100
                    }
                } else if (((x === window.chasmRange[0] && y === window.aboveGround) || (x === window.chasmRange[1] && y === window.aboveGround) || (x === window.chasmRange[1] && y % entryEvery === 0) || (x === window.chasmRange[0] && y % entryEvery === 0)) && y > window.aboveGround - 1) {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...window._tileTypes.light,
                        radius: 100,
                        color: window.lightColors[1],
                        neon: false
                    }
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

        // worldX, worldY, tileType, cellItem
        // Update region: every cell in columns 40 through 48 gets updated to a new tile type.
        // this.updateRegion(156, 164, window._tileTypes.empty);

        // this.setRandomElement(window._tileTypes.stone, 100000);
    }

    updateRegion(xStart, xEnd, tileType) {
        // Loop over every cell column from xStart to xEnd.
        for (let cellX = xStart; cellX <= xEnd; cellX++) {
            // Loop over every row in the map.
            for (let cellY = 0; cellY < this.game.mapHeight; cellY++) {
                const worldX = cellX * this.game.tileSize;
                const worldY = cellY * this.game.tileSize;
                // Update the tile at the calculated world position.
                this.setTile(worldX, worldY, tileType);
            }
        }
    }

    getLocalCellFromWorldPosition(worldX, worldY) {
        const globalCellX = Math.floor(worldX / this.game.tileSize);
        const globalCellY = Math.floor(worldY / this.game.tileSize);

        const cellX = globalCellX % this.game.chunkSize;
        const cellY = globalCellY % this.game.chunkSize;

        return {cellX, cellY};
    }

    getCellFromWorldPosition(worldX, worldY) {
        const cellX = Math.floor(worldX / this.game.tileSize);
        const cellY = Math.floor(worldY / this.game.tileSize);
        return {cellX, cellY};
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
            if (y > window.aboveGround && (x < window.chasmRange[0] - 5 || x > window.chasmRange[1] + 5)) {
                let chunkKey = self.getChunkKey.call(this, x, y);
                if (!this.game.grid[chunkKey]) return false;

                let localX = x % this.game.chunkSize;
                let localY = y % this.game.chunkSize;
                this.game.grid[chunkKey][localY][localX] = element;
                filledPositions.add(`${x}_${y}`);
                return true;
            } else return false;
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
                if (y < 20 || (x > window.chasmRange[0] - 5 && x < window.chasmRange[1] + 5)) continue;
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

    areSquaresIntersecting(square1X, square1Y, square1Size, square2X, square2Y, square2Size) {
        return (
            square1X < square2X + square2Size &&
            square1X + square1Size > square2X &&
            square1Y < square2Y + square2Size &&
            square1Y + square1Size > square2Y
        );
    }

    getAdjacentBlocks(x, y) {
        const tileSize = this.game.tileSize;
        // Prepare an object to hold the adjacent blocks.
        const blocks = {
            left: null,
            above: null,
            right: null,
            below: null,
        };

        // Define the target positions for each direction.
        const targets = {
            left: {x: x - tileSize, y: y},
            above: {x: x, y: y - tileSize},
            right: {x: x + tileSize, y: y},
            below: {x: x, y: y + tileSize},
        };

        // Loop through each group in entityChildren.
        this.game.entityChildren.forEach(group => {
            // If the group has a 'children' property (like a Phaser Group)
            if (group?.children) {
                group.children.each(entity => {
                    for (const direction in targets) {
                        const target = targets[direction];
                        // Check if the entity is within half a tile of the target.
                        if (Math.abs(entity.x - target.x) < tileSize / 2 &&
                            Math.abs(entity.y - target.y) < tileSize / 2) {
                            blocks[direction] = entity;
                        }
                    }
                });
            } else if (Array.isArray(group)) {
                // If the group is simply an array of entities.
                group.forEach(entity => {
                    for (const direction in targets) {
                        const target = targets[direction];
                        if (Math.abs(entity.x - target.x) < tileSize / 2 &&
                            Math.abs(entity.y - target.y) < tileSize / 2) {
                            blocks[direction] = entity;
                        }
                    }
                });
            }
        });

        return blocks;
    }

    getEntitiesAround(x, y, radius) {
        let entities = [];

        this.game.entityChildren.forEach(group => {
            if (group?.children) {
                group.children.each(entity => {
                    if (this.isWithinRadius(entity.x, entity.y, x, y, radius)) {
                        entities.push(entity);
                    }
                });
            } else if (Array.isArray(group)) {
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

    setTile(worldX, worldY, tileType, cellItem, prefs) {

        let _cellItem = {
            chunkKey: this.game.mapService.getChunkKey(worldX, worldY),
            ...this.game.mapService.getLocalCellFromWorldPosition(worldX, worldY)
        }
        let {chunkKey, cellY, cellX} = cellItem ? cellItem : _cellItem;

        if (!this.game.grid[chunkKey] || !this.game.grid[chunkKey][cellY] || !this.game.grid[chunkKey][cellX]) return; // Ensure chunk exists

        this.game.grid[chunkKey][cellY][cellX] = {...tileType};
        if (cellItem?.tileRef) cellItem.tileRef.destroy(prefs);
        if (this.game.loadedChunks.has(chunkKey)) {
            return this.placeObject(tileType, worldX, worldY, {chunkKey, cellY, cellX});
        }
    }

    getTileAt(chunkKey, cellY, cellX) {
        return this.game.grid[chunkKey][cellY][cellX];
    }

    placeObject(tileType, worldX, worldY, cellDetails) {
        let newTile;
        window.requestAnimationFrame(() => {
            if (tileType.id === window._tileTypes.empty.id) {
                newTile = new Empty({
                    game: this.game,
                    cellDetails: cellDetails,
                    tileDetails: tileType,
                    worldX: worldX,
                    worldY: worldY
                });
            }
            if (tileType.id === window._tileTypes.soil.id) {
                newTile = new Breakable({
                    game: this.game,
                    cellDetails: cellDetails,
                    tileDetails: tileType,
                    worldX: worldX,
                    worldY: worldY
                });
            }
            if (tileType.id === window._tileTypes.liquid.id) {
                newTile = new Liquid({
                    game: this.game,
                    cellDetails: cellDetails,
                    tileDetails: tileType,
                    worldX: worldX,
                    worldY: worldY
                });
            }
            if (tileType.id === window._tileTypes.light.id) {
                newTile = new Light({
                    game: this.game,
                    cellDetails: cellDetails,
                    tileDetails: tileType,
                    worldX: worldX,
                    worldY: worldY
                })
            }
            if (tileType.id === window._tileTypes.buttress.id) {
                newTile = new Buttress({
                    game: this.game,
                    cellDetails: cellDetails,
                    tileDetails: tileType,
                    worldX: worldX,
                    worldY: worldY
                })
            }
        });
        return newTile;
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
            if (entityGroup?.children) {
                entityGroup.children.getArray().slice().forEach((tile) => {
                    if (!tile.active) return; // Skip already destroyed or inactive tiles
                    const {x, y} = tile;

                    if (
                        x >= chunkPixelX && x < chunkPixelX + chunkPixelSize &&
                        y >= chunkPixelY && y < chunkPixelY + chunkPixelSize
                    ) {
                        tile.tileRef.destroy();
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
                        tile.tileRef.destroy();
                    }
                });
            }
        });

        this.game.loadedChunks.delete(chunkKey);
    }

}