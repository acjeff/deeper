// Pre-renders dirt and grass tile variants as Phaser canvas textures
// at scene init. Each tile becomes a cheap Image sprite that just
// references one of these atlas textures, swapping keys when its
// neighbour state changes.
//
// Visual approach mirrors Terraria-style auto-tiles:
// - sharp pixel-art square base
// - corner cuts (1-2px L-shapes) where two adjacent sides face air
// - dark outline traced around the resulting silhouette
// - inner-corner darkening where two solid neighbours meet, giving
//   the "tile seam" grain that makes a wall read as one mass
// - 3 variants per edge mask for visual variety

const VARIANT_COUNT = 8;

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

        this.generate();
    }

    generate() {
        // Pre-generate the simple 4-bit (no-inner-corner) cases. Inner-corner
        // variants (mask bits 16/32/64/128) are generated lazily on first use
        // since most aren't needed in any given playthrough.
        for (let mask = 0; mask < 16; mask++) {
            for (let variant = 0; variant < this.variantCount; variant++) {
                this.makeDirtTexture(mask, variant);
                if (mask & 1) {
                    this.makeGrassTexture(mask, variant);
                }
            }
        }
    }

    keyFor(kind, mask, variant) {
        return `tile_${kind}_${mask}_${variant}`;
    }

    ensureTexture(kind, mask, variant) {
        const key = this.keyFor(kind, mask, variant);
        if (!this.game.textures.exists(key)) {
            if (kind === 'grass') this.makeGrassTexture(mask, variant);
            else this.makeDirtTexture(mask, variant);
        }
        return key;
    }

    // Build a per-pixel filled mask for the body, applying corner cuts
    // where two adjacent sides face air, plus optional edge erosion for
    // variant-level silhouette variation.
    buildFilled(mask, rng) {
        const top = !!(mask & 1);
        const right = !!(mask & 2);
        const bottom = !!(mask & 4);
        const left = !!(mask & 8);
        const innerTL = !!(mask & 16);
        const innerTR = !!(mask & 32);
        const innerBL = !!(mask & 64);
        const innerBR = !!(mask & 128);
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

        // Single-pixel chip at each INSIDE corner — where this tile's corner
        // pokes into a concave cave corner. The dark outline picked up by
        // the silhouette pass naturally rounds the cave's inside corner.
        if (innerTL) filled[0][0] = false;
        if (innerTR) filled[0][ts - 1] = false;
        if (innerBL) filled[ts - 1][0] = false;
        if (innerBR) filled[ts - 1][ts - 1] = false;

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
        const top = !!(mask & 1);
        const right = !!(mask & 2);
        const bottom = !!(mask & 4);
        const left = !!(mask & 8);

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

    makeDirtTexture(mask, variant) {
        const key = this.keyFor('dirt', mask, variant);
        if (this.game.textures.exists(key)) return;
        const tex = this.game.textures.createCanvas(key, this.tileSize, this.textureHeight);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, this.tileSize, this.textureHeight);
        this.drawBody(ctx, mask, variant, this.dirtBaseColor);
        tex.refresh();
    }

    makeGrassTexture(mask, variant) {
        const key = this.keyFor('grass', mask, variant);
        if (this.game.textures.exists(key)) return;
        const tex = this.game.textures.createCanvas(key, this.tileSize, this.textureHeight);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, this.tileSize, this.textureHeight);
        const filled = this.drawBody(ctx, mask, variant, this.dirtBaseColor);
        this.drawGrass(ctx, mask, variant, filled);
        tex.refresh();
    }
}
