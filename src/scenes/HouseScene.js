import {HUT_PALETTES} from "../classes/hut";

// Decor catalogue. Each option is a colour or short procedural recipe
// the interior renderer reads when laying out the room. Adding a new
// option here is enough for it to show up in the player-house decor
// panel — the Hut tileDetails just stores its key.
const DECOR_OPTIONS = {
    wallpaper: {
        label: 'Wallpaper',
        items: [
            {key: 'cream',  label: 'Cream',     color: '#e9dcc1', accent: '#c9b58a', stripe: '#d6c39d'},
            {key: 'sage',   label: 'Sage',      color: '#bcd1b4', accent: '#7c9876', stripe: '#a4c19a'},
            {key: 'rose',   label: 'Rose',      color: '#e0bdb6', accent: '#a96e66', stripe: '#cf9e95'},
            {key: 'navy',   label: 'Navy',      color: '#3a4a66', accent: '#1c2a48', stripe: '#2d3c58'},
            {key: 'forest', label: 'Forest',    color: '#3a5a3a', accent: '#1f3b22', stripe: '#2c4830'},
        ],
    },
    floor: {
        label: 'Floor',
        items: [
            {key: 'oak',    label: 'Oak Plank',  base: '#a06a3a', dark: '#5a3818', light: '#bf8554'},
            {key: 'walnut', label: 'Walnut',     base: '#5a3a22', dark: '#2a1808', light: '#7a5234'},
            {key: 'stone',  label: 'Slate',      base: '#6a6a6a', dark: '#3a3a3a', light: '#8a8a8a'},
            {key: 'tile',   label: 'Tile',       base: '#cdb89a', dark: '#7a6a52', light: '#e6d4b6'},
            {key: 'rug',    label: 'Red Rug',    base: '#7a2a22', dark: '#3a1008', light: '#a8443a'},
        ],
    },
    bed: {
        label: 'Bed',
        items: [
            {key: 'quilt',   label: 'Patchwork',  blanket: '#c43a3a', pillow: '#f4e7c6', frame: '#5a3a18'},
            {key: 'sky',     label: 'Sky Blue',   blanket: '#5b9dff', pillow: '#f4f4ff', frame: '#3a4a66'},
            {key: 'pine',    label: 'Pine Green', blanket: '#3a6a3a', pillow: '#e8e1b8', frame: '#2a1808'},
            {key: 'plum',    label: 'Plum',       blanket: '#5a2a4a', pillow: '#f4d4dc', frame: '#3a1822'},
        ],
    },
    rug: {
        label: 'Rug',
        items: [
            {key: 'rag',     label: 'Rag Rug',     base: '#a8443a', stripe: '#f4d56a'},
            {key: 'persian', label: 'Persian',     base: '#3a2a48', stripe: '#c8a04a'},
            {key: 'plain',   label: 'Plain Wool',  base: '#cdb89a', stripe: '#9a8060'},
            {key: 'none',    label: 'No Rug',      base: null,      stripe: null},
        ],
    },
};

const DEFAULT_DECOR = {
    wallpaper: 'cream',
    floor: 'oak',
    bed: 'quilt',
    rug: 'rag',
};

// Abandoned huts use a fixed dim palette and a different room layout —
// no functional furniture, just dust and dilapidation.
const GHOST_PALETTE = {
    wallpaper: {key: 'aged', color: '#4a3a30', accent: '#241a14', stripe: '#3a2a22'},
    floor:     {key: 'rot',  base: '#3a2a1a', dark: '#1a0f08', light: '#5a4030'},
};

function resolveDecor(group, key) {
    const options = DECOR_OPTIONS[group]?.items || [];
    return options.find(o => o.key === key) || options[0];
}

// Room is laid out on a small fixed-pixel canvas and then zoomed up by
// the scene camera so it reads at the same pixel-art density as the
// outdoors. Keeping the logical size tight makes the room feel like a
// hut interior rather than a warehouse, and lets us snap furniture
// positions to whole pixels.
const ROOM_W = 200;
const ROOM_H = 130;
const FLOOR_Y = 110;    // top of floor line
const WALL_TOP_Y = 24;  // top of wallpapered band

export default class HouseScene extends Phaser.Scene {
    constructor() {
        super('HouseScene');
    }

    init(data) {
        this.hut = data?.hut || {hutId: 'unknown', isPlayerHouse: false, paletteKey: 'dusty'};
        this.returnDoor = data?.returnDoor || null;
        this.persistDecor = data?.persistDecor || null;
        this.gameScene = this.scene.get('GameScene');
        // Scenes are reused across launches — reset every per-run flag
        // here so a previous exit lock doesn't trap the player on the
        // second visit ("can't leave the house" repro).
        this._exiting = false;
        this._toast = null;
        this._tvIdx = 0;
        // Tier the platform shelter is sitting at. 0 = bedroll/tarp,
        // 1 = pitched tent, 2 = full cabin. World-placed huts (ghost town)
        // pre-date the tier system and stay at the legacy "full" interior.
        this.homeTier = this.hut.isPlayerHouse ? (this.hut.homeTier ?? 2) : 2;
        // Snapshot the persisted decor (if any) before mutating any fields.
        // Player house: hut.decor lives on the world tile so changes
        // survive reloads; ghost huts ignore decor entirely.
        this.decor = this.hut.isPlayerHouse
            ? {...DEFAULT_DECOR, ...(this.hut.decor || {})}
            : null;
    }

    create() {
        // Tight room frame; the camera zoom magnifies it so the inside
        // feels close to the player rather than a vast empty hall.
        this.cameras.main.setBackgroundColor(0x0a0806);
        const targetZoom = Math.max(3, Math.floor(Math.min(
            this.cameras.main.width / ROOM_W,
            this.cameras.main.height / ROOM_H
        )));
        this.cameras.main.setZoom(targetZoom);
        // Centre the room logical origin (0,0) in screen space.
        this.cameras.main.centerOn(ROOM_W / 2, ROOM_H / 2);
        this.cameras.main.fadeIn(220, 0, 0, 0);

        // Hide the world-scene DOM overlays (light canvas, minimap,
        // toolbar) so they don't bleed through the house. Restored in
        // exitHouse via teardownDom.
        this.hideWorldOverlays();

        this.buildInterior();
        if (this.hut.isPlayerHouse) {
            this.buildHomeFurniture();
        } else {
            this.buildAbandonedFurniture();
        }
        this.buildPlayer();
        this.buildPrompts();
        this.buildVignette();
        // Decorating only makes sense once the player has a real cabin;
        // before that there's no wallpaper or floor to swap.
        if (this.hut.isPlayerHouse && this.homeTier >= 2) this.buildDecorButton();
        this.buildExitButton();

        this.cursors = this.input.keyboard.addKeys({
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up:    Phaser.Input.Keyboard.KeyCodes.UP,
            w:     Phaser.Input.Keyboard.KeyCodes.W,
            down:  Phaser.Input.Keyboard.KeyCodes.S,
            interact: Phaser.Input.Keyboard.KeyCodes.E,
            jump:  Phaser.Input.Keyboard.KeyCodes.SPACE,
        });
        this.input.keyboard.addCapture('SPACE,UP,W');

        this.events.once('shutdown', () => this.teardownDom());
    }

    // ---------- DOM overlay hiding ---------------------------------------

    hideWorldOverlays() {
        // Track every selector we toggled so teardown can restore exactly
        // what we hid, even if the scene gained new HUD pieces over time.
        // The light canvas in particular is critical — it overlays world
        // darkness on top of the screen and would otherwise persist into
        // the interior.
        const selectors = [
            '#light_canvas',
            '#dialogue_canvas',
            '#minimapContainer',
            '#mapViewOverlay',
            '#mapMarkerSwatch',
            '#toolbarContainer',
            '#saveButton',
            '#backToMenuButton',
        ];
        this._hiddenEls = [];
        for (const sel of selectors) {
            document.querySelectorAll(sel).forEach((el) => {
                this._hiddenEls.push({el, prev: el.style.display});
                el.style.display = 'none';
            });
        }
    }

    restoreWorldOverlays() {
        if (!this._hiddenEls) return;
        for (const entry of this._hiddenEls) {
            entry.el.style.display = entry.prev || '';
        }
        this._hiddenEls = null;
    }

    // ---------- Room layers ----------------------------------------------

    buildInterior() {
        const palette = HUT_PALETTES[this.hut.paletteKey] || HUT_PALETTES.dusty;
        const wallpaper = this.hut.isPlayerHouse
            ? resolveDecor('wallpaper', this.decor.wallpaper)
            : GHOST_PALETTE.wallpaper;
        const floor = this.hut.isPlayerHouse
            ? resolveDecor('floor', this.decor.floor)
            : GHOST_PALETTE.floor;
        this.activeDecor = {wallpaper, floor};

        const W = ROOM_W;
        const H = ROOM_H;

        // Outer floor-plan bounds
        this.add.rectangle(W / 2, H / 2, W, H, 0x0a0806).setDepth(0);

        // Ceiling band (dark beam)
        this.add.rectangle(W / 2, WALL_TOP_Y / 2, W, WALL_TOP_Y,
            Phaser.Display.Color.HexStringToColor(palette.roofShadow).color
        ).setDepth(1);
        this.add.rectangle(W / 2, WALL_TOP_Y - 1, W, 2,
            Phaser.Display.Color.HexStringToColor(palette.roofTrim).color
        ).setDepth(1.1);

        // Wallpapered band
        this.wallpaperRect = this.add.rectangle(
            W / 2, (WALL_TOP_Y + FLOOR_Y) / 2, W, FLOOR_Y - WALL_TOP_Y,
            Phaser.Display.Color.HexStringToColor(wallpaper.color).color
        ).setDepth(1);

        this.wallpaperStripes = this.add.graphics().setDepth(2);
        this.drawWallpaperStripes(wallpaper);

        // Skirting board strip
        this.add.rectangle(W / 2, FLOOR_Y - 2, W, 3,
            Phaser.Display.Color.HexStringToColor(palette.roofTrim).color
        ).setDepth(3);

        // Floor body
        this.floorRect = this.add.rectangle(
            W / 2, (FLOOR_Y + H) / 2, W, H - FLOOR_Y,
            Phaser.Display.Color.HexStringToColor(floor.base).color
        ).setDepth(1);

        this.floorPlanks = this.add.graphics().setDepth(2);
        this.drawFloorPlanks(floor);

        this.add.rectangle(W / 2, FLOOR_Y + 1, W, 1, 0x000000, 0.5).setDepth(3.2);

        // Window — only player house gets clear glass; ghost huts get
        // boarded windows handled in buildAbandonedFurniture.
        if (this.hut.isPlayerHouse) {
            const winX = 32, winY = WALL_TOP_Y + 26;
            this.add.rectangle(winX, winY, 26, 22, 0x2a1808).setDepth(3);
            this.add.rectangle(winX, winY, 22, 18, 0x88b4dc).setDepth(3.1);
            this.add.rectangle(winX, winY + 4, 22, 4, 0x4a6a8a).setDepth(3.2);
            this.add.rectangle(winX, winY, 1, 18, 0x2a1808).setDepth(3.3);
            this.add.rectangle(winX, winY, 22, 1, 0x2a1808).setDepth(3.3);

            // Framed photo above the bed area
            this.add.rectangle(W - 60, WALL_TOP_Y + 14, 16, 12, 0x2a1808).setDepth(3);
            this.add.rectangle(W - 60, WALL_TOP_Y + 14, 14, 10, 0xfff1c4).setDepth(3.1);
            this.add.circle(W - 62, WALL_TOP_Y + 14, 1.5, 0x5a8a4a).setDepth(3.2);

            // Wall sconce — warm pin of light, baked into the room layer.
            const sconceX = W / 2;
            const sconceY = WALL_TOP_Y + 10;
            this.add.rectangle(sconceX, sconceY, 2, 4, 0x2a1808).setDepth(3);
            this.add.circle(sconceX, sconceY - 3, 2, 0xffd27a, 0.95).setDepth(3.1).setBlendMode(Phaser.BlendModes.ADD);
            this.add.circle(sconceX, sconceY - 3, 7, 0xffd27a, 0.22).setDepth(3.05).setBlendMode(Phaser.BlendModes.ADD);
        }

        // Optional rug — player only
        this.rugRoot = this.add.container(0, 0).setDepth(3);
        if (this.hut.isPlayerHouse) this.drawRug();

        if (!this.hut.isPlayerHouse) this.drawDilapidation();
    }

    drawWallpaperStripes(wallpaper) {
        const g = this.wallpaperStripes;
        g.clear();
        const stripeColor = Phaser.Display.Color.HexStringToColor(wallpaper.stripe).color;
        g.fillStyle(stripeColor, 0.5);
        const stripeW = 2;
        const gap = 10;
        for (let x = 4; x < ROOM_W; x += gap) {
            g.fillRect(x, WALL_TOP_Y, stripeW, FLOOR_Y - WALL_TOP_Y - 2);
        }
        g.fillStyle(Phaser.Display.Color.HexStringToColor(wallpaper.accent).color, 0.7);
        g.fillRect(0, WALL_TOP_Y, ROOM_W, 1);
        g.fillRect(0, FLOOR_Y - 3, ROOM_W, 1);
    }

    drawFloorPlanks(floor) {
        const g = this.floorPlanks;
        g.clear();
        const darkC = Phaser.Display.Color.HexStringToColor(floor.dark).color;
        const lightC = Phaser.Display.Color.HexStringToColor(floor.light).color;
        const plankH = 6;
        for (let y = FLOOR_Y + plankH; y < ROOM_H; y += plankH) {
            g.fillStyle(darkC, 0.8);
            g.fillRect(0, y, ROOM_W, 1);
            g.fillStyle(lightC, 0.4);
            g.fillRect(0, y + 1, ROOM_W, 1);
        }
    }

    drawRug() {
        this.rugRoot.removeAll(true);
        const rug = resolveDecor('rug', this.decor.rug);
        if (!rug || !rug.base) return;
        const rugW = 56;
        const rugH = 12;
        const rx = ROOM_W / 2 - rugW / 2;
        const ry = FLOOR_Y + 4;
        const base = this.add.rectangle(rx + rugW / 2, ry + rugH / 2, rugW, rugH,
            Phaser.Display.Color.HexStringToColor(rug.base).color);
        const trim = this.add.rectangle(rx + rugW / 2, ry + rugH / 2, rugW - 4, rugH - 4,
            Phaser.Display.Color.HexStringToColor(rug.stripe).color, 0.75);
        const stripeG = this.add.graphics();
        stripeG.fillStyle(Phaser.Display.Color.HexStringToColor(rug.stripe).color, 0.85);
        for (let i = 2; i < rugW - 2; i += 4) {
            stripeG.fillRect(rx + i, ry + 2, 1, rugH - 4);
        }
        this.rugRoot.add([base, trim, stripeG]);
    }

    // Dust, cobwebs, cracks, and graffiti for ghost huts. Drawn straight
    // onto the room layer (no animation) so the abandoned look reads
    // immediately and doesn't need per-frame work.
    drawDilapidation() {
        const g = this.add.graphics().setDepth(3.5);
        // Cobwebs in the upper corners
        g.lineStyle(1, 0xc8c0b0, 0.45);
        const webCorner = (cx, cy, dir) => {
            for (let i = 0; i < 6; i++) {
                g.beginPath();
                g.moveTo(cx, cy);
                g.lineTo(cx + dir * (8 + i * 2), cy + i * 3);
                g.strokePath();
            }
            for (let r = 4; r <= 14; r += 4) {
                g.beginPath();
                g.moveTo(cx + dir * 4, cy + 2);
                g.lineTo(cx + dir * (r + 2), cy + r - 2);
                g.lineTo(cx + dir * (r - 2), cy + r + 2);
                g.strokePath();
            }
        };
        webCorner(0, WALL_TOP_Y, 1);
        webCorner(ROOM_W, WALL_TOP_Y, -1);

        // Wall cracks
        g.lineStyle(1, 0x000000, 0.45);
        const crack = (x, y) => {
            g.beginPath();
            g.moveTo(x, y);
            let cx = x, cy = y;
            for (let i = 0; i < 8; i++) {
                cx += (Math.random() - 0.5) * 6;
                cy += 4;
                g.lineTo(cx, cy);
            }
            g.strokePath();
        };
        crack(40, WALL_TOP_Y + 4);
        crack(120, WALL_TOP_Y + 14);
        crack(170, WALL_TOP_Y + 6);

        // Dust speckles on the floor
        const dust = this.add.graphics().setDepth(3.6);
        dust.fillStyle(0x000000, 0.35);
        for (let i = 0; i < 80; i++) {
            const x = Math.floor(Math.random() * ROOM_W);
            const y = FLOOR_Y + 2 + Math.floor(Math.random() * (ROOM_H - FLOOR_Y - 2));
            dust.fillRect(x, y, 1, 1);
        }
        dust.fillStyle(0xfff1c4, 0.18);
        for (let i = 0; i < 40; i++) {
            const x = Math.floor(Math.random() * ROOM_W);
            const y = FLOOR_Y + 2 + Math.floor(Math.random() * (ROOM_H - FLOOR_Y - 2));
            dust.fillRect(x, y, 1, 1);
        }

        // Boarded-up window where the player-house window would sit
        const winX = 32, winY = WALL_TOP_Y + 26;
        this.add.rectangle(winX, winY, 26, 22, 0x2a1808).setDepth(3);
        this.add.rectangle(winX, winY, 22, 18, 0x1a1208).setDepth(3.1);
        const boardG = this.add.graphics().setDepth(3.4);
        boardG.fillStyle(0x6a4a28, 1);
        boardG.fillRect(winX - 12, winY - 4, 24, 3);
        boardG.fillRect(winX - 12, winY + 2, 24, 3);
        boardG.fillStyle(0x2a1808, 1);
        boardG.fillRect(winX - 12, winY - 4, 24, 1);
        boardG.fillRect(winX - 12, winY + 2, 24, 1);
        // Nails
        boardG.fillStyle(0xc8c0b0, 1);
        for (const yy of [winY - 3, winY + 3]) {
            boardG.fillRect(winX - 10, yy, 1, 1);
            boardG.fillRect(winX + 10, yy, 1, 1);
        }

        // Lone falling leaf / debris pile on the floor
        const debris = this.add.graphics().setDepth(3.7);
        debris.fillStyle(0x5a3a18, 0.85);
        debris.fillRect(110, FLOOR_Y + 14, 8, 2);
        debris.fillRect(112, FLOOR_Y + 12, 4, 2);
        debris.fillStyle(0x3a2a18, 0.85);
        debris.fillRect(140, FLOOR_Y + 16, 6, 2);
    }

    // ---------- Furniture ------------------------------------------------

    buildHomeFurniture() {
        const W = ROOM_W;
        this.furniture = [];
        const tier = this.homeTier;

        // Door — left side. Walking up against it + W/↑ exits.
        const doorX = 22, doorY = FLOOR_Y - 14;
        this.add.rectangle(doorX, doorY, 14, 26, 0x2a1404).setDepth(3);
        this.add.rectangle(doorX, doorY, 10, 22, 0x6a3318).setDepth(3.1);
        const doorG = this.add.graphics().setDepth(3.15);
        doorG.fillStyle(0x2a1404, 0.7);
        for (let i = -9; i < 9; i += 4) doorG.fillRect(doorX - 5, doorY + i, 10, 1);
        this.add.rectangle(doorX + 3, doorY, 1, 1, 0xf4d56a).setDepth(3.2);
        // Welcome mat
        this.add.rectangle(doorX, FLOOR_Y + 5, 14, 3, 0x7a4a1f).setDepth(3.3);
        this.furniture.push({
            kind: 'door',
            x: doorX, y: doorY, range: 12,
            label: 'Leave', interact: () => this.exitHouse(),
        });

        if (tier >= 2) {
            // TV — left of bed, mounted-style on its own console
            const tvX = 70, tvY = FLOOR_Y - 18;
            this.add.rectangle(tvX, tvY + 8, 22, 6, 0x4a3a26).setDepth(3);
            this.add.rectangle(tvX, tvY, 20, 12, 0x111111).setDepth(3.1);
            this.tvScreen = this.add.rectangle(tvX, tvY, 16, 8, 0x2a4a8a).setDepth(3.2);
            this.tvStatic = this.add.graphics().setDepth(3.3);
            this.tvStatic.fillStyle(0xffffff, 0.18);
            for (let y = -3; y <= 3; y += 2) this.tvStatic.fillRect(tvX - 8, tvY + y, 16, 1);
            this.add.rectangle(tvX - 2, tvY + 8, 4, 1, 0x222222).setDepth(3.4);
            this.add.rectangle(tvX + 2, tvY + 8, 4, 1, 0x222222).setDepth(3.4);
            this.tweens.add({
                targets: this.tvScreen,
                alpha: {from: 0.85, to: 1},
                duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            this.furniture.push({
                kind: 'tv', x: tvX, y: tvY, range: 14,
                label: 'Watch TV', interact: () => this.openTv(),
            });
        }

        // Bed (or its lower-tier stand-in). All three tiers have somewhere
        // to sleep, but the visible piece changes:
        //   tier 0 = bedroll on the floor
        //   tier 1 = simple cot
        //   tier 2 = full bed with decor swatches
        const bedX = 122, bedY = FLOOR_Y - 6;
        if (tier >= 2) {
            const bed = resolveDecor('bed', this.decor.bed);
            const bedFrameC = Phaser.Display.Color.HexStringToColor(bed.frame).color;
            const blanketC = Phaser.Display.Color.HexStringToColor(bed.blanket).color;
            const pillowC = Phaser.Display.Color.HexStringToColor(bed.pillow).color;
            this.bedFrame = this.add.rectangle(bedX, bedY, 32, 10, bedFrameC).setDepth(3);
            this.bedBlanket = this.add.rectangle(bedX + 2, bedY - 1, 26, 6, blanketC).setDepth(3.1);
            this.bedPillow = this.add.rectangle(bedX - 10, bedY - 3, 6, 3, pillowC).setDepth(3.2);
            this.add.rectangle(bedX - 14, bedY + 6, 2, 4, bedFrameC).setDepth(2.9);
            this.add.rectangle(bedX + 14, bedY + 6, 2, 4, bedFrameC).setDepth(2.9);
        } else if (tier === 1) {
            // Cot: low frame + thin mattress + small pillow.
            this.add.rectangle(bedX, bedY + 2, 28, 4, 0x4a3220).setDepth(3);
            this.add.rectangle(bedX, bedY - 1, 26, 4, 0x9a7a5a).setDepth(3.1);
            this.add.rectangle(bedX - 9, bedY - 3, 5, 2, 0xe7d8b8).setDepth(3.2);
            this.add.rectangle(bedX - 12, bedY + 5, 1, 4, 0x2a1808).setDepth(2.9);
            this.add.rectangle(bedX + 12, bedY + 5, 1, 4, 0x2a1808).setDepth(2.9);
        } else {
            // Bedroll: blanket-on-floor with a tiny pillow.
            this.add.rectangle(bedX, bedY + 4, 30, 4, 0x5a3a22).setDepth(3);
            this.add.rectangle(bedX, bedY + 2, 26, 5, 0xa8443a).setDepth(3.1);
            this.add.rectangle(bedX - 10, bedY + 1, 5, 2, 0xe7d8b8).setDepth(3.2);
        }
        const bedLabel = tier === 0 ? 'Doze (light rest)' : tier === 1 ? 'Sleep' : 'Sleep';
        this.furniture.push({
            kind: 'bed', x: bedX, y: bedY, range: 16,
            label: bedLabel, interact: () => this.sleepInBed(),
        });

        if (tier >= 2) {
            // Kitchen — far right. Locked behind the cabin upgrade so the
            // tent/raft tiers feel meaningfully sparse.
            const kitchenX = 168, kitchenY = FLOOR_Y - 6;
            this.add.rectangle(kitchenX, kitchenY, 28, 10, 0x8a6a44).setDepth(3);
            this.add.rectangle(kitchenX, kitchenY - 4, 28, 2, 0xb5895a).setDepth(3.1);
            // Stove
            this.add.rectangle(kitchenX - 8, kitchenY - 1, 8, 6, 0x2a2a2a).setDepth(3.2);
            this.add.rectangle(kitchenX - 8, kitchenY - 3, 7, 1, 0x6a6a6a).setDepth(3.3);
            this.add.circle(kitchenX - 10, kitchenY - 1, 0.8, 0xff5a1c).setDepth(3.4);
            this.add.circle(kitchenX - 6, kitchenY - 1, 0.8, 0xff5a1c).setDepth(3.4);
            // Sink
            this.add.rectangle(kitchenX + 8, kitchenY - 1, 8, 5, 0x6a8a99).setDepth(3.2);
            this.add.rectangle(kitchenX + 8, kitchenY - 3, 2, 2, 0xc0d0d8).setDepth(3.3);
            this.furniture.push({
                kind: 'kitchen', x: kitchenX, y: kitchenY, range: 16,
                label: 'Cook', interact: () => this.openKitchen(),
            });
        }
    }

    buildAbandonedFurniture() {
        this.furniture = [];

        // Door is the only working fixture. Aged wood + a sagging mat.
        const doorX = 22, doorY = FLOOR_Y - 14;
        this.add.rectangle(doorX, doorY, 14, 26, 0x1a0e04).setDepth(3);
        this.add.rectangle(doorX, doorY, 10, 22, 0x3a2210).setDepth(3.1);
        const doorG = this.add.graphics().setDepth(3.15);
        doorG.fillStyle(0x0a0604, 0.8);
        for (let i = -9; i < 9; i += 4) doorG.fillRect(doorX - 5, doorY + i, 10, 1);
        // Hanging crooked sign
        this.add.rectangle(doorX, doorY - 16, 16, 4, 0x4a3a22).setDepth(3.4).setAngle(-4);
        this.furniture.push({
            kind: 'door', x: doorX, y: doorY, range: 12,
            label: 'Leave', interact: () => this.exitHouse(),
        });

        // Broken bed frame — no blanket, tilted, mattress half off
        const bedX = 122, bedY = FLOOR_Y - 5;
        this.add.rectangle(bedX, bedY, 32, 8, 0x2a1808).setDepth(3).setAngle(-3);
        this.add.rectangle(bedX + 4, bedY - 1, 18, 4, 0x5a4232).setDepth(3.1).setAngle(-3);
        this.add.rectangle(bedX - 14, bedY + 5, 2, 4, 0x2a1808).setDepth(2.9);
        this.add.rectangle(bedX + 14, bedY + 7, 2, 6, 0x2a1808).setDepth(2.9);

        // Knocked-over stove + shattered counter — no flames, no power
        const kitchenX = 168, kitchenY = FLOOR_Y - 5;
        this.add.rectangle(kitchenX, kitchenY, 26, 8, 0x4a3a26).setDepth(3);
        this.add.rectangle(kitchenX, kitchenY - 3, 26, 2, 0x2a1808).setDepth(3.1);
        // Crack across the counter top
        const counterG = this.add.graphics().setDepth(3.2);
        counterG.lineStyle(1, 0x0a0604, 0.9);
        counterG.beginPath();
        counterG.moveTo(kitchenX - 12, kitchenY - 2);
        counterG.lineTo(kitchenX - 4, kitchenY - 1);
        counterG.lineTo(kitchenX + 6, kitchenY - 3);
        counterG.lineTo(kitchenX + 12, kitchenY - 2);
        counterG.strokePath();
        // Knocked-over stove (lying on its side)
        this.add.rectangle(kitchenX - 8, kitchenY + 2, 8, 4, 0x2a2a2a).setDepth(3.3).setAngle(20);
        this.add.rectangle(kitchenX - 6, kitchenY + 3, 5, 1, 0x4a4a4a).setDepth(3.4).setAngle(20);

        // Broken TV on the floor, screen smashed
        const tvX = 72, tvY = FLOOR_Y + 8;
        this.add.rectangle(tvX, tvY, 20, 12, 0x111111).setDepth(3).setAngle(-12);
        this.add.rectangle(tvX, tvY, 16, 8, 0x222222).setDepth(3.1).setAngle(-12);
        const smashG = this.add.graphics().setDepth(3.2);
        smashG.lineStyle(1, 0xc0c0c0, 0.8);
        const lines = [
            [-6, -3, 6, 3], [-4, 2, 4, -2], [-6, 0, 6, 0],
            [-2, -3, 2, 3], [0, -3, 1, 3],
        ];
        for (const [x1, y1, x2, y2] of lines) {
            smashG.beginPath();
            smashG.moveTo(tvX + x1, tvY + y1);
            smashG.lineTo(tvX + x2, tvY + y2);
            smashG.strokePath();
        }

        // A toppled chair off to the side
        const chairX = 96, chairY = FLOOR_Y + 6;
        this.add.rectangle(chairX, chairY, 8, 6, 0x4a3220).setDepth(3).setAngle(70);
        this.add.rectangle(chairX + 4, chairY - 2, 1, 8, 0x4a3220).setDepth(3.1).setAngle(70);
    }

    // ---------- Player ---------------------------------------------------

    buildPlayer() {
        // Spawn just inside the room — past the door's interaction range
        // so the leave-prompt doesn't immediately appear the instant the
        // player walks in (otherwise the very first input "leave" would
        // bounce them straight back outside).
        const startX = 44;
        const startY = FLOOR_Y - 7;
        this.player = this.physics.add.sprite(startX, startY, 'player_stationary');
        this.player.setDisplaySize(7, 10);
        this.player.setDepth(4);
        this.player.body.setAllowGravity(false);
        this.player.body.setSize(6, 10);
        if (this.anims.exists('stationary')) this.player.play('stationary');

        this.playerHead = this.add.sprite(startX, startY - 1.5, 'player_head');
        this.playerHead.setDisplaySize(7, 7);
        this.playerHead.setDepth(4.1);

        this.shadow = this.add.ellipse(startX, FLOOR_Y, 8, 2, 0x000000, 0.45).setDepth(3.5);
    }

    buildPrompts() {
        this.prompt = this.add.text(0, 0, '', {
            font: '6px monospace',
            color: '#fff1c4',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            padding: {left: 2, right: 2, top: 1, bottom: 1},
        }).setOrigin(0.5, 1).setDepth(50).setVisible(false);
        this.prompt.setResolution(6);

        let title = 'HOME';
        if (!this.hut.isPlayerHouse) title = 'ABANDONED HUT';
        else if (this.homeTier === 0) title = 'BEDROLL CAMP';
        else if (this.homeTier === 1) title = 'TENT';
        this.title = this.add.text(ROOM_W / 2, 6,
            title, {
                font: '7px monospace',
                color: this.hut.isPlayerHouse ? '#fff1c4' : '#a89888',
                stroke: '#000000',
                strokeThickness: 2,
        }).setOrigin(0.5, 0).setDepth(50);
        this.title.setResolution(6);
    }

    buildVignette() {
        // Soft dark border that pulls focus inwards. Drawn as four
        // gradients on the edges of the logical room.
        const v = this.add.graphics().setDepth(60);
        v.fillStyle(0x000000, 0.35);
        v.fillRect(0, 0, ROOM_W, 4);
        v.fillRect(0, ROOM_H - 4, ROOM_W, 4);
        v.fillRect(0, 0, 4, ROOM_H);
        v.fillRect(ROOM_W - 4, 0, 4, ROOM_H);
    }

    // ---------- HUD buttons ---------------------------------------------

    buildExitButton() {
        const exit = document.createElement('button');
        exit.id = 'house_exit_btn';
        exit.className = 'hud-btn';
        exit.dataset.variant = 'accent';
        exit.innerHTML = '<span>Leave House (Esc)</span>';
        Object.assign(exit.style, {
            position: 'absolute',
            top: '18px',
            right: '18px',
            zIndex: '1001',
        });
        document.body.appendChild(exit);
        exit.addEventListener('click', () => this.exitHouse());
        this._exitBtn = exit;

        this.input.keyboard.on('keydown-ESC', () => this.exitHouse());
    }

    buildDecorButton() {
        const btn = document.createElement('button');
        btn.id = 'house_decor_btn';
        btn.className = 'hud-btn';
        btn.dataset.variant = 'primary';
        btn.innerHTML = '<span>Decorate</span>';
        Object.assign(btn.style, {
            position: 'absolute',
            top: '18px',
            left: '18px',
            zIndex: '1001',
        });
        document.body.appendChild(btn);
        btn.addEventListener('click', () => this.openDecorPanel());
        this._decorBtn = btn;
    }

    teardownDom() {
        this._exitBtn?.remove();
        this._decorBtn?.remove();
        this._decorPanel?.remove();
        this._exitBtn = null;
        this._decorBtn = null;
        this._decorPanel = null;
        this.restoreWorldOverlays();
    }

    // ---------- Update loop ---------------------------------------------

    update() {
        if (!this.player) return;
        const speed = 36;
        let vx = 0;
        if (this.cursors.left.isDown)  vx -= speed;
        if (this.cursors.right.isDown) vx += speed;
        this.player.setVelocityX(vx);
        if (vx < 0) {
            this.player.flipX = true;
            this.playerHead.flipX = true;
            if (this.anims.exists('walk')) this.player.play('walk', true);
        } else if (vx > 0) {
            this.player.flipX = false;
            this.playerHead.flipX = false;
            if (this.anims.exists('walk')) this.player.play('walk', true);
        } else {
            if (this.anims.exists('stationary')) this.player.play('stationary', true);
        }

        // Keep the player inside the walls
        const minX = 10, maxX = ROOM_W - 10;
        if (this.player.x < minX) this.player.x = minX;
        if (this.player.x > maxX) this.player.x = maxX;
        this.player.y = FLOOR_Y - 7;

        this.playerHead.x = this.player.x;
        this.playerHead.y = this.player.y - 1.5;
        this.shadow.x = this.player.x;

        // Find nearest interactable
        let nearest = null;
        let bestDist = Infinity;
        for (const f of this.furniture) {
            const d = Math.abs(this.player.x - f.x);
            if (d < f.range && d < bestDist) {
                nearest = f;
                bestDist = d;
            }
        }
        this.activeFurniture = nearest;

        if (nearest) {
            const isDoor = nearest.kind === 'door';
            const key = isDoor ? 'W/↑' : 'E';
            this.prompt.setText(`${key} ${nearest.label}`);
            this.prompt.setPosition(nearest.x, nearest.y - 14);
            this.prompt.setVisible(true);
        } else {
            this.prompt.setVisible(false);
        }

        if (nearest) {
            if (nearest.kind === 'door') {
                if (Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                    Phaser.Input.Keyboard.JustDown(this.cursors.w)) {
                    nearest.interact();
                    return;
                }
            } else {
                if (Phaser.Input.Keyboard.JustDown(this.cursors.interact)) {
                    nearest.interact();
                    return;
                }
            }
        }
    }

    // ---------- Actions --------------------------------------------------

    exitHouse() {
        if (this._exiting) return;
        this._exiting = true;
        this.cameras.main.fadeOut(220, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.teardownDom();
            const gs = this.gameScene;
            this.scene.stop();
            gs?.scene.resume();
        });
    }

    sleepInBed() {
        const player = this.gameScene?.player;
        if (!player) return;
        const overlay = this.add.rectangle(
            ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 0x000000, 0
        ).setDepth(80);
        this.prompt.setVisible(false);
        // Restoration scales with the rig tier so the upgrade ladder pays
        // off in survivability, not just looks. Tier 0 is a stop-gap "doze"
        // worth ~30%, tier 1 is a comfortable cot at 60%, tier 2 maxes out.
        const factor = this.homeTier >= 2 ? 1.0 : this.homeTier === 1 ? 0.6 : 0.3;
        const energyGain = Math.round(player.maxEnergy * factor);
        const breathGain = Math.round(player.maxBreath * factor);
        const healthGain = Math.round(25 * factor);
        this.tweens.add({
            targets: overlay,
            alpha: 0.85,
            duration: 600, yoyo: true, hold: 600,
            onComplete: () => {
                player.energy = Math.min(player.maxEnergy, player.energy + energyGain);
                player.breath = Math.min(player.maxBreath, player.breath + breathGain);
                player.health = Math.min(player.maxHealth, player.health + healthGain);
                overlay.destroy();
                const msg = this.homeTier >= 2
                    ? 'Rested. Stats restored.'
                    : this.homeTier === 1
                        ? 'Rough sleep in the tent. Partially rested.'
                        : 'Catnap on the bedroll. Lightly rested.';
                this.flashToast(msg);
            },
        });
    }

    openKitchen() {
        this.flashToast('Kitchen — recipes coming soon.');
    }

    openTv() {
        const channels = [0x2a4a8a, 0x8a3a3a, 0x3a8a4a, 0x6a2a8a, 0xc0a040];
        this._tvIdx = ((this._tvIdx ?? 0) + 1) % channels.length;
        this.tvScreen.setFillStyle(channels[this._tvIdx]);
        this.flashToast(`Channel ${this._tvIdx + 1} — programming coming soon.`);
    }

    flashToast(text) {
        if (this._toast) this._toast.destroy();
        this._toast = this.add.text(ROOM_W / 2, ROOM_H - 12, text, {
            font: '5px monospace',
            color: '#fff1c4',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: {left: 2, right: 2, top: 1, bottom: 1},
        }).setOrigin(0.5).setDepth(80);
        this._toast.setResolution(6);
        this.tweens.add({
            targets: this._toast,
            alpha: {from: 1, to: 0},
            delay: 1400, duration: 600,
            onComplete: () => {
                this._toast?.destroy();
                this._toast = null;
            },
        });
    }

    openDecorPanel() {
        if (this._decorPanel) {
            this._decorPanel.remove();
            this._decorPanel = null;
            return;
        }
        const panel = document.createElement('div');
        panel.className = 'hud-panel';
        panel.id = 'house_decor_panel';
        Object.assign(panel.style, {
            position: 'absolute',
            top: '60px',
            left: '18px',
            zIndex: '1002',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '220px',
        });
        const title = document.createElement('div');
        title.textContent = 'Decorate Home';
        title.style.fontWeight = '700';
        title.style.letterSpacing = '0.05em';
        panel.appendChild(title);

        for (const group of Object.keys(DECOR_OPTIONS)) {
            const cfg = DECOR_OPTIONS[group];
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.flexDirection = 'column';
            row.style.gap = '4px';
            const label = document.createElement('div');
            label.textContent = cfg.label;
            label.style.fontSize = '11px';
            label.style.opacity = '0.7';
            row.appendChild(label);

            const buttons = document.createElement('div');
            buttons.style.display = 'flex';
            buttons.style.flexWrap = 'wrap';
            buttons.style.gap = '4px';
            cfg.items.forEach(item => {
                const b = document.createElement('button');
                b.className = 'hud-btn';
                b.textContent = item.label;
                b.style.padding = '4px 8px';
                b.style.fontSize = '10px';
                if (this.decor[group] === item.key) {
                    b.style.borderColor = 'rgba(91, 157, 255, 0.6)';
                    b.style.color = '#cfe1ff';
                }
                b.addEventListener('click', () => this.applyDecor(group, item.key));
                buttons.appendChild(b);
            });
            row.appendChild(buttons);
            panel.appendChild(row);
        }

        document.body.appendChild(panel);
        this._decorPanel = panel;
    }

    applyDecor(group, key) {
        this.decor[group] = key;
        if (this.hut.isPlayerHouse) {
            if (this.persistDecor) {
                this.persistDecor(group, key);
            } else if (this.returnDoor && this.gameScene?.grid) {
                const grid = this.gameScene.grid;
                const {chunkKey, cellX, cellY} = this.returnDoor;
                const cell = grid?.[chunkKey]?.[cellY]?.[cellX];
                if (cell) {
                    cell.decor = {...(cell.decor || {}), [group]: key};
                }
            }
        }

        if (group === 'wallpaper') {
            const wp = resolveDecor('wallpaper', key);
            this.wallpaperRect.setFillStyle(Phaser.Display.Color.HexStringToColor(wp.color).color);
            this.drawWallpaperStripes(wp);
        } else if (group === 'floor') {
            const fl = resolveDecor('floor', key);
            this.floorRect.setFillStyle(Phaser.Display.Color.HexStringToColor(fl.base).color);
            this.drawFloorPlanks(fl);
        } else if (group === 'bed') {
            const bd = resolveDecor('bed', key);
            this.bedFrame.setFillStyle(Phaser.Display.Color.HexStringToColor(bd.frame).color);
            this.bedBlanket.setFillStyle(Phaser.Display.Color.HexStringToColor(bd.blanket).color);
            this.bedPillow.setFillStyle(Phaser.Display.Color.HexStringToColor(bd.pillow).color);
        } else if (group === 'rug') {
            this.drawRug();
        }

        if (this._decorPanel) {
            this._decorPanel.remove();
            this._decorPanel = null;
            this.openDecorPanel();
        }
    }
}
