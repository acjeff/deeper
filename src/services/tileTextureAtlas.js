// Pre-renders dirt and grass tile variants as Phaser canvas textures.
// Each combination of (edge mask × variant) is rendered once at scene start
// so individual tiles can use cheap Image sprites instead of redrawing
// procedural Graphics every time their state changes.
//
// Texture layout:
//   width  = tileSize (e.g. 10)
//   height = tileSize + grassOverhang (e.g. 14)
//
// The bottom tileSize rows are the tile body (collision-aligned).
// The top grassOverhang rows are reserved for grass blades that protrude
// above the tile. They're transparent on dirt textures.

const VARIANT_COUNT = 3;

// Deterministic pseudo-random for stable variant generation across runs.
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

    drawBody(ctx, mask, variant, baseColor) {
        const top = !!(mask & 1);
        const right = !!(mask & 2);
        const bottom = !!(mask & 4);
        const left = !!(mask & 8);

        const ts = this.tileSize;
        const yOff = this.grassOverhang;
        const rng = makeRng(mask * 17 + variant * 257 + 1);

        const lightHex = lighten(baseColor, 22);
        const dark1 = darken(baseColor, 22);
        const dark2 = darken(baseColor, 40);

        // Body fill
        ctx.fillStyle = toCss(baseColor);
        ctx.fillRect(0, yOff, ts, ts);

        // Top edge — lighter row plus weathering pixels
        if (top) {
            ctx.fillStyle = toCss(lightHex);
            ctx.fillRect(0, yOff, ts, 1);
            const wear = 2 + Math.floor(rng() * 3);
            ctx.fillStyle = toCss(dark1);
            for (let i = 0; i < wear; i++) {
                const px = Math.floor(rng() * ts);
                ctx.fillRect(px, yOff, 1, 1);
            }
        }
        // Bottom edge — darker row
        if (bottom) {
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = toCss(dark2);
            ctx.fillRect(0, yOff + ts - 1, ts, 1);
            ctx.globalAlpha = 1;
        }
        // Side edges
        if (left) {
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = toCss(dark1);
            ctx.fillRect(0, yOff, 1, ts);
            ctx.globalAlpha = 1;
        }
        if (right) {
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = toCss(dark1);
            ctx.fillRect(ts - 1, yOff, 1, ts);
            ctx.globalAlpha = 1;
        }
        // Chipped corners
        ctx.fillStyle = toCss(dark2);
        if (top && left) ctx.fillRect(0, yOff, 1, 1);
        if (top && right) ctx.fillRect(ts - 1, yOff, 1, 1);
        if (bottom && left) ctx.fillRect(0, yOff + ts - 1, 1, 1);
        if (bottom && right) ctx.fillRect(ts - 1, yOff + ts - 1, 1, 1);

        // Body speckles for soil grain
        const speckleCount = 4 + Math.floor(rng() * 3);
        for (let i = 0; i < speckleCount; i++) {
            const sx = 1 + Math.floor(rng() * (ts - 2));
            const sy = yOff + 1 + Math.floor(rng() * (ts - 2));
            const useLight = rng() > 0.78;
            ctx.globalAlpha = useLight ? 0.7 : 0.85;
            ctx.fillStyle = toCss(useLight ? lightHex : dark1);
            ctx.fillRect(sx, sy, 1, 1);
        }
        ctx.globalAlpha = 1;
    }

    drawGrass(ctx, mask, variant) {
        const ts = this.tileSize;
        const yOff = this.grassOverhang;
        const rng = makeRng(mask * 31 + variant * 911 + 7);

        // Solid green band on the very top row of the body
        ctx.fillStyle = toCss(this.grassA);
        ctx.fillRect(0, yOff, ts, 1);

        // Darker mottle pixels along the top row
        ctx.fillStyle = toCss(this.grassDark);
        const mottle = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < mottle; i++) {
            const px = Math.floor(rng() * ts);
            ctx.fillRect(px, yOff, 1, 1);
        }

        // Softer second row beneath the band
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = toCss(this.grassA);
        ctx.fillRect(0, yOff + 1, ts, 1);
        ctx.globalAlpha = 1;

        // Standing blades pushing up into the overhang region
        const blades = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < blades; i++) {
            const px = 1 + Math.floor(rng() * (ts - 2));
            const blen = 1 + Math.floor(rng() * 3);
            const useLight = rng() > 0.5;
            ctx.fillStyle = toCss(useLight ? this.grassB : this.grassA);
            ctx.fillRect(px, yOff - blen, 1, blen);
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
        this.drawBody(ctx, mask, variant, this.dirtBaseColor);
        this.drawGrass(ctx, mask, variant);
        tex.refresh();
    }
}
