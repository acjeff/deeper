import {Tile} from "./tile";

// Each hut occupies a single grid cell (the door cell on the surface row)
// but its facade sprite spans HUT_TILE_W × HUT_TILE_H tiles around that
// anchor — pure visual decoration, no collision, so the player walks past
// the building like in Stardew Valley until they line up with the door
// and press ↑ to enter.
export const HUT_TILE_W = 5;
export const HUT_TILE_H = 4;

// Per-hut palettes. The first player-house style is pickable in the
// interior decor menu; the rest are baked-in flavours for ghost-town
// huts so the row doesn't feel like a copy-paste.
export const HUT_PALETTES = {
    cozy: {
        wall: '#c89a6a', wallShadow: '#8c6336', wallLight: '#e7c089',
        roof: '#7a3a22', roofShadow: '#4a1d10', roofTrim: '#2a1108',
        door: '#5a2a14', doorTrim: '#2a1004', doorKnob: '#f4d56a',
        window: '#e9eef7', shutter: '#3c5a3a',
    },
    dusty: {
        wall: '#8a7a64', wallShadow: '#534739', wallLight: '#a99176',
        roof: '#5a4a3a', roofShadow: '#2e261d', roofTrim: '#16110b',
        door: '#3a2a1a', doorTrim: '#1a0f06', doorKnob: '#a08050',
        window: '#3c4a4a', shutter: '#322a20',
    },
    rusted: {
        wall: '#6a5a48', wallShadow: '#3a302a', wallLight: '#897560',
        roof: '#4f2a1a', roofShadow: '#241108', roofTrim: '#150804',
        door: '#2a1a10', doorTrim: '#0f0604', doorKnob: '#7a5a3a',
        window: '#1a1a1a', shutter: '#2a1d12',
    },
    mossy: {
        wall: '#7c8a6a', wallShadow: '#3f4a32', wallLight: '#a3b285',
        roof: '#3a4a2a', roofShadow: '#1a2410', roofTrim: '#0b1206',
        door: '#3a2814', doorTrim: '#1a1006', doorKnob: '#d8b15a',
        window: '#4a5240', shutter: '#2c3a24',
    },
    homestead: {
        wall: '#d6b078', wallShadow: '#946d3e', wallLight: '#f4d39d',
        roof: '#a44a2a', roofShadow: '#5a2010', roofTrim: '#2a0c04',
        door: '#6a3318', doorTrim: '#321408', doorKnob: '#f9e07a',
        window: '#fff3c8', shutter: '#5a8a4a',
    },
};

// Hardware palette shared across huts — stone foundations, brick
// chimneys, planter flowers, and the warm lantern glow that reads as
// "someone lives here" from a distance.
const HUT_TRIM = {
    stone:        '#5a544a',
    stoneLight:   '#7a7468',
    stoneDark:    '#2a2620',
    brick:        '#8a3a22',
    brickLight:   '#a85440',
    brickHi:      '#c46044',
    mortar:       '#3c1d10',
    leaf:         '#6a9050',
    flowerRed:    '#e85a44',
    flowerPink:   '#e8a4b2',
    flowerYellow: '#f4d56a',
    lanternGlow:  '#ffeaa8',
    lanternHi:    '#fff8d0',
    curtain:      '#c43a3a',
    plankHi:      '#8a4a28',
};

export function ensureHutFacadeTexture(game, paletteKey, abandoned = false) {
    const key = `hut_facade_${paletteKey}${abandoned ? '_aged' : ''}`;
    if (game.textures.exists(key)) return key;
    const palette = HUT_PALETTES[paletteKey] || HUT_PALETTES.cozy;
    const T = HUT_TRIM;
    const ts = game.tileSize;
    const w = HUT_TILE_W * ts;
    const h = HUT_TILE_H * ts;
    const tex = game.textures.createCanvas(key, w, h);
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    const roofH = Math.floor(h * 0.4);
    const wallTop = roofH;
    const footingH = 3;            // stone foundation thickness
    const wallBottom = h - footingH;
    const peakX = Math.floor(w / 2);

    // === Wall body ============================================
    ctx.fillStyle = palette.wall;
    ctx.fillRect(0, wallTop, w, wallBottom - wallTop);

    // Horizontal log/plank seams with a paired highlight row.
    for (let y = wallTop + 3; y < wallBottom; y += 4) {
        ctx.fillStyle = palette.wallShadow;
        ctx.fillRect(0, y, w, 1);
        ctx.fillStyle = palette.wallLight;
        ctx.fillRect(0, y + 1, w, 1);
    }

    // Corner timber posts so the cabin reads as framed rather than
    // monolithic. Darkened innermost stripe + light highlight gives the
    // posts a bit of round-log dimensionality.
    ctx.fillStyle = palette.wallShadow;
    ctx.fillRect(0, wallTop, 3, wallBottom - wallTop);
    ctx.fillRect(w - 3, wallTop, 3, wallBottom - wallTop);
    ctx.fillStyle = palette.roofTrim;
    ctx.fillRect(0, wallTop, 1, wallBottom - wallTop);
    ctx.fillRect(w - 1, wallTop, 1, wallBottom - wallTop);
    ctx.fillStyle = palette.wallLight;
    ctx.fillRect(1, wallTop, 1, wallBottom - wallTop);

    // === Stone foundation =====================================
    ctx.fillStyle = T.stone;
    ctx.fillRect(0, wallBottom, w, footingH);
    ctx.fillStyle = T.stoneLight;
    ctx.fillRect(0, wallBottom, w, 1);
    ctx.fillStyle = T.stoneDark;
    ctx.fillRect(0, h - 1, w, 1);
    // Block seams every ~8px, plus a couple of brighter stones for life.
    ctx.fillStyle = T.stoneDark;
    for (let x = 6; x < w; x += 8) {
        ctx.fillRect(x, wallBottom, 1, footingH);
    }
    ctx.fillStyle = T.stoneLight;
    ctx.fillRect(3, wallBottom + 1, 1, 1);
    ctx.fillRect(25, wallBottom + 1, 1, 1);
    ctx.fillRect(42, wallBottom + 1, 1, 1);

    // === Pitched roof =========================================
    for (let y = 0; y < roofH; y++) {
        const slope = Math.floor((y / roofH) * (w / 2));
        const x0 = Math.max(0, peakX - slope - 1);
        const x1 = Math.min(w, peakX + slope + 1);
        let colour;
        if (y <= 1) colour = palette.roofTrim;
        else if (y % 3 === 0) colour = palette.roofShadow;
        else colour = palette.roof;
        ctx.fillStyle = colour;
        ctx.fillRect(x0, y, x1 - x0, 1);
    }
    // Shingle scallops — staggered single-pixel shadows across rows,
    // alternating offsets so the roof reads as overlapping tiles rather
    // than horizontal stripes.
    ctx.fillStyle = palette.roofShadow;
    for (let y = 3; y < roofH - 1; y += 3) {
        const slope = Math.floor((y / roofH) * (w / 2));
        const xStart = peakX - slope;
        const xEnd = peakX + slope;
        const offset = ((y / 3) | 0) % 2 * 2;
        for (let x = xStart + offset; x < xEnd; x += 4) {
            ctx.fillRect(x, y, 1, 1);
        }
    }
    // Eave trim — heavier under-line so the roof feels like it has weight.
    ctx.fillStyle = palette.roofTrim;
    ctx.fillRect(0, roofH, w, 1);
    ctx.fillStyle = palette.wallShadow;
    ctx.fillRect(2, roofH + 1, w - 4, 1);

    // Ridge cap at the peak.
    ctx.fillStyle = palette.roofTrim;
    ctx.fillRect(peakX - 2, 0, 4, 2);
    ctx.fillStyle = palette.roofShadow;
    ctx.fillRect(peakX - 1, 1, 2, 1);

    // === Brick chimney ========================================
    const chimneyX = Math.floor(w * 0.66);
    const chimneyW = 5;
    const chimneyTop = -4;
    const chimneyBase = Math.floor(roofH * 0.5);
    ctx.fillStyle = T.brick;
    ctx.fillRect(chimneyX, chimneyTop, chimneyW, chimneyBase - chimneyTop);
    // Horizontal mortar courses.
    ctx.fillStyle = T.mortar;
    for (let y = chimneyTop + 2; y < chimneyBase; y += 3) {
        ctx.fillRect(chimneyX, y, chimneyW, 1);
    }
    // Running-bond vertical mortar — alternating offsets per course.
    let band = 0;
    for (let y = chimneyTop; y < chimneyBase; y += 3) {
        ctx.fillStyle = T.mortar;
        if (band % 2 === 0) {
            ctx.fillRect(chimneyX + 2, y, 1, 2);
        } else {
            ctx.fillRect(chimneyX + 1, y, 1, 2);
            ctx.fillRect(chimneyX + 3, y, 1, 2);
        }
        band++;
    }
    // A few brighter bricks for variation.
    ctx.fillStyle = T.brickLight;
    ctx.fillRect(chimneyX + 1, chimneyTop + 3, 1, 1);
    ctx.fillRect(chimneyX + 3, chimneyTop + 6, 1, 1);
    ctx.fillRect(chimneyX, chimneyTop + 1, 1, 1);
    // Capstone — a slightly wider stone slab perched on top.
    ctx.fillStyle = T.stoneDark;
    ctx.fillRect(chimneyX - 1, chimneyTop - 1, chimneyW + 2, 2);
    ctx.fillStyle = T.stone;
    ctx.fillRect(chimneyX - 1, chimneyTop - 1, chimneyW + 2, 1);

    // === Door ================================================
    const doorW = Math.floor(ts * 0.9);
    const doorH = Math.floor(ts * 1.6);
    const doorX = Math.floor((w - doorW) / 2);
    const doorY = wallBottom - doorH;
    // Frame
    ctx.fillStyle = palette.doorTrim;
    ctx.fillRect(doorX - 1, doorY - 1, doorW + 2, doorH + 2);
    // Lintel above the door.
    ctx.fillStyle = palette.roofTrim;
    ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, 1);
    ctx.fillStyle = palette.wallShadow;
    ctx.fillRect(doorX - 2, doorY - 1, doorW + 4, 1);
    // Door body
    ctx.fillStyle = palette.door;
    ctx.fillRect(doorX, doorY, doorW, doorH);
    // Plank divisions
    ctx.fillStyle = palette.doorTrim;
    ctx.fillRect(doorX + 2, doorY, 1, doorH);
    ctx.fillRect(doorX + 5, doorY, 1, doorH);
    // Plank highlights for a hint of grain
    ctx.fillStyle = T.plankHi;
    ctx.fillRect(doorX + 1, doorY, 1, doorH);
    ctx.fillRect(doorX + 6, doorY, 1, doorH);
    // Cross-braces (Z-frame battens)
    ctx.fillStyle = palette.doorTrim;
    ctx.fillRect(doorX, doorY + 5, doorW, 1);
    ctx.fillRect(doorX, doorY + 11, doorW, 1);
    // Knob with bezel
    ctx.fillStyle = palette.doorTrim;
    ctx.fillRect(doorX + doorW - 3, doorY + 7, 2, 2);
    ctx.fillStyle = palette.doorKnob;
    ctx.fillRect(doorX + doorW - 2, doorY + 8, 1, 1);

    // === Lantern beside the door =============================
    const lanternX = doorX - 6;
    const lanternY = doorY + 2;
    // Hanging hook
    ctx.fillStyle = palette.roofTrim;
    ctx.fillRect(lanternX + 1, lanternY - 2, 1, 1);
    ctx.fillRect(lanternX + 2, lanternY - 2, 1, 1);
    // Mounting arm
    ctx.fillRect(lanternX + 2, lanternY - 1, 2, 1);
    // Lantern frame (top, sides, bottom cap)
    ctx.fillRect(lanternX, lanternY, 4, 1);
    ctx.fillRect(lanternX, lanternY + 1, 1, 3);
    ctx.fillRect(lanternX + 3, lanternY + 1, 1, 3);
    ctx.fillRect(lanternX, lanternY + 4, 4, 1);
    // Flame glow
    ctx.fillStyle = T.lanternGlow;
    ctx.fillRect(lanternX + 1, lanternY + 1, 2, 3);
    ctx.fillStyle = T.lanternHi;
    ctx.fillRect(lanternX + 1, lanternY + 2, 2, 1);

    // === Windows with planter boxes ==========================
    const winW = Math.floor(ts * 0.7);
    const winH = Math.floor(ts * 0.5);
    const winY = wallTop + 5;
    const drawWindow = (cx) => {
        const wx = cx - Math.floor(winW / 2);
        // Lintel + shadow row
        ctx.fillStyle = palette.roofTrim;
        ctx.fillRect(wx - 1, winY - 2, winW + 2, 1);
        ctx.fillStyle = palette.wallShadow;
        ctx.fillRect(wx - 1, winY - 1, winW + 2, 1);
        // Frame
        ctx.fillStyle = palette.doorTrim;
        ctx.fillRect(wx - 1, winY, winW + 2, winH + 1);
        // Glass
        ctx.fillStyle = palette.window;
        ctx.fillRect(wx, winY, winW, winH);
        // Mullions
        ctx.fillStyle = palette.doorTrim;
        ctx.fillRect(wx + Math.floor(winW / 2), winY, 1, winH);
        ctx.fillRect(wx, winY + Math.floor(winH / 2), winW, 1);
        // Curtain hints in upper corners
        ctx.fillStyle = T.curtain;
        ctx.fillRect(wx, winY, 1, 1);
        ctx.fillRect(wx + winW - 1, winY, 1, 1);
        // Sill (light over shadow)
        ctx.fillStyle = palette.wallLight;
        ctx.fillRect(wx - 2, winY + winH + 1, winW + 4, 1);
        ctx.fillStyle = palette.wallShadow;
        ctx.fillRect(wx - 2, winY + winH + 2, winW + 4, 1);
        // Planter box
        ctx.fillStyle = palette.doorTrim;
        ctx.fillRect(wx - 2, winY + winH + 3, winW + 4, 2);
        ctx.fillStyle = palette.door;
        ctx.fillRect(wx - 2, winY + winH + 3, winW + 4, 1);
        // Flowers spilling out the top of the planter
        const fy = winY + winH + 2;
        const flowerCols = [T.flowerRed, T.flowerPink, T.flowerYellow, T.flowerRed, T.flowerYellow];
        const leafXs = [wx, wx + 2, wx + 4];
        for (const lx of leafXs) {
            if (lx >= 0 && lx < w) {
                ctx.fillStyle = T.leaf;
                ctx.fillRect(lx, fy, 1, 1);
            }
        }
        for (let i = 0; i < flowerCols.length; i++) {
            const fx = wx - 1 + i * 2;
            if (fx >= 0 && fx < w) {
                ctx.fillStyle = flowerCols[i];
                ctx.fillRect(fx, fy, 1, 1);
            }
        }
    };
    drawWindow(Math.floor(w * 0.22));
    drawWindow(Math.floor(w * 0.78));

    if (abandoned) {
        // Boarded windows + cracks for ghost-town huts. Drawn last so it
        // sits over the flower planters and lantern (which an abandoned
        // hut wouldn't have lit anyway).
        ctx.fillStyle = 'rgba(20, 12, 8, 0.55)';
        for (let i = 0; i < 18; i++) {
            const x = Math.floor((i * 13.7) % w);
            const y = wallTop + Math.floor((i * 7.1) % (h - wallTop - 2));
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.fillStyle = palette.doorTrim;
        ctx.fillRect(Math.floor(w * 0.18), winY + Math.floor(winH * 0.2), winW + 4, 2);
        ctx.fillRect(Math.floor(w * 0.74), winY + Math.floor(winH * 0.2), winW + 4, 2);
        // Cover the lantern (extinguished)
        ctx.fillRect(lanternX, lanternY, 4, 5);
        // Slight darkening overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(0, 0, w, h);
    }

    tex.refresh();
    return key;
}

export class Hut extends Tile {
    constructor({game, worldX, worldY, tileDetails, cellDetails}) {
        super({game, worldX, worldY, tileDetails, cellDetails});
        this.init();
    }

    addToGroup() {
        return this.game.hutGroup.add(this.sprite);
    }

    removeFromGroup() {
        return this.game.hutGroup.remove(this.sprite);
    }

    // Huts sit on the surface row above the soil, but they're pure
    // decoration — they must not be pulled into the cave-in evaluation
    // that cascades soil onto whatever is beneath.
    checkState() {}

    get interactionText() {
        return this.tileDetails?.isPlayerHouse ? 'Enter Home' : 'Enter Hut';
    }

    enterHut() {
        if (this._entering) return;
        this._entering = true;
        // Keep the world's frame budget while we're inside; sleeping the
        // GameScene would also stop the player physics body and the next
        // wake-up jitter would dump them through any thin floor seam.
        this.game.scene.pause('GameScene');
        this.game.scene.launch('HouseScene', {
            hut: {
                hutId: this.tileDetails.hutId || `hut_${this.worldX}_${this.worldY}`,
                isPlayerHouse: !!this.tileDetails.isPlayerHouse,
                paletteKey: this.tileDetails.paletteKey || 'dusty',
                decor: this.tileDetails.decor || null,
            },
            returnDoor: {
                worldX: this.worldX,
                worldY: this.worldY,
                chunkKey: this.chunkKey,
                cellX: this.cellX,
                cellY: this.cellY,
            },
        });
        // Reset the lock once GameScene resumes so the player can re-enter.
        this.game.scene.get('GameScene').events.once('resume', () => {
            this._entering = false;
        });
    }

    createSprite() {
        const ts = this.game.tileSize;
        const facadeW = HUT_TILE_W * ts;
        const facadeH = HUT_TILE_H * ts;

        // Door hit body — a single tile centred on the door cell. The
        // surrounding facade is decoration only; the player must be
        // standing in front of THIS tile to see the "↑ to enter" prompt.
        // Adding the rectangle to a static physics group auto-assigns a
        // static body sized to the rectangle.
        const baseSprite = this.game.add.rectangle(this.worldX, this.worldY, ts, ts * 1.4, 0xffffff);
        baseSprite.setAlpha(0);

        const paletteKey = this.tileDetails.paletteKey || (this.tileDetails.isPlayerHouse ? 'homestead' : 'dusty');
        const abandoned = !this.tileDetails.isPlayerHouse;
        const textureKey = ensureHutFacadeTexture(this.game, paletteKey, abandoned);

        // Anchor the facade so its bottom edge sits exactly at the bottom
        // of the door cell — same convention as Tree, lining the building
        // up with the grass line regardless of column surface variation.
        this.facadeSprite = this.game.add.image(this.worldX, this.worldY + ts / 2, textureKey);
        this.facadeSprite.setOrigin(0.5, 1);
        this.facadeSprite.setDisplaySize(facadeW, facadeH);
        this.facadeSprite.setDepth(0.6);

        // Soft warm glow inside the player house window so they can spot
        // their place from a distance at dusk. Ghost huts stay dark.
        if (this.tileDetails.isPlayerHouse) {
            this.windowGlow = this.game.add.rectangle(
                this.worldX, this.worldY - ts * 1.6, ts * 0.6, ts * 0.6, 0xffd27a, 0.35
            );
            this.windowGlow.setDepth(0.59);
            this.windowGlow.setBlendMode(Phaser.BlendModes.ADD);
        }

        // Optional name plate above the door for the player's house.
        if (this.tileDetails.isPlayerHouse) {
            this.namePlate = this.game.add.text(
                this.worldX, this.worldY - ts * 3.4, 'HOME',
                {font: '4px monospace', fill: '#fff1c4', stroke: '#000000', strokeThickness: 2}
            ).setOrigin(0.5, 0.5);
            this.namePlate.setResolution(8);
            this.namePlate.setDepth(0.61);
        }

        this.fadeElements = [this.facadeSprite];
        if (this.windowGlow) this.fadeElements.push(this.windowGlow);
        if (this.namePlate) this.fadeElements.push(this.namePlate);
        return baseSprite;
    }

    destroy(prefs) {
        this.destroyHandler(() => {
            if (!this.active) return;
            this.active = false;
            this.removeFromGroup();
            if (this.facadeSprite) this.facadeSprite.destroy();
            if (this.windowGlow) this.windowGlow.destroy();
            if (this.namePlate) this.namePlate.destroy();
            this.sprite.destroy();
            this._destroyBorderGraphics();
        }, prefs);
    }

    onClick() {
        // Pickaxe + axe shouldn't dismantle the player's home or the ghost
        // town atmosphere — leave the hut unbreakable from world tools.
    }
}
