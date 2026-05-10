// Per-tree procedural texture generation. Trees combine a breed (overall
// silhouette + palette) with a maturity (size + density). For each
// (breed, maturity, variant) the factory bakes a single canvas texture
// and caches it; individual Tree instances pick a variant deterministically
// from their per-cell seed so a row of mature oaks all look distinct
// without exploding texture count.

export const TREE_BREEDS = {
    oak: {
        name: 'Oak',
        shape: 'round',
        baseW: 18,
        baseH: 32,
        trunkRatio: 0.42,
        trunkWidthHint: 2,
        trunkColors: ['#6a4423', '#3f2410'],
        trunkAccent: '#2a1607',
        canopyDark: '#28522a',
        canopyMid: '#3e7a3a',
        canopyHi: '#69a44d',
        canopyTop: '#86c560',
        accent: null,
    },
    pine: {
        name: 'Pine',
        shape: 'triangle',
        baseW: 14,
        baseH: 38,
        trunkRatio: 0.22,
        trunkWidthHint: 2,
        trunkColors: ['#4a2d18', '#2a180b'],
        trunkAccent: '#1a0e05',
        canopyDark: '#1a3a1f',
        canopyMid: '#2d5a30',
        canopyHi: '#4a8442',
        canopyTop: '#6fae54',
        accent: '#7a5230',  // pinecone brown
    },
    birch: {
        name: 'Birch',
        shape: 'narrow',
        baseW: 14,
        baseH: 36,
        trunkRatio: 0.5,
        trunkWidthHint: 1,
        trunkColors: ['#dcdacd', '#a8a596'],
        trunkAccent: '#1f1d18',
        canopyDark: '#406a2d',
        canopyMid: '#608c3c',
        canopyHi: '#88af52',
        canopyTop: '#b0cc6c',
        accent: null,
    },
    willow: {
        name: 'Willow',
        shape: 'droop',
        baseW: 22,
        baseH: 30,
        trunkRatio: 0.3,
        trunkWidthHint: 2,
        trunkColors: ['#5a4220', '#3a2a12'],
        trunkAccent: '#251a08',
        canopyDark: '#5a742a',
        canopyMid: '#86a440',
        canopyHi: '#aac560',
        canopyTop: '#cadc80',
        accent: null,
    },
    maple: {
        name: 'Maple',
        shape: 'round',
        baseW: 18,
        baseH: 30,
        trunkRatio: 0.42,
        trunkWidthHint: 2,
        trunkColors: ['#5a3520', '#3a2515'],
        trunkAccent: '#251608',
        canopyDark: '#7a2a14',
        canopyMid: '#bf5520',
        canopyHi: '#e08530',
        canopyTop: '#f2b550',
        accent: '#f2d570',  // bright autumn pop
    },
};

export const TREE_MATURITY = {
    sapling: {scale: 0.38, hitsToFell: 1, woodYield: 0, maxLean: 0.02},
    young:   {scale: 0.65, hitsToFell: 2, woodYield: 1, maxLean: 0.04},
    mature:  {scale: 1.00, hitsToFell: 3, woodYield: 2, maxLean: 0.06},
    ancient: {scale: 1.22, hitsToFell: 5, woodYield: 4, maxLean: 0.08},
};

function makeRng(seed) {
    let s = (seed | 0) || 1;
    return () => {
        s = (s * 1664525 + 1013904223) | 0;
        return ((s >>> 0) % 100000) / 100000;
    };
}

function fillCircle(ctx, cx, cy, r, color, w, h) {
    ctx.fillStyle = color;
    const r2 = r * r;
    const xMin = Math.max(0, Math.floor(cx - r));
    const xMax = Math.min(w - 1, Math.ceil(cx + r));
    const yMin = Math.max(0, Math.floor(cy - r));
    const yMax = Math.min(h - 1, Math.ceil(cy + r));
    for (let py = yMin; py <= yMax; py++) {
        for (let px = xMin; px <= xMax; px++) {
            const dx = px - cx;
            const dy = py - cy;
            if (dx * dx + dy * dy <= r2) {
                ctx.fillRect(px, py, 1, 1);
            }
        }
    }
}

export default class TreeTextureFactory {
    constructor(scene) {
        this.scene = scene;
        this.variantsPerCombination = 8;
    }

    keyFor(breed, maturity, variantIdx) {
        return `tree_${breed}_${maturity}_${variantIdx}`;
    }

    dimensionsFor(breed, maturity) {
        const def = TREE_BREEDS[breed] || TREE_BREEDS.oak;
        const mat = TREE_MATURITY[maturity] || TREE_MATURITY.mature;
        const w = Math.max(6, Math.round(def.baseW * mat.scale));
        const h = Math.max(8, Math.round(def.baseH * mat.scale));
        return {w, h};
    }

    ensure(breed, maturity, variantIdx) {
        const key = this.keyFor(breed, maturity, variantIdx);
        if (this.scene.textures.exists(key)) return key;
        this.generate(breed, maturity, variantIdx, key);
        return key;
    }

    generate(breed, maturity, variantIdx, key) {
        const def = TREE_BREEDS[breed] || TREE_BREEDS.oak;
        const mat = TREE_MATURITY[maturity] || TREE_MATURITY.mature;
        const {w, h} = this.dimensionsFor(breed, maturity);
        const tex = this.scene.textures.createCanvas(key, w, h);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);

        // Seed combines breed letters, maturity letters, and the variant
        // index so the same triple is reproducible across runs.
        const seedBase =
            (breed.charCodeAt(0) << 24) ^
            (breed.charCodeAt(1) << 18) ^
            (maturity.charCodeAt(0) << 11) ^
            (maturity.charCodeAt(1) << 5) ^
            (variantIdx * 73856093);
        const rand = makeRng(seedBase);

        this.drawTrunk(ctx, def, mat, w, h, rand);
        switch (def.shape) {
            case 'triangle': this.drawTriangleCanopy(ctx, def, mat, w, h, rand); break;
            case 'narrow':   this.drawNarrowCanopy(ctx, def, mat, w, h, rand); break;
            case 'droop':    this.drawDroopCanopy(ctx, def, mat, w, h, rand); break;
            case 'round':
            default:         this.drawRoundCanopy(ctx, def, mat, w, h, rand); break;
        }
        this.drawAccents(ctx, def, mat, w, h, rand);

        tex.refresh();
    }

    drawTrunk(ctx, def, mat, w, h, rand) {
        const trunkWidth = mat.scale >= 0.9 ? def.trunkWidthHint : Math.max(1, def.trunkWidthHint - 1);
        const trunkHeightPx = Math.max(2, Math.floor(h * def.trunkRatio));
        const trunkX = Math.floor(w / 2) - Math.floor(trunkWidth / 2);
        const trunkTop = h - trunkHeightPx;

        ctx.fillStyle = def.trunkColors[0];
        ctx.fillRect(trunkX, trunkTop, trunkWidth, trunkHeightPx);
        if (trunkWidth > 1 && def.trunkColors[1]) {
            ctx.fillStyle = def.trunkColors[1];
            ctx.fillRect(trunkX + trunkWidth - 1, trunkTop, 1, trunkHeightPx);
        }

        // Birch bark: dark horizontal flecks scattered along the pale trunk.
        // Other breeds get a sparser, darker grain.
        const accentDensity = def.shape === 'narrow' ? 0.45 : 0.18;
        const accentCount = Math.max(1, Math.floor(trunkHeightPx * accentDensity));
        for (let i = 0; i < accentCount; i++) {
            const gy = trunkTop + 1 + Math.floor(rand() * (trunkHeightPx - 2));
            ctx.fillStyle = def.trunkAccent;
            const xOff = trunkWidth > 1 ? Math.floor(rand() * trunkWidth) : 0;
            ctx.fillRect(trunkX + xOff, gy, 1, 1);
        }

        // Subtle root flare at base for older trees.
        if (mat.scale >= 1.0 && trunkX > 0 && trunkX + trunkWidth < w) {
            ctx.fillStyle = def.trunkColors[0];
            ctx.fillRect(trunkX - 1, h - 1, 1, 1);
            ctx.fillRect(trunkX + trunkWidth, h - 1, 1, 1);
            if (mat.scale >= 1.2) {
                ctx.fillStyle = def.trunkAccent;
                ctx.fillRect(trunkX - 1, h - 2, 1, 1);
                ctx.fillRect(trunkX + trunkWidth, h - 2, 1, 1);
            }
        }
    }

    drawRoundCanopy(ctx, def, mat, w, h, rand) {
        const canopyBottom = h - Math.floor(h * def.trunkRatio) + 1;
        const cx = w / 2;
        const horizSpread = w * 0.18;
        const blobs = [
            {x: cx,                  y: canopyBottom - 1,         r: Math.max(2, w * 0.34)},
            {x: cx - horizSpread,    y: canopyBottom - h * 0.13,  r: Math.max(2, w * 0.28)},
            {x: cx + horizSpread,    y: canopyBottom - h * 0.13,  r: Math.max(2, w * 0.28)},
            {x: cx - w * 0.08,       y: canopyBottom - h * 0.26,  r: Math.max(1, w * 0.22)},
            {x: cx + w * 0.08,       y: canopyBottom - h * 0.32,  r: Math.max(1, w * 0.20)},
            {x: cx,                  y: canopyBottom - h * 0.42,  r: Math.max(1, w * 0.16)},
        ];

        // Outline pass — slightly oversized dark blobs build a thin ring.
        for (const b of blobs) fillCircle(ctx, b.x, b.y, b.r + 1, def.canopyDark, w, h);
        // Mid fill
        for (const b of blobs) fillCircle(ctx, b.x, b.y, b.r, def.canopyMid, w, h);

        // Random highlights — favour the upper-left half of each blob to
        // imply a light source up and to the left.
        for (const b of blobs) {
            const count = 1 + Math.floor(rand() * 3 + b.r * 0.3);
            for (let i = 0; i < count; i++) {
                const angle = Math.PI + rand() * Math.PI / 1.4;
                const rr = rand() * (b.r - 0.5);
                const px = Math.round(b.x + Math.cos(angle) * rr);
                const py = Math.round(b.y + Math.sin(angle) * rr);
                if (px >= 0 && px < w && py >= 0 && py < h) {
                    ctx.fillStyle = rand() > 0.55 ? def.canopyTop : def.canopyHi;
                    ctx.fillRect(px, py, 1, 1);
                }
            }
        }
    }

    drawTriangleCanopy(ctx, def, mat, w, h, rand) {
        // Stacked conifer skirts — each layer is a downward-flaring triangle
        // overlapping the one above. Ratio shrinks toward the top so the
        // overall silhouette tapers like a spruce.
        const canopyHeight = h - Math.floor(h * def.trunkRatio);
        const layers = 4 + Math.floor(rand() * 2);
        const layerH = canopyHeight / layers;
        const cx = w / 2;

        for (let i = 0; i < layers; i++) {
            const taper = 1 - i / layers * 0.55;
            const yStart = canopyHeight - (i + 1) * layerH;
            const yEnd = canopyHeight - i * layerH + 1;
            const halfWBase = (w / 2 - 0.5) * taper;
            for (let y = Math.max(0, Math.floor(yStart)); y < Math.min(h, Math.ceil(yEnd)); y++) {
                const tNorm = (y - yStart) / layerH;
                const lineHalfW = Math.max(0.5, halfWBase * tNorm + 0.5);
                const xStart = Math.max(0, Math.floor(cx - lineHalfW));
                const xEnd = Math.min(w - 1, Math.ceil(cx + lineHalfW));
                const ringRow = y === Math.min(h - 1, Math.ceil(yEnd) - 1);
                ctx.fillStyle = ringRow ? def.canopyDark : def.canopyMid;
                for (let x = xStart; x <= xEnd; x++) ctx.fillRect(x, y, 1, 1);
                // Edge pixels in dark to define silhouette.
                if (!ringRow) {
                    ctx.fillStyle = def.canopyDark;
                    ctx.fillRect(xStart, y, 1, 1);
                    ctx.fillRect(xEnd, y, 1, 1);
                }
            }
            // Per-layer sparkle highlights
            const sparkles = 2 + Math.floor(rand() * 2);
            for (let s = 0; s < sparkles; s++) {
                const sx = Math.round(cx + (rand() - 0.5) * halfWBase * 1.7);
                const sy = Math.round(yStart + rand() * layerH);
                if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                    ctx.fillStyle = rand() > 0.5 ? def.canopyHi : def.canopyTop;
                    ctx.fillRect(sx, sy, 1, 1);
                }
            }
        }

        // Pine tip — single dark pixel at the very top of the cone.
        ctx.fillStyle = def.canopyDark;
        ctx.fillRect(Math.round(cx), 0, 1, 1);
    }

    drawNarrowCanopy(ctx, def, mat, w, h, rand) {
        // Tall narrow ellipse — birch reads as a slim column of foliage.
        const canopyHeight = h - Math.floor(h * def.trunkRatio);
        const cx = w / 2;
        const cy = canopyHeight * 0.5;
        const rx = Math.max(2, w * 0.36);
        const ry = Math.max(3, canopyHeight * 0.48);

        for (let py = 0; py < canopyHeight; py++) {
            for (let px = 0; px < w; px++) {
                const dx = (px - cx) / rx;
                const dy = (py - cy) / ry;
                const d = dx * dx + dy * dy;
                if (d <= 1.0) {
                    const onEdge = d > 0.82;
                    ctx.fillStyle = onEdge ? def.canopyDark : def.canopyMid;
                    ctx.fillRect(px, py, 1, 1);
                }
            }
        }

        // Speckle highlights
        const speckCount = 4 + Math.floor(rand() * 5);
        for (let i = 0; i < speckCount; i++) {
            const a = rand() * Math.PI * 2;
            const r = Math.sqrt(rand()) * 0.85;
            const px = Math.round(cx + Math.cos(a) * rx * r);
            const py = Math.round(cy + Math.sin(a) * ry * r);
            if (px >= 0 && px < w && py >= 0 && py < h) {
                ctx.fillStyle = rand() > 0.55 ? def.canopyHi : def.canopyTop;
                ctx.fillRect(px, py, 1, 1);
            }
        }
    }

    drawDroopCanopy(ctx, def, mat, w, h, rand) {
        // Round-ish willow canopy with drooping tendrils trailing below it.
        const canopyHeight = h - Math.floor(h * def.trunkRatio);
        const cx = w / 2;
        const cy = canopyHeight * 0.42;
        const rx = Math.max(3, w * 0.44);
        const ry = Math.max(2, canopyHeight * 0.35);

        for (let py = 0; py < canopyHeight; py++) {
            for (let px = 0; px < w; px++) {
                const dx = (px - cx) / rx;
                const dy = (py - cy) / ry;
                const d = dx * dx + dy * dy;
                if (d <= 1.0) {
                    const onEdge = d > 0.78;
                    ctx.fillStyle = onEdge ? def.canopyDark : def.canopyMid;
                    ctx.fillRect(px, py, 1, 1);
                }
            }
        }

        // Drooping tendrils
        const tendrilCount = Math.max(4, Math.floor(w * 0.42));
        for (let i = 0; i < tendrilCount; i++) {
            const t = i / Math.max(1, tendrilCount - 1);
            const tx = Math.round(cx + (t - 0.5) * 2 * rx * 0.96);
            const ringX = (tx - cx) / rx;
            const yEdge = ringX * ringX <= 1
                ? Math.round(cy + Math.sqrt(Math.max(0, 1 - ringX * ringX)) * ry)
                : Math.round(cy);
            const tLen = 2 + Math.floor(rand() * 5) + Math.floor(mat.scale * 2);
            for (let y = 0; y < tLen; y++) {
                const py = yEdge + y;
                if (py >= h || tx < 0 || tx >= w) break;
                ctx.fillStyle = y < 1 ? def.canopyMid : (y < 3 ? def.canopyHi : def.canopyTop);
                ctx.fillRect(tx, py, 1, 1);
            }
        }

        // A few centre highlights
        for (let i = 0; i < 3; i++) {
            const a = rand() * Math.PI * 2;
            const r = rand() * 0.55;
            const px = Math.round(cx + Math.cos(a) * rx * r);
            const py = Math.round(cy + Math.sin(a) * ry * r);
            if (px >= 0 && px < w && py >= 0 && py < h) {
                ctx.fillStyle = def.canopyTop;
                ctx.fillRect(px, py, 1, 1);
            }
        }
    }

    drawAccents(ctx, def, mat, w, h, rand) {
        if (!def.accent) return;
        // Only mature+ get visible "fruit" (pinecones / autumn highlights).
        if (mat.scale < 0.9) return;
        const dotCount = 2 + Math.floor(rand() * 3);
        const canopyHeight = h - Math.floor(h * def.trunkRatio);
        for (let i = 0; i < dotCount; i++) {
            const px = Math.floor(rand() * w);
            const py = Math.floor(rand() * canopyHeight);
            // Skip transparent pixels (don't paint accents into sky).
            const data = ctx.getImageData(px, py, 1, 1).data;
            if (data[3] === 0) continue;
            ctx.fillStyle = def.accent;
            ctx.fillRect(px, py, 1, 1);
        }
    }
}
