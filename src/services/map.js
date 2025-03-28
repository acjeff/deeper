import * as ROT from "rot-js";
import {Breakable, Light, Empty, Liquid, Buttress, Rail, LiftControl} from "../classes/tiles";
import TilePool from "../classes/TilePool";

export default class MapService {
    constructor(tileSize = 32, chunkSize = 16, game) {
        this.game = game;
        this.game.chunkSize = 6;
        this.game.mapHeight = 1043;
        this.game.mapWidth = 322;
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
        this.emptyPool = new TilePool((params) => new Empty(params));
        this.breakablePool = new TilePool((params) => new Breakable(params));
        this.liftControlPool = new TilePool((params) => new LiftControl(params));
        this.liquidPool = new TilePool((params) => new Liquid(params));
        this.lightPool = new TilePool((params) => new Light(params));
        this.buttressPool = new TilePool((params) => new Buttress(params));
        this.railPool = new TilePool((params) => new Rail(params));
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
                        ...this.game.tileTypes.soil
                    })
                );
            }
        }
        map.create((x, y, wall) => {
            let chunkX = Math.floor(x / this.game.chunkSize) * this.game.chunkSize;
            let chunkY = Math.floor(y / this.game.chunkSize) * this.game.chunkSize;
            let chunkKey = `${chunkX}_${chunkY}`;
            const entryEvery = 30;
            const blockEvery = 35;
            // Make is so the wood goes al the way across
            if (this.game.grid[chunkKey]) {
                let localX = x % this.game.chunkSize;
                let localY = y % this.game.chunkSize;
                const EveryNinteenthDownAndOneSideOfColumn = ((x < this.game.chasmRange[0] || x > this.game.chasmRange[1]) && y % blockEvery === 0);
                if ((y > this.game.aboveGround && (x < this.game.chasmRange[0] - 5 || x > this.game.chasmRange[1] + 5) && x !== 0 && x !== this.game.mapWidth - 1) && !(EveryNinteenthDownAndOneSideOfColumn)) {
                    this.game.grid[chunkKey][localY][localX] = wall ? {
                        ...this.game.tileTypes.soil
                    } : {
                        ...this.game.tileTypes.soil,
                        strength: 100
                    };
                } else if ((((x === this.game.chasmRange[0] || x === this.game.chasmRange[1]) && y > this.game.aboveGround && y % entryEvery !== 0)) || (x === 0) || (x === this.game.mapWidth - 1)) {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...this.game.tileTypes.soil,
                        strength: 999999,
                        type: 2
                    }
                } else if (EveryNinteenthDownAndOneSideOfColumn && y > this.game.aboveGround) {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...this.game.tileTypes.soil,
                        strength: 999999,
                        type: 2
                    }
                } else if (((x < this.game.chasmRange[0] || x > this.game.chasmRange[1]) && y > this.game.aboveGround) && !EveryNinteenthDownAndOneSideOfColumn) {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...this.game.tileTypes.soil,
                        strength: 100
                    }
                } else if (((x === this.game.chasmRange[1] && y % entryEvery === 0) || (x === this.game.chasmRange[0] && y % entryEvery === 0)) && y > this.game.aboveGround + 1) {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...this.game.tileTypes.liftControl
                    }
                } else {
                    this.game.grid[chunkKey][localY][localX] = {
                        ...this.game.tileTypes.empty
                    }
                }
            }
        });

        map._map = null; // Clear internal map data
        map = null; // Clear reference completely if map won't be reused

        // Randomly place water
        this.game.randomElements.forEach(element => {
            this.setRandomElement(element.tile, element.count, element.widthRange, element.heightRange, element.edgeNoiseChance, element.layerWeights, element.columnWeights);
        })

        // worldX, worldY, tileType, cellItem
        // Update region: every cell in columns 40 through 48 gets updated to a new tile type.
        // this.updateRegion(156, 164, this.game.tileTypes.empty);

        // this.setRandomElement(this.game.tileTypes.stone, 100000);
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

    setRandomElement(
        element,
        count,
        widthRange = [1, 1],
        heightRange = [1, 1],
        edgeNoiseChance = 0.3,
        layerWeights = [1, 1, 1, 1, 1, 1, 1],
        columnWeights = [1, 1, 1, 1, 1, 1, 1, 1],
        debug = false // Set to true to log debug details
    ) {
        // Compute layer and column dimensions based on game dimensions and weight arrays.
        // Assumes that this.game.gameHeight and this.game.gameWidth are defined.
        const computedLayerHeight = this.game.mapHeight / layerWeights.length;
        const computedColumnWidth = this.game.mapWidth / columnWeights.length;

        let self = this;
        let placed = 0;
        let filledPositions = new Set();
        let iterations = 0;
        const maxIterations = 10000; // Safety counter

        // Build weighted arrays for layers and columns.
        let weightedLayers = [];
        layerWeights.forEach((weight, index) => {
            for (let i = 0; i < weight; i++) {
                weightedLayers.push(index);
            }
        });

        let weightedColumns = [];
        columnWeights.forEach((weight, index) => {
            for (let i = 0; i < weight; i++) {
                weightedColumns.push(index);
            }
        });

        function placeBlock(x, y) {
            if (debug) {
                console.log("Attempting to place block at:", x, y);
            }
            // Only place if y is above the ground threshold and x is outside the chasm.
            if (
                y > this.game.aboveGround &&
                (x < this.game.chasmRange[0] - 5 || x > this.game.chasmRange[1] + 5)
            ) {
                let chunkKey = self.getChunkKey.call(this, x, y);
                if (!this.game.grid[chunkKey]) {
                    if (debug) {
                        console.log("Invalid chunk:", chunkKey, "for x:", x, "y:", y);
                    }
                    return false;
                }
                let localX = x % this.game.chunkSize;
                let localY = y % this.game.chunkSize;
                this.game.grid[chunkKey][localY][localX] = element;
                filledPositions.add(`${x}_${y}`);
                if (debug) {
                    console.log("Placed block at:", x, y, "in chunk", chunkKey);
                }
                return true;
            } else {
                if (debug) {
                    console.log("Position", x, y, "fails block conditions.");
                }
                return false;
            }
        }

        // Outer loop with a safety counter.
        while (placed < count && iterations < maxIterations) {
            iterations++;

            // Choose a weighted layer and compute a random y coordinate within that layer.
            let chosenLayer = weightedLayers[Math.floor(Math.random() * weightedLayers.length)];
            let startY = chosenLayer * computedLayerHeight + Math.floor(Math.random() * computedLayerHeight);

            // Choose a weighted column and compute a random x coordinate within that column.
            let chosenColumn = weightedColumns[Math.floor(Math.random() * weightedColumns.length)];
            let startX = chosenColumn * computedColumnWidth + Math.floor(Math.random() * computedColumnWidth);

            // Validate that the computed starting position maps to a valid chunk.
            let chunkKey = self.getChunkKey.call(this, startX, startY);
            if (!this.game.grid[chunkKey]) {
                if (debug) {
                    console.log("Skipping invalid starting chunk:", chunkKey, "at", startX, startY);
                }
                continue;
            }

            let key = `${startX}_${startY}`;
            if (filledPositions.has(key)) {
                if (debug) {
                    console.log("Skipping already filled position:", key);
                }
                continue;
            }

            // Determine cluster dimensions.
            let clusterWidth = Math.floor(Math.random() * (widthRange[1] - widthRange[0] + 1)) + widthRange[0];
            let clusterHeight = Math.floor(Math.random() * (heightRange[1] - heightRange[0] + 1)) + heightRange[0];
            let clusterSize = clusterWidth * clusterHeight;
            let aspectRatio = clusterWidth / clusterHeight;
            let queue = [{x: startX, y: startY}];
            let added = 0;

            while (queue.length > 0 && placed < count && added < clusterSize) {
                let {x, y} = queue.shift();
                // Skip positions below threshold or inside the chasm.
                if (y < 20 || (x > this.game.chasmRange[0] - 5 && x < this.game.chasmRange[1] + 5))
                    continue;
                let posKey = `${x}_${y}`;
                if (!filledPositions.has(posKey) && placeBlock.call(this, x, y)) {
                    placed++;
                    added++;

                    let expandDirections = [];
                    // Expand preferentially in X or Y based on the aspect ratio.
                    if (Math.random() < aspectRatio) {
                        expandDirections.push({x: x + 1, y});
                        expandDirections.push({x: x - 1, y});
                    } else {
                        expandDirections.push({x, y: y + 1});
                        expandDirections.push({x, y: y - 1});
                    }
                    // Optionally add diagonal expansion.
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

        if (iterations >= maxIterations) {
            console.warn("Max iterations reached without placing all blocks. Placed:", placed, "of", count);
        } else if (debug) {
            console.log("Finished placing blocks. Total placed:", placed);
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

    loadChunks(playerX, playerY, renderDistance = this.game.renderDistance) {
        requestAnimationFrame(() => {
            const chunkSizeInPixels = this.game.chunkSize * this.game.tileSize;
            const baseChunkX = Math.floor(playerX / chunkSizeInPixels) * this.game.chunkSize;
            const baseChunkY = Math.floor(playerY / chunkSizeInPixels) * this.game.chunkSize;
            let newChunks = new Map();

            for (let dx = -renderDistance; dx <= renderDistance; dx++) {
                for (let dy = -renderDistance; dy <= renderDistance; dy++) {
                    const cx = baseChunkX + dx * this.game.chunkSize;
                    const cy = baseChunkY + dy * this.game.chunkSize;
                    const chunkKey = `${cx}_${cy}`;
                    if (this.game.grid[chunkKey]) {
                        if (!this.game.loadedChunks.has(chunkKey)) {
                            this.renderChunk(cx, cy);
                        }
                        newChunks.set(chunkKey, this.game.grid[chunkKey]);
                    }
                }
            }

            // Unload chunks that are no longer within the render distance
            this.game.loadedChunks.forEach((grid, key) => {
                if (!newChunks.has(key)) {
                    this.unloadChunk(key);
                    this.game.loadedChunks.delete(key);
                }
            });

            this.game.loadedChunks = newChunks;
            this.game.children.bringToTop(this.game.shadowGraphics);
        });
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
            return this.placeObject(tileType, worldX, worldY, {chunkKey, cellY, cellX}, prefs);
        }
    }

    getTileAt(chunkKey, cellY, cellX) {
        return this.game.grid[chunkKey][cellY][cellX];
    }

    placeObject(tileType, worldX, worldY, cellDetails, prefs) {
        let newTile;
        // window.requestAnimationFrame(() => {
        const params = {
            game: this.game,
            cellDetails: cellDetails,
            tileDetails: tileType,
            worldX: worldX,
            worldY: worldY,
            prefs: prefs
        };

        if (tileType.id === this.game.tileTypes.empty.id) {
            newTile = this.emptyPool.acquire(params);
        }
        if (tileType.id === this.game.tileTypes.soil.id) {
            newTile = this.breakablePool.acquire(params);
        }
        if (tileType.id === this.game.tileTypes.liquid.id) {
            newTile = this.liquidPool.acquire(params);
        }
        if (tileType.id === this.game.tileTypes.light.id) {
            newTile = this.lightPool.acquire(params);
        }
        if (tileType.id === this.game.tileTypes.buttress.id) {
            newTile = this.buttressPool.acquire(params);
        }
        if (tileType.id === this.game.tileTypes.rail.id) {
            newTile = this.railPool.acquire(params);
        }
        if (tileType.id === this.game.tileTypes.liftControl.id) {
            newTile = this.liftControlPool.acquire(params);
        }
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
                        tile.tileRef.destroy({preserveAttached: true});
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