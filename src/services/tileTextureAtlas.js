// Pre-renders dirt and grass tile variants into a single packed canvas
// texture (with named frames per mask/variant), plus a second canvas for
// the inner-corner curve overlays. Tiles all reference the same atlas
// texture and only swap frames as their neighbour state changes — this
// lets Phaser batch their draw calls instead of issuing one GL bind
// per unique tile texture.
//
// Visual approach mirrors Terraria-style auto-tiles:
// - sharp pixel-art square base
// - corner cuts (1-2px L-shapes) where two adjacent sides face air
// - dark outline traced around the resulting silhouette
// - inner-corner darkening where two solid neighbours meet, giving
//   the "tile seam" grain that makes a wall read as one mass
// - 3 variants per edge mask for visual variety

const VARIANT_COUNT = 8;
// Edge mask is 4 outside-corner bits + 4 inside-corner bits = 8 bits.
const MAX_MASKS = 256;
const MASKS_PER_ROW = 16;

function makeRng(seed) {
    let s = seed | 0;
    return () => {
        s = (s * 1664525 + 1013904223) | 0;
        return ((s >>> 0) % 100000) / 100000;
    };
}

function toCss(hexInt) {
    return '#' + ((hexInt & 0xffffff).toString(16).padStart(6, '0'));
}

function darken(hexInt, factor) {
    const f = Math.min(Math.max(factor / 100, 0), 1);
    let r = (hexInt >> 16) & 0xff;
    let g = (hexInt >> 8) & 0xff;
    let b = hexInt & 0xff;
    r = Math.round(r * (1 - f));
    g = Math.round(g * (1 - f));
    b = Math.round(b * (1 - f));
    return (r << 16) | (g << 8) | b;
}

function lighten(hexInt, factor) {
    const f = Math.min(Math.max(factor / 100, 0), 1);
    let r = (hexInt >> 16) & 0xff;
    let g = (hexInt >> 8) & 0xff;
    let b = hexInt & 0xff;
    r = Math.round(r + (255 - r) * f);
    g = Math.round(g + (255 - g) * f);
    b = Math.round(b + (255 - b) * f);
    return (r << 16) | (g << 8) | b;
}

export default class TileTextureAtlas {
    constructor(game) {
        this.game = game;
        this.tileSize = game.tileSize;
        this.grassOverhang = 4;
        this.textureHeight = this.tileSize + this.grassOverhang;
        this.variantCount = VARIANT_COUNT;

        this.dirtBaseColor = 0x6e4525;
        this.grassA = 0x6e9c47;
        this.grassB = 0x88b85c;
        this.grassDark = 0x4f7330;

        this.tileTextureKey = 'tile_atlas';
        this.curveTextureKey = 'tile_curve_atlas';

        // 1px transparent gutter on every side of every frame keeps the
        // GPU from sampling into a neighbouring frame at sub-pixel
        // sprite positions (otherwise visible as thin coloured seams
        // along tile edges during smooth camera moves).
        this.gutter = 1;
        const cellW = this.tileSize + this.gutter * 2;
        const cellH = this.textureHeight + this.gutter * 2;

        // Atlas layout: each (mask, variant) gets one padded cell at a
        // deterministic position. MASKS_PER_ROW masks per row,
        // VARIANT_COUNT variants packed horizontally within each mask cell.
        // Grass frames live below all dirt frames so kind→y is constant.
        this.cellsPerMaskRow = MASKS_PER_ROW;
        this.cellWidth = cellW;
        this.cellHeight = cellH;
        this.atlasWidth = this.cellsPerMaskRow * this.variantCount * cellW;
        this.kindRows = Math.ceil(MAX_MASKS / this.cellsPerMaskRow);
        this.grassYOffset = this.kindRows * cellH;
        this.atlasHeight = this.grassYOffset * 2;

        this.curveSize = this.tileSize + 4;
        this.curveCellSize = this.curveSize + this.gutter * 2;
        this.curveAtlasWidth = 16 * this.curveCellSize;
        this.curveAtlasHeight = this.curveCellSize;

        this._tileFramesAdded = new Set();
        this._curveFramesAdded = new Set();
        this._tileDirty = false;
        this._curveDirty = false;

        this._initAtlases();
        this._generateEager();
    }

    _initAtlases() {
        if (this.game.textures.exists(this.tileTextureKey)) {
            this.game.textures.remove(this.tileTextureKey);
        }
        this.tileTex = this.game.textures.createCanvas(this.tileTextureKey, this.atlasWidth, this.atlasHeight);
        this.tileCtx = this.tileTex.context;
        this.tileCtx.imageSmoothingEnabled = false;

        if (this.game.textures.exists(this.curveTextureKey)) {
            this.game.textures.remove(this.curveTextureKey);
        }
        this.curveTex = this.game.textures.createCanvas(this.curveTextureKey, this.curveAtlasWidth, this.curveAtlasHeight);
        this.curveCtx = this.curveTex.context;
        this.curveCtx.imageSmoothingEnabled = false;
    }

    _generateEager() {
        // 4-bit silhouette masks (0..15) cover every neighbour combination
        // without inner-corner state, which is most of the tiles in any
        // playthrough. Higher 8-bit masks (16+) are lazy.
        for (let mask = 0; mask < 16; mask++) {
            for (let variant = 0; variant < this.variantCount; variant++) {
                this._makeDirtFrame(mask, variant);
                if (mask & 1) {
                    this._makeGrassFrame(mask, variant);
                }
            }
        }
        for (let mask = 0; mask < 16; mask++) {
            this._makeCurveFrame(mask);
        }
        this._flushTile();
        this._flushCurve();
    }

    _flushTile() {
        if (!this._tileDirty) return;
        this.tileTex.refresh();
        this._tileDirty = false;
    }

    _flushCurve() {
        if (!this._curveDirty) return;
        this.curveTex.refresh();
        this._curveDirty = false;
    }

    tileFrameName(kind, mask, variant) {
        return `${kind}_${mask}_${variant}`;
    }

    curveFrameName(mask) {
        return `curve_${mask}`;
    }

    _tileFramePosition(kind, mask, variant) {
        const col = mask % this.cellsPerMaskRow;
        const row = Math.floor(mask / this.cellsPerMaskRow);
        // Cell origin (top-left of the padded cell), then offset by the
        // gutter so the frame rect sits inside the cell with transparent
        // pixels around it.
        const cellX = col * this.variantCount * this.cellWidth + variant * this.cellWidth;
        const cellY = row * this.cellHeight + (kind === 'grass' ? this.grassYOffset : 0);
        return { x: cellX + this.gutter, y: cellY + this.gutter };
    }

    _curveFramePosition(mask) {
        return { x: mask * this.curveCellSize + this.gutter, y: this.gutter };
    }

    ensureTileFrame(kind, mask, variant) {
        const name = this.tileFrameName(kind, mask, variant);
        if (this._tileFramesAdded.has(name)) return name;
        if (kind === 'grass') this._makeGrassFrame(mask, variant);
        else this._makeDirtFrame(mask, variant);
        this._flushTile();
        return name;
    }

    ensureCurveFrame(mask) {
        const name = this.curveFrameName(mask);
        if (this._curveFramesAdded.has(name)) return name;
        this._makeCurveFrame(mask);
        this._flushCurve();
        return name;
    }

    // Legacy-named wrappers kept for the existing call sites.
    keyFor(kind, mask, variant) {
        return this.tileFrameName(kind, mask, variant);
    }

    ensureTexture(kind, mask, variant) {
        return this.ensureTileFrame(kind, mask, variant);
    }

    cornerCurveKey(mask) {
        return this.curveFrameName(mask);
    }

    ensureCornerCurveTexture(mask) {
        return this.ensureCurveFrame(mask);
    }

    _makeDirtFrame(mask, variant) {
        const name = this.tileFrameName('dirt', mask, variant);
        if (this._tileFramesAdded.has(name)) return;
        const { x, y } = this._tileFramePosition('dirt', mask, variant);
        const ctx = this.tileCtx;
        ctx.save();
        ctx.translate(x, y);
        ctx.clearRect(0, 0, this.tileSize, this.textureHeight);
        this.drawBody(ctx, mask, variant, this.dirtBaseColor);
        ctx.restore();
        this.tileTex.add(name, 0, x, y, this.tileSize, this.textureHeight);
        this._tileFramesAdded.add(name);
        this._tileDirty = true;
    }

    _makeGrassFrame(mask, variant) {
        const name = this.tileFrameName('grass', mask, variant);
        if (this._tileFramesAdded.has(name)) return;
        const { x, y } = this._tileFramePosition('grass', mask, variant);
        const ctx = this.tileCtx;
        ctx.save();
        ctx.translate(x, y);
        ctx.clearRect(0, 0, this.tileSize, this.textureHeight);
        const filled = this.drawBody(ctx, mask, variant, this.dirtBaseColor);
        this.drawGrass(ctx, mask, variant, filled);
        ctx.restore();
        this.tileTex.add(name, 0, x, y, this.tileSize, this.textureHeight);
        this._tileFramesAdded.add(name);
        this._tileDirty = true;
    }

    _makeCurveFrame(mask) {
        const name = this.curveFrameName(mask);
        if (this._curveFramesAdded.has(name)) return;
        const { x, y } = this._curveFramePosition(mask);
        const size = this.curveSize;
        const ctx = this.curveCtx;
        ctx.save();
        ctx.translate(x, y);
        ctx.clearRect(0, 0, size, size);

        const outline = toCss(darken(this.dirtBaseColor, 55));
        ctx.fillStyle = outline;

        // 3-pixel L per corner. "Near" pixel sits diagonally adjacent to
        // the tile body; the other two extend along the cave walls formed
        // by the two solid neighbours.
        if (mask & 1) {                         // top-left
            ctx.fillRect(1, 1, 1, 1);
            ctx.fillRect(0, 1, 1, 1);
            ctx.fillRect(1, 0, 1, 1);
        }
        if (mask & 2) {                         // top-right
            ctx.fillRect(size - 2, 1, 1, 1);
            ctx.fillRect(size - 1, 1, 1, 1);
            ctx.fillRect(size - 2, 0, 1, 1);
        }
        if (mask & 4) {                         // bottom-left
            ctx.fillRect(1, size - 2, 1, 1);
            ctx.fillRect(0, size - 2, 1, 1);
            ctx.fillRect(1, size - 1, 1, 1);
        }
        if (mask & 8) {                         // bottom-right
            ctx.fillRect(size - 2, size - 2, 1, 1);
            ctx.fillRect(size - 1, size - 2, 1, 1);
            ctx.fillRect(size - 2, size - 1, 1, 1);
        }
        ctx.restore();
        this.curveTex.add(name, 0, x, y, size, size);
        this._curveFramesAdded.add(name);
        this._curveDirty = true;
    }

    // ----- Pixel-build helpers (unchanged) -----

    // Build a per-pixel filled mask for the body, applying corner cuts
    // where two adjacent sides face air, plus optional edge erosion for
    // variant-level silhouette variation.
    buildFilled(mask, rng) {
        const top = !!(mask & 1);
        const right = !!(mask & 2);
        const bottom = !!(mask & 4);
        const left = !!(mask & 8);
        const ts = this.tileSize;

        const filled = [];
        for (let py = 0; py < ts; py++) filled.push(new Array(ts).fill(true));

        const cutCorner = (cornerX, cornerY, dirX, dirY, depth) => {
            for (let i = 0; i <= depth; i++) {
                for (let j = 0; j <= depth - i; j++) {
                    const px = cornerX + dirX * i;
                    const py = cornerY + dirY * j;
                    if (filled[py] && filled[py][px] !== undefined) {
                        filled[py][px] = false;
                    }
                }
            }
        };

        // 1-2 deep L-shape cuts at each exposed (outside) corner
        const cornerDepth = () => 1 + (rng() > 0.5 ? 1 : 0);
        if (top && left)     cutCorner(0, 0, 1, 1, cornerDepth());
        if (top && right)    cutCorner(ts - 1, 0, -1, 1, cornerDepth());
        if (bottom && left)  cutCorner(0, ts - 1, 1, -1, cornerDepth());
        if (bottom && right) cutCorner(ts - 1, ts - 1, -1, -1, cornerDepth());

        // Tiny edge erosion — 0-1 chips per exposed side, away from corners
        const erodeEdge = (axis, isOpen) => {
            if (!isOpen) return;
            if (rng() < 0.6) return;
            const t = 3 + Math.floor(rng() * (ts - 6));
            if (axis === 'top' && filled[0][t]) filled[0][t] = false;
            else if (axis === 'bottom' && filled[ts - 1][t]) filled[ts - 1][t] = false;
            else if (axis === 'left' && filled[t][0]) filled[t][0] = false;
            else if (axis === 'right' && filled[t][ts - 1]) filled[t][ts - 1] = false;
        };
        erodeEdge('top', top);
        erodeEdge('bottom', bottom);
        erodeEdge('left', left);
        erodeEdge('right', right);

        return filled;
    }

    // A pixel is on the silhouette edge if any of its 4 neighbours is
    // unfilled, or it's at the tile boundary on a side that faces air.
    isSilhouetteEdge(filled, px, py, mask) {
        if (!filled[py][px]) return false;
        const top = !!(mask & 1);
        const right = !!(mask & 2);
        const bottom = !!(mask & 4);
        const left = !!(mask & 8);
        const ts = this.tileSize;

        if (py === 0) { if (top) return true; }
        else if (!filled[py - 1][px]) return true;

        if (py === ts - 1) { if (bottom) return true; }
        else if (!filled[py + 1][px]) return true;

        if (px === 0) { if (left) return true; }
        else if (!filled[py][px - 1]) return true;

        if (px === ts - 1) { if (right) return true; }
        else if (!filled[py][px + 1]) return true;

        return false;
    }

    drawBody(ctx, mask, variant, baseColor) {
        const ts = this.tileSize;
        const yOff = this.grassOverhang;
        const rng = makeRng(mask * 17 + variant * 257 + 1);

        const mid = baseColor;
        const hi = lighten(baseColor, 18);
        const lo = darken(baseColor, 28);
        const outline = darken(baseColor, 55);

        const filled = this.buildFilled(mask, rng);

        // Pass 1: fill body pixels (mid colour where filled, dark outline
        // where on the silhouette edge).
        for (let py = 0; py < ts; py++) {
            for (let px = 0; px < ts; px++) {
                if (!filled[py][px]) continue;
                const onEdge = this.isSilhouetteEdge(filled, px, py, mask);
                ctx.fillStyle = toCss(onEdge ? outline : mid);
                ctx.fillRect(px, yOff + py, 1, 1);
            }
        }

        // Pass 2: inner corner seam — where two adjacent sides are NOT
        // exposed the corner is interior. We add a faint darker pixel at
        // SOME of these corners (chosen per-variant) so adjacent tiles'
        // meeting corners don't always form a uniform 2x2 dark square at
        // every 4-tile junction. Use a softer darken than lo.
        const seamShade = darken(baseColor, 16);
        const seamBits = Math.floor(rng() * 16);
        const top = !!(mask & 1);
        const right = !!(mask & 2);
        const bottom = !!(mask & 4);
        const left = !!(mask & 8);
        const seam = (cornerX, cornerY, conds, bit) => {
            if (!conds || !(seamBits & bit)) return;
            if (filled[cornerY][cornerX]) {
                ctx.fillStyle = toCss(seamShade);
                ctx.fillRect(cornerX, yOff + cornerY, 1, 1);
            }
        };
        seam(0, 0,             !top && !left,    1);
        seam(ts - 1, 0,        !top && !right,   2);
        seam(0, ts - 1,        !bottom && !left, 4);
        seam(ts - 1, ts - 1,   !bottom && !right, 8);

        // Pass 3: body speckles — small interior pixels (not on edge) in
        // a few different shades for richer soil grain. More variation per
        // tile makes a wall of same-mask tiles feel less copy-paste.
        const speckleCount = 6 + Math.floor(rng() * 4);
        const dark3 = darken(baseColor, 18);
        for (let i = 0; i < speckleCount; i++) {
            const sx = 1 + Math.floor(rng() * (ts - 2));
            const sy = 1 + Math.floor(rng() * (ts - 2));
            if (!filled[sy][sx]) continue;
            if (this.isSilhouetteEdge(filled, sx, sy, mask)) continue;
            const shade = rng();
            let color;
            if (shade > 0.82) color = hi;
            else if (shade > 0.55) color = dark3;
            else color = lo;
            ctx.fillStyle = toCss(color);
            ctx.fillRect(sx, yOff + sy, 1, 1);
        }

        return filled;
    }

    drawGrass(ctx, mask, variant, filled) {
        const ts = this.tileSize;
        const yOff = this.grassOverhang;
        const rng = makeRng(mask * 31 + variant * 911 + 7);

        const top = !!(mask & 1);
        if (!top) return;

        // Find the topmost filled pixel in each column — that's where
        // the grass band sits, conforming to the silhouette.
        const grassY = new Array(ts).fill(-1);
        for (let px = 0; px < ts; px++) {
            for (let py = 0; py < ts; py++) {
                if (filled[py][px]) { grassY[px] = py; break; }
            }
        }

        // Solid grass row along the top of the body
        for (let px = 0; px < ts; px++) {
            const py = grassY[px];
            if (py < 0) continue;
            ctx.fillStyle = toCss(this.grassA);
            ctx.fillRect(px, yOff + py, 1, 1);
        }
        // Mottle with darker greens
        const mottle = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < mottle; i++) {
            const px = Math.floor(rng() * ts);
            const py = grassY[px];
            if (py < 0) continue;
            ctx.fillStyle = toCss(this.grassDark);
            ctx.fillRect(px, yOff + py, 1, 1);
        }
        // Standing blades pushing up into the overhang region
        const blades = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < blades; i++) {
            const px = 1 + Math.floor(rng() * (ts - 2));
            const py = grassY[px];
            if (py < 0) continue;
            const blen = 1 + Math.floor(rng() * 3);
            const useLight = rng() > 0.5;
            ctx.fillStyle = toCss(useLight ? this.grassB : this.grassA);
            ctx.fillRect(px, yOff + py - blen, 1, blen);
        }
    }

    cornerCurveOverhang() {
        return 2;
    }

    cornerCurveSize() {
        return this.curveSize;
    }

    // True when the cell at (worldX, worldY) is a solid wall-forming tile.
    isSolidAt(worldX, worldY) {
        const ts = this.tileSize;
        const cs = this.game.chunkSize;
        const gcx = Math.floor(worldX / ts);
        const gcy = Math.floor(worldY / ts);
        const chunkX = Math.floor(gcx / cs) * cs;
        const chunkY = Math.floor(gcy / cs) * cs;
        const chunk = this.game.grid[`${chunkX}_${chunkY}`];
        if (!chunk) return false;
        const lx = ((gcx % cs) + cs) % cs;
        const ly = ((gcy % cs) + cs) % cs;
        const tile = chunk[ly]?.[lx];
        if (!tile) return false;
        // Anything that forms part of a continuous wall mass.
        return tile.id === 1 || tile.id === 5;
    }

    // For a tile centred at (worldX, worldY): compute the 4-bit mask of
    // corners where this tile is at an inside cave corner — both adjacent
    // sides are solid neighbours AND the diagonal cell is open. These are
    // the corners where the tile should extend curve pixels into the
    // diagonal open cell.
    cornerCurveMaskFor(worldX, worldY) {
        const ts = this.tileSize;
        const top = this.isSolidAt(worldX, worldY - ts);
        const right = this.isSolidAt(worldX + ts, worldY);
        const bottom = this.isSolidAt(worldX, worldY + ts);
        const left = this.isSolidAt(worldX - ts, worldY);
        let mask = 0;
        if (top && left && !this.isSolidAt(worldX - ts, worldY - ts)) mask |= 1;
        if (top && right && !this.isSolidAt(worldX + ts, worldY - ts)) mask |= 2;
        if (bottom && left && !this.isSolidAt(worldX - ts, worldY + ts)) mask |= 4;
        if (bottom && right && !this.isSolidAt(worldX + ts, worldY + ts)) mask |= 8;
        return mask;
    }
}
