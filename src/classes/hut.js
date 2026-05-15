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

export function ensureHutFacadeTexture(game, paletteKey, abandoned = false) {
    const key = `hut_facade_${paletteKey}${abandoned ? '_aged' : ''}`;
    if (game.textures.exists(key)) return key;
    const palette = HUT_PALETTES[paletteKey] || HUT_PALETTES.cozy;
    const ts = game.tileSize;
    const w = HUT_TILE_W * ts;
    const h = HUT_TILE_H * ts;
    const tex = game.textures.createCanvas(key, w, h);
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    const roofH = Math.floor(h * 0.42);
    const wallTop = roofH;

    // Wall body
    ctx.fillStyle = palette.wall;
    ctx.fillRect(0, wallTop, w, h - wallTop);

    // Plank seams
    ctx.fillStyle = palette.wallShadow;
    for (let y = wallTop + 3; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
    }
    ctx.fillStyle = palette.wallLight;
    for (let y = wallTop + 4; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
    }

    // Foundation strip
    ctx.fillStyle = palette.wallShadow;
    ctx.fillRect(0, h - 2, w, 2);

    // Pitched roof — drawn as horizontal slabs with a peak at center.
    const peakX = Math.floor(w / 2);
    for (let y = 0; y < roofH; y++) {
        const slope = Math.floor((y / roofH) * (w / 2));
        const x0 = peakX - slope - 1;
        const x1 = peakX + slope + 1;
        const colour = (y === 0 || y === 1) ? palette.roofTrim : (y % 3 === 0 ? palette.roofShadow : palette.roof);
        ctx.fillStyle = colour;
        ctx.fillRect(Math.max(0, x0), y, Math.min(w, x1) - Math.max(0, x0), 1);
    }
    // Roof eaves
    ctx.fillStyle = palette.roofTrim;
    ctx.fillRect(0, roofH - 1, w, 2);

    // Door — centered, takes most of the bottom-middle column
    const doorW = Math.floor(ts * 0.9);
    const doorH = Math.floor(ts * 1.6);
    const doorX = Math.floor((w - doorW) / 2);
    const doorY = h - doorH - 2;
    ctx.fillStyle = palette.doorTrim;
    ctx.fillRect(doorX - 1, doorY - 1, doorW + 2, doorH + 2);
    ctx.fillStyle = palette.door;
    ctx.fillRect(doorX, doorY, doorW, doorH);
    // Door planks
    ctx.fillStyle = palette.doorTrim;
    for (let y = doorY + 2; y < doorY + doorH; y += 3) {
        ctx.fillRect(doorX, y, doorW, 1);
    }
    // Door knob
    ctx.fillStyle = palette.doorKnob;
    ctx.fillRect(doorX + doorW - 2, doorY + Math.floor(doorH * 0.55), 1, 1);

    // Two windows flanking the door
    const winW = Math.floor(ts * 0.6);
    const winH = Math.floor(ts * 0.6);
    const winY = wallTop + Math.floor((h - wallTop - doorH - winH) / 2);
    const drawWindow = (cx) => {
        const wx = cx - Math.floor(winW / 2);
        ctx.fillStyle = palette.doorTrim;
        ctx.fillRect(wx - 1, winY - 1, winW + 2, winH + 2);
        ctx.fillStyle = palette.window;
        ctx.fillRect(wx, winY, winW, winH);
        // Cross frame
        ctx.fillStyle = palette.doorTrim;
        ctx.fillRect(wx + Math.floor(winW / 2), winY, 1, winH);
        ctx.fillRect(wx, winY + Math.floor(winH / 2), winW, 1);
        // Shutters
        ctx.fillStyle = palette.shutter;
        ctx.fillRect(wx - 3, winY, 2, winH);
        ctx.fillRect(wx + winW + 1, winY, 2, winH);
    };
    drawWindow(Math.floor(w * 0.22));
    drawWindow(Math.floor(w * 0.78));

    // Chimney — small notch on the right pitch of the roof
    const chimneyX = Math.floor(w * 0.72);
    const chimneyW = 3;
    const chimneyTop = Math.max(0, Math.floor(roofH * 0.25));
    ctx.fillStyle = palette.roofTrim;
    ctx.fillRect(chimneyX, chimneyTop, chimneyW, roofH - chimneyTop);
    ctx.fillStyle = palette.wallLight;
    ctx.fillRect(chimneyX, chimneyTop, chimneyW, 1);

    if (abandoned) {
        // Boarded windows + cracks for ghost-town huts
        ctx.fillStyle = 'rgba(20, 12, 8, 0.55)';
        for (let i = 0; i < 18; i++) {
            const x = Math.floor((i * 13.7) % w);
            const y = wallTop + Math.floor((i * 7.1) % (h - wallTop - 2));
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.fillStyle = palette.doorTrim;
        ctx.fillRect(Math.floor(w * 0.18), winY + Math.floor(winH * 0.2), Math.floor(winW + 4), 2);
        ctx.fillRect(Math.floor(w * 0.74), winY + Math.floor(winH * 0.2), Math.floor(winW + 4), 2);
        // Slight darkening overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
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
