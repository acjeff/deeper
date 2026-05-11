import * as ROT from "rot-js";
import {Breakable, Light, Empty, Liquid, Buttress, Rail, LiftControl, Tree} from "../classes/tiles";
import TilePool from "../classes/TilePool";
import TileTextureAtlas from "./tileTextureAtlas";

// Biomes spread across the map width — each is a soft-weighted breed
// preference, not a hard boundary, so neighbouring zones blend into each
// other. The pools are picked with replacement to give the dominant breed
// roughly half the trees in the band.
const TREE_BIOMES = [
    {label: 'temperate-east',  weights: [['oak', 5], ['maple', 3], ['birch', 2]]},
    {label: 'conifer',         weights: [['pine', 6], ['birch', 3], ['oak', 1]]},
    {label: 'birch-grove',     weights: [['birch', 5], ['oak', 3], ['willow', 1]]},
    {label: 'mixed-warm',      weights: [['oak', 4], ['willow', 3], ['maple', 3]]},
    {label: 'highland-pine',   weights: [['pine', 5], ['birch', 4], ['maple', 1]]},
];

const MATURITY_WEIGHTS = [
    ['sapling', 0.13],
    ['young',   0.24],
    ['mature',  0.50],
    ['ancient', 0.13],
];

function pickWeighted(weighted) {
    let total = 0;
    for (const [, w] of weighted) total += w;
    let roll = Math.random() * total;
    for (const [value, w] of weighted) {
        roll -= w;
        if (roll <= 0) return value;
    }
    return weighted[weighted.length - 1][0];
}

// Cheap 1D smooth value noise. Seeded so the same map regenerates an
// identical skyline when needed; multiple octaves give rolling hills with
// finer-grained variation layered on top.
function hash1D(i, seed) {
    const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return s - Math.floor(s);
}

function valueNoise1D(x, seed) {
    const i = Math.floor(x);
    const t = x - i;
    const a = hash1D(i, seed);
    const b = hash1D(i + 1, seed);
    const ts = t * t * (3 - 2 * t);
    return a + (b - a) * ts;
}

function fbm1D(x, seed, octaves = 4) {
    let total = 0, amp = 1, freq = 1, maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
        total += valueNoise1D(x * freq, seed + i * 17.31) * amp;
        maxAmp += amp;
        amp *= 0.5;
        freq *= 2;
    }
    return total / maxAmp;
}

export default class MapService {
    constructor(tileSize = 32, chunkSize = 16, game) {
        this.game = game;
        this.game.chunkSize = 6;
        this.game.mapHeight = 1043;
        this.game.mapWidth = 322;
        this.game.loadedChunks = new Map();
        this.game.grid = this.game.grid || {};
        // Spatial index: spriteIndex[chunkKey][localY][localX] → Phaser sprite.
        // Populated in placeObject, cleared in unloadChunk. Lets
        // getAdjacentBlocks/refreshNeighborEdges do O(1) neighbour lookups
        // instead of scanning every entity group's children.
        this.spriteIndex = {};
        // Bumped any time a grid cell changes so consumers (minimap, future
        // delta-sync, etc.) can skip work when the world is static.
        this.game.gridVersion = 0;
        this.game.openSpaces = [];
        this.game.tileAtlas = new TileTextureAtlas(this.game);
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

        // Cosier footstep puff — slower, smaller, drifts up gently like kicked-up dust.
        this.game.footstepEmitter = this.game.add.particles(0, 0, 'dust', {
            lifespan: {min: 350, max: 650},
            speed: {min: 4, max: 14},
            angle: {min: 230, max: 310},
            scale: {start: 0.06, end: 0.12},
            alpha: {start: 0.35, end: 0},
            gravityY: -10,
            quantity: 1,
            emitting: false,
            blendMode: 'NORMAL'
        });
        this.game.footstepEmitter.setDepth(2);

        // Ambient dust motes — slow drifty motes near the player to give the
        // air some life. Additive so they catch warm light. Position is
        // updated each frame so they always emit around the player.
        this.game.ambientMoteEmitter = this.game.add.particles(0, 0, 'dust', {
            lifespan: {min: 4000, max: 8000},
            speedX: {min: -6, max: 6},
            speedY: {min: -8, max: -2},
            scale: {start: 0.04, end: 0.08},
            alpha: {start: 0.3, end: 0},
            frequency: 600,
            quantity: 1,
            blendMode: 'ADD',
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-60, -40, 120, 80)
            }
        });
        this.game.ambientMoteEmitter.setDepth(2.5);
        this.layerCount = 7;
        this.layerHeight = Math.floor(this.game.mapHeight / this.layerCount);
        this.emptyPool = new TilePool((params) => new Empty(params));
        this.breakablePool = new TilePool((params) => new Breakable(params));
        this.liftControlPool = new TilePool((params) => new LiftControl(params));
        this.liquidPool = new TilePool((params) => new Liquid(params));
        this.lightPool = new TilePool((params) => new Light(params));
        this.buttressPool = new TilePool((params) => new Buttress(params));
        this.railPool = new TilePool((params) => new Rail(params));
        this.treePool = new TilePool((params) => new Tree(params));
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

        // Lift and dip the surface into rolling terrain BEFORE trees and
        // surface tagging so the soil column heights are final by the time
        // trees pick their row.
        this.applySurfaceVariation();
        this.tagSurfaceCells();

        // Trees follow the post-variation surface row per column and cluster
        // into single-breed groves with occasional mixed neighbours.
        this.placeSurfaceTrees();

        // worldX, worldY, tileType, cellItem
        // Update region: every cell in columns 40 through 48 gets updated to a new tile type.
        // this.updateRegion(156, 164, this.game.tileTypes.empty);

        // this.setRandomElement(this.game.tileTypes.stone, 100000);
    }

    /**
     * Grid accessors used by the surface-variation, tagging, and tree
     * placement passes. Centralised here so they all share the same
     * chunk/grid lookup conventions instead of being re-defined inline.
     */
    _cellAt(x, y) {
        const cs = this.game.chunkSize;
        const chunkX = Math.floor(x / cs) * cs;
        const chunkY = Math.floor(y / cs) * cs;
        const chunk = this.game.grid[`${chunkX}_${chunkY}`];
        if (!chunk) return null;
        const lx = ((x % cs) + cs) % cs;
        const ly = ((y % cs) + cs) % cs;
        return chunk[ly]?.[lx] || null;
    }

    _setCell(x, y, value) {
        const cs = this.game.chunkSize;
        const chunkX = Math.floor(x / cs) * cs;
        const chunkY = Math.floor(y / cs) * cs;
        const chunk = this.game.grid[`${chunkX}_${chunkY}`];
        if (!chunk) return;
        const lx = ((x % cs) + cs) % cs;
        const ly = ((y % cs) + cs) % cs;
        if (!chunk[ly]) return;
        chunk[ly][lx] = value;
    }

    /**
     * Sculpt the soil/sky boundary into rolling terrain. Each column gets
     * a deterministic-per-seed offset from fbm noise: negative values lift
     * a hill of fresh soil into the sky band, positive values carve a
     * shallow dip into the top of the soil. Chasm walls, the chasm interior
     * and the map edges keep their original flat tops so the lift shaft and
     * world borders stay intact.
     */
    applySurfaceVariation() {
        const tileTypes = this.game.tileTypes;
        if (!tileTypes?.soil) return;
        const chasm = this.game.chasmRange;
        const aboveGround = this.game.aboveGround;
        this.game.maxSurfaceLift = 5;
        this.game.maxSurfaceDrop = 4;

        const seed = Math.random() * 10000;
        // Track the lifted height per column so adjacent passes (trees,
        // tagging) can reason about it without re-running the noise.
        this.game.surfaceOffsets = new Array(this.game.mapWidth).fill(0);

        for (let x = 1; x < this.game.mapWidth - 1; x++) {
            if (x === chasm[0] || x === chasm[1]) continue;
            if (x > chasm[0] && x < chasm[1]) continue;

            // Two octave bands: broad rolling hills + finer ripples on top.
            const broad = fbm1D(x * 0.04, seed, 4);
            const fine  = fbm1D(x * 0.13, seed + 91.7, 3);
            const norm = ((broad * 0.78 + fine * 0.22) - 0.5) * 2; // -1..1
            // Smooth-bias toward 0 so most columns stay near the default
            // line and only occasional peaks/troughs reach the extremes.
            const biased = Math.sign(norm) * Math.pow(Math.abs(norm), 1.45);
            const range = biased < 0 ? this.game.maxSurfaceLift : this.game.maxSurfaceDrop;
            const offset = Math.round(biased * range);
            this.game.surfaceOffsets[x] = offset;

            if (offset < 0) {
                for (let y = aboveGround + offset + 1; y <= aboveGround; y++) {
                    if (y < 1) continue;
                    this._setCell(x, y, {...tileTypes.soil, strength: 100});
                }
            } else if (offset > 0) {
                for (let y = aboveGround + 1; y <= aboveGround + offset; y++) {
                    this._setCell(x, y, {...tileTypes.empty});
                }
            }
        }
    }

    /**
     * Walk down each column from the sky and mark the first soil cell with
     * `surface: true` so the breakable tile renderer knows where to draw
     * grass + a darker silhouette top regardless of how high or low the
     * column ended up after the variation pass.
     */
    tagSurfaceCells() {
        const tileTypes = this.game.tileTypes;
        if (!tileTypes?.soil) return;
        const chasm = this.game.chasmRange;
        const maxScan = this.game.aboveGround + (this.game.maxSurfaceDrop || 0) + 6;

        for (let x = 0; x < this.game.mapWidth; x++) {
            if (x > chasm[0] && x < chasm[1]) continue; // chasm interior has no surface row

            for (let y = 0; y <= maxScan; y++) {
                const cell = this._cellAt(x, y);
                if (!cell) continue;
                if (cell.id !== tileTypes.soil.id) continue;
                if (cell.surface === true) break;
                this._setCell(x, y, {...cell, surface: true});
                break;
            }
        }
    }

    /**
     * Ensure both chasm walls have a lift-control switch at the surface
     * row (the platform's home depth). Idempotent and safe to call on
     * loaded saves — tiles are only swapped in when the cell isn't
     * already a lift control, so existing wiring is preserved.
     */
    placeSurfaceTrees() {
        const tileTypes = this.game.tileTypes;
        if (!tileTypes?.tree) return;
        const chasm = this.game.chasmRange;
        const maxScan = this.game.aboveGround + (this.game.maxSurfaceDrop || 0) + 6;

        const findTreeRow = (x) => {
            for (let y = 1; y <= maxScan; y++) {
                const cell = this._cellAt(x, y);
                if (!cell) continue;
                if (cell.id !== tileTypes.soil.id) continue;
                return y - 1; // tree sits in the cell just above the topmost soil
            }
            return null;
        };

        // Two parallel signals layered to drive clustering:
        //   - density (random walk):     creates uneven spacing between groves
        //   - groveBreed/groveLength:    keeps adjacent trees the same species
        //                                with occasional cross-species infill
        let density = 0.35;
        let lastTreeX = -10;
        let groveBreed = null;
        let groveLength = 0;
        const biomeWidth = this.game.mapWidth / TREE_BIOMES.length;

        for (let x = 2; x < this.game.mapWidth - 2; x++) {
            if (x >= chasm[0] - 6 && x <= chasm[1] + 6) {
                density = 0.35;
                groveBreed = null;
                groveLength = 0;
                continue;
            }
            density += (Math.random() - 0.5) * 0.28;
            density = Math.max(0.05, Math.min(0.9, density));

            const treeRow = findTreeRow(x);
            if (treeRow == null || treeRow < 1) continue;
            const cellHere = this._cellAt(x, treeRow);
            // Tree row must be open sky and the cell below must be soil
            // (otherwise the trunk has nothing to root into).
            if (!cellHere || cellHere.id !== tileTypes.empty.id) continue;
            const cellBelow = this._cellAt(x, treeRow + 1);
            if (!cellBelow || cellBelow.id !== tileTypes.soil.id) continue;

            if (x - lastTreeX < 2) continue;

            if (Math.random() < density) {
                const biomeIdx = Math.min(TREE_BIOMES.length - 1, Math.floor(x / biomeWidth));
                const biome = TREE_BIOMES[biomeIdx];

                if (groveLength <= 0) {
                    groveBreed = pickWeighted(biome.weights);
                    groveLength = 3 + Math.floor(Math.random() * 10);
                }
                // 82% same-breed, 18% biome resample — keeps groves coherent
                // without becoming pure monoculture.
                const breed = Math.random() < 0.82 ? groveBreed : pickWeighted(biome.weights);
                groveLength--;
                const maturity = pickWeighted(MATURITY_WEIGHTS);
                const seed = (Math.random() * 0xffffffff) >>> 0;
                this._setCell(x, treeRow, {...tileTypes.tree, breed, maturity, seed});
                lastTreeX = x;
            } else if (groveLength > 0 && (x - lastTreeX) > 5) {
                // Big enough gap to reset — next grove can pick a new breed.
                groveLength = 0;
            }
        }
    }

    ensureSurfaceLiftControls() {
        const liftId = this.game.tileTypes?.liftControl?.id;
        const grid = this.game.grid;
        if (liftId == null || !grid) return;
        const ty = this.game.aboveGround + 1;
        const cs = this.game.chunkSize;
        const walls = [this.game.chasmRange[0], this.game.chasmRange[1]];
        for (const tx of walls) {
            const chunkX = Math.floor(tx / cs) * cs;
            const chunkY = Math.floor(ty / cs) * cs;
            const chunk = grid[`${chunkX}_${chunkY}`];
            if (!chunk) continue;
            const localX = tx % cs;
            const localY = ty % cs;
            const row = chunk[localY];
            if (!row) continue;
            const cell = row[localX];
            if (!cell || cell.id === liftId) continue;
            row[localX] = { ...this.game.tileTypes.liftControl };
        }
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

    spriteAtWorld(worldX, worldY) {
        const ts = this.game.tileSize;
        const cs = this.game.chunkSize;
        const tx = Math.floor(worldX / ts);
        const ty = Math.floor(worldY / ts);
        const chunkX = Math.floor(tx / cs) * cs;
        const chunkY = Math.floor(ty / cs) * cs;
        const chunk = this.spriteIndex[`${chunkX}_${chunkY}`];
        if (!chunk) return null;
        const lx = ((tx % cs) + cs) % cs;
        const ly = ((ty % cs) + cs) % cs;
        const row = chunk[ly];
        if (!row) return null;
        const sprite = row[lx];
        return sprite && sprite.active ? sprite : null;
    }

    getAdjacentBlocks(x, y) {
        const ts = this.game.tileSize;
        return {
            left:  this.spriteAtWorld(x - ts, y),
            right: this.spriteAtWorld(x + ts, y),
            above: this.spriteAtWorld(x, y - ts),
            below: this.spriteAtWorld(x, y + ts),
        };
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
        this.game.gridVersion++;
        if (cellItem?.tileRef) {
            this._unregisterSpriteAt(chunkKey, cellY, cellX);
            cellItem.tileRef.destroy(prefs);
        }
        if (this.game.loadedChunks.has(chunkKey)) {
            const result = this.placeObject(tileType, worldX, worldY, {chunkKey, cellY, cellX}, prefs);
            this.refreshNeighborEdges(worldX, worldY);
            return result;
        }
    }

    _registerSpriteAt(chunkKey, cellY, cellX, sprite) {
        if (!sprite) return;
        let chunk = this.spriteIndex[chunkKey];
        if (!chunk) {
            chunk = new Array(this.game.chunkSize);
            for (let i = 0; i < this.game.chunkSize; i++) chunk[i] = new Array(this.game.chunkSize).fill(null);
            this.spriteIndex[chunkKey] = chunk;
        }
        const row = chunk[cellY];
        if (row) row[cellX] = sprite;
    }

    _unregisterSpriteAt(chunkKey, cellY, cellX) {
        const chunk = this.spriteIndex[chunkKey];
        if (!chunk) return;
        const row = chunk[cellY];
        if (row) row[cellX] = null;
    }

    refreshNeighborEdges(worldX, worldY) {
        // Refresh the 8 surrounding solid tiles so silhouette edges and
        // inner-corner curves update on dig/place. O(8) via the spatial
        // index instead of scanning every soil + buttress sprite.
        const ts = this.game.tileSize;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const sprite = this.spriteAtWorld(worldX + dx * ts, worldY + dy * ts);
                const ref = sprite?.tileRef;
                if (!ref) continue;
                if (ref.redrawTile) {
                    ref.lastEdgeMask = -1;
                    ref.redrawTile();
                }
                if (ref.refreshCurveOverlay) {
                    ref.lastCurveMask = -1;
                    ref.refreshCurveOverlay();
                }
            }
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
        if (tileType.id === this.game.tileTypes.tree.id) {
            newTile = this.treePool.acquire(params);
        }
        if (newTile?.sprite && cellDetails) {
            this._registerSpriteAt(cellDetails.chunkKey, cellDetails.cellY, cellDetails.cellX, newTile.sprite);
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
        // Each new tile already self-evaluates its edges shortly after
        // creation via its own delayed callback. We deliberately skip a
        // bulk neighbour refresh here — it caused a frame hitch on chunk
        // load, and any far-side artefact is outside the lit view radius.
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

        delete this.spriteIndex[chunkKey];
        this.game.loadedChunks.delete(chunkKey);
    }

}