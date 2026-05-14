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

const GHOST_DECOR = {
    wallpaper: 'navy',
    floor: 'walnut',
    bed: 'pine',
    rug: 'none',
};

function resolveDecor(group, key) {
    const options = DECOR_OPTIONS[group]?.items || [];
    return options.find(o => o.key === key) || options[0];
}

export default class HouseScene extends Phaser.Scene {
    constructor() {
        super('HouseScene');
    }

    init(data) {
        this.hut = data?.hut || {hutId: 'unknown', isPlayerHouse: false, paletteKey: 'dusty'};
        this.returnDoor = data?.returnDoor || null;
        this.gameScene = this.scene.get('GameScene');
        // Snapshot the persisted decor (if any) before mutating any fields.
        // Player house: hut.decor lives on the world tile so changes
        // survive reloads; ghost huts use the immutable GHOST_DECOR.
        const persisted = this.hut.isPlayerHouse
            ? {...DEFAULT_DECOR, ...(this.hut.decor || {})}
            : {...GHOST_DECOR, ...(this.hut.decor || {})};
        this.decor = persisted;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x000000);
        this.cameras.main.fadeIn(220, 0, 0, 0);

        this.layout = this.computeLayout();
        this.buildInterior();
        this.buildFurniture();
        this.buildPlayer();
        this.buildPrompts();
        if (this.hut.isPlayerHouse) this.buildDecorButton();
        this.buildExitButton();

        this.cursors = this.input.keyboard.addKeys({
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up:    Phaser.Input.Keyboard.KeyCodes.UP,
            down:  Phaser.Input.Keyboard.KeyCodes.S,
            interact: Phaser.Input.Keyboard.KeyCodes.E,
            jump:  Phaser.Input.Keyboard.KeyCodes.SPACE,
        });
        this.input.keyboard.addCapture('SPACE,UP');

        this.events.once('shutdown', () => this.teardownDom());
    }

    computeLayout() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        // Room sits in a fixed-aspect frame regardless of window size so
        // furniture proportions stay readable.
        const targetAspect = 16 / 9;
        const frameH = Math.min(h - 80, 540);
        const frameW = Math.min(w - 80, frameH * targetAspect);
        const fx = Math.round((w - frameW) / 2);
        const fy = Math.round((h - frameH) / 2);
        return {
            w, h,
            frameX: fx,
            frameY: fy,
            frameW,
            frameH,
            floorY: fy + Math.round(frameH * 0.78),
            wallTopY: fy + Math.round(frameH * 0.10),
        };
    }

    buildInterior() {
        const {frameX, frameY, frameW, frameH, floorY, wallTopY} = this.layout;
        const palette = HUT_PALETTES[this.hut.paletteKey] || HUT_PALETTES.dusty;
        const wallpaper = resolveDecor('wallpaper', this.decor.wallpaper);
        const floor = resolveDecor('floor', this.decor.floor);
        this.activeDecor = {wallpaper, floor};

        // Outer frame — soft drop shadow
        const shadow = this.add.rectangle(frameX + frameW / 2 + 6, frameY + frameH / 2 + 8, frameW, frameH, 0x000000, 0.45);
        shadow.setDepth(0);

        // Ceiling beam strip
        const ceiling = this.add.rectangle(frameX + frameW / 2, frameY + (wallTopY - frameY) / 2, frameW, wallTopY - frameY, Phaser.Display.Color.HexStringToColor(palette.roofShadow).color);
        ceiling.setDepth(1);

        // Wallpapered wall
        this.wallpaperRect = this.add.rectangle(frameX + frameW / 2, (wallTopY + floorY) / 2, frameW, floorY - wallTopY, Phaser.Display.Color.HexStringToColor(wallpaper.color).color);
        this.wallpaperRect.setDepth(1);

        // Wallpaper stripes overlay (drawn lazily via Graphics so they
        // re-render when decor changes)
        this.wallpaperStripes = this.add.graphics();
        this.wallpaperStripes.setDepth(2);
        this.drawWallpaperStripes(wallpaper);

        // Skirting / chair-rail trim above the floor
        this.add.rectangle(frameX + frameW / 2, floorY - 6, frameW, 4, Phaser.Display.Color.HexStringToColor(palette.roofTrim).color).setDepth(3);
        this.add.rectangle(frameX + frameW / 2, floorY - 4, frameW, 1, Phaser.Display.Color.HexStringToColor(palette.wallShadow).color).setDepth(3.1);

        // Floor body
        this.floorRect = this.add.rectangle(frameX + frameW / 2, (floorY + frameY + frameH) / 2, frameW, frameY + frameH - floorY, Phaser.Display.Color.HexStringToColor(floor.base).color);
        this.floorRect.setDepth(1);

        this.floorPlanks = this.add.graphics();
        this.floorPlanks.setDepth(2);
        this.drawFloorPlanks(floor);

        // Front-edge floor shadow line
        this.add.rectangle(frameX + frameW / 2, floorY, frameW, 2, 0x000000, 0.45).setDepth(3.2);

        // A small framed photo on the wall — gives the room some life
        const photoX = frameX + Math.round(frameW * 0.18);
        const photoY = wallTopY + 36;
        this.add.rectangle(photoX, photoY, 32, 24, 0x2a1808).setDepth(3);
        this.add.rectangle(photoX, photoY, 28, 20, 0xfff1c4).setDepth(3.1);
        this.add.rectangle(photoX - 6, photoY + 4, 6, 6, 0x5a8a4a).setDepth(3.2);
        this.add.rectangle(photoX + 4, photoY + 2, 8, 8, 0x88b4dc).setDepth(3.2);

        // A wall sconce for warmth
        const sconceX = frameX + Math.round(frameW * 0.5);
        const sconceY = wallTopY + 24;
        this.add.rectangle(sconceX, sconceY, 4, 8, 0x2a1808).setDepth(3);
        this.add.circle(sconceX, sconceY - 6, 4, 0xffd27a, 0.85).setDepth(3.1).setBlendMode(Phaser.BlendModes.ADD);
        this.add.circle(sconceX, sconceY - 6, 14, 0xffd27a, 0.18).setDepth(3.05).setBlendMode(Phaser.BlendModes.ADD);

        // Window with sky behind it
        const winX = frameX + Math.round(frameW * 0.82);
        const winY = wallTopY + 44;
        this.add.rectangle(winX, winY, 64, 48, 0x2a1808).setDepth(3);
        this.add.rectangle(winX, winY, 58, 42, 0x88b4dc).setDepth(3.1);
        this.add.rectangle(winX, winY + 8, 58, 8, 0x4a6a8a).setDepth(3.2);
        this.add.rectangle(winX, winY, 2, 42, 0x2a1808).setDepth(3.3);
        this.add.rectangle(winX, winY, 58, 2, 0x2a1808).setDepth(3.3);

        // Optional rug on the floor
        this.rugRoot = this.add.container(0, 0).setDepth(3);
        this.drawRug();
    }

    drawWallpaperStripes(wallpaper) {
        const {frameX, frameW, frameY} = this.layout;
        const wallTopY = this.layout.wallTopY;
        const wallBotY = this.layout.floorY - 4;
        const g = this.wallpaperStripes;
        g.clear();
        const stripeColor = Phaser.Display.Color.HexStringToColor(wallpaper.stripe).color;
        g.fillStyle(stripeColor, 0.55);
        const stripeW = 4;
        const gap = 18;
        for (let x = frameX + 8; x < frameX + frameW; x += gap) {
            g.fillRect(x, wallTopY, stripeW, wallBotY - wallTopY);
        }
        g.fillStyle(Phaser.Display.Color.HexStringToColor(wallpaper.accent).color, 0.7);
        g.fillRect(frameX, wallTopY, frameW, 2);
        g.fillRect(frameX, wallBotY - 2, frameW, 2);
    }

    drawFloorPlanks(floor) {
        const {frameX, frameW, floorY, frameY, frameH} = this.layout;
        const g = this.floorPlanks;
        g.clear();
        g.fillStyle(Phaser.Display.Color.HexStringToColor(floor.dark).color, 0.85);
        const plankH = 12;
        const bottom = frameY + frameH;
        for (let y = floorY + plankH; y < bottom; y += plankH) {
            g.fillRect(frameX, y, frameW, 1);
        }
        g.fillStyle(Phaser.Display.Color.HexStringToColor(floor.light).color, 0.45);
        for (let y = floorY + plankH + 1; y < bottom; y += plankH) {
            g.fillRect(frameX, y, frameW, 1);
        }
    }

    drawRug() {
        this.rugRoot.removeAll(true);
        const rug = resolveDecor('rug', this.decor.rug);
        if (!rug || !rug.base) return;
        const {frameX, frameW, floorY, frameY, frameH} = this.layout;
        const rugW = Math.round(frameW * 0.30);
        const rugH = 26;
        const rx = frameX + Math.round(frameW * 0.50) - rugW / 2;
        const ry = floorY + 6;
        const base = this.add.rectangle(rx + rugW / 2, ry + rugH / 2, rugW, rugH, Phaser.Display.Color.HexStringToColor(rug.base).color);
        const trim = this.add.rectangle(rx + rugW / 2, ry + rugH / 2, rugW - 4, rugH - 6, Phaser.Display.Color.HexStringToColor(rug.stripe).color, 0.8);
        const stripeG = this.add.graphics();
        stripeG.fillStyle(Phaser.Display.Color.HexStringToColor(rug.stripe).color, 0.85);
        for (let i = 0; i < rugW; i += 8) {
            stripeG.fillRect(rx + i, ry + 4, 2, rugH - 8);
        }
        this.rugRoot.add([base, trim, stripeG]);
    }

    buildFurniture() {
        const {frameX, frameW, floorY} = this.layout;
        this.furniture = [];

        // Door — left third of the room. Walking into it + ↑ exits.
        const doorX = frameX + Math.round(frameW * 0.13);
        const doorY = floorY - 30;
        const doorFrame = this.add.rectangle(doorX, doorY, 28, 60, 0x2a1404).setDepth(3);
        const door = this.add.rectangle(doorX, doorY, 22, 54, 0x6a3318).setDepth(3.1);
        this.add.rectangle(doorX + 6, doorY, 2, 2, 0xf4d56a).setDepth(3.2);
        // Plank lines on the door
        const doorG = this.add.graphics().setDepth(3.15);
        doorG.fillStyle(0x2a1404, 0.7);
        for (let i = -20; i < 20; i += 8) {
            doorG.fillRect(doorX - 11, doorY + i, 22, 1);
        }
        const doorMat = this.add.rectangle(doorX, floorY + 4, 30, 6, 0x7a4a1f).setDepth(3.3);
        const doorLabel = this.add.text(doorX, doorY - 38, 'Door', {font: '10px monospace', color: '#fff1c4'}).setOrigin(0.5).setDepth(3.4);
        this.furniture.push({
            kind: 'door',
            x: doorX,
            y: doorY,
            range: 26,
            label: 'Leave',
            sprite: door,
            interact: () => this.exitHouse(),
        });

        // Bed — middle-right
        const bedX = frameX + Math.round(frameW * 0.62);
        const bedY = floorY - 14;
        const bed = resolveDecor('bed', this.decor.bed);
        const bedFrameC = Phaser.Display.Color.HexStringToColor(bed.frame).color;
        const blanketC = Phaser.Display.Color.HexStringToColor(bed.blanket).color;
        const pillowC = Phaser.Display.Color.HexStringToColor(bed.pillow).color;
        this.bedFrame = this.add.rectangle(bedX, bedY, 66, 22, bedFrameC).setDepth(3);
        this.bedBlanket = this.add.rectangle(bedX + 4, bedY - 2, 56, 16, blanketC).setDepth(3.1);
        this.bedPillow = this.add.rectangle(bedX - 22, bedY - 6, 14, 8, pillowC).setDepth(3.2);
        this.add.rectangle(bedX - 30, bedY + 8, 4, 8, bedFrameC).setDepth(2.9);
        this.add.rectangle(bedX + 30, bedY + 8, 4, 8, bedFrameC).setDepth(2.9);
        const bedLabel = this.add.text(bedX, bedY - 22, 'Bed', {font: '10px monospace', color: '#fff1c4'}).setOrigin(0.5).setDepth(3.4);
        this.furniture.push({
            kind: 'bed',
            x: bedX,
            y: bedY,
            range: 36,
            label: 'Sleep',
            interact: () => this.sleepInBed(),
        });

        // Kitchen — far right
        const kitchenX = frameX + Math.round(frameW * 0.88);
        const kitchenY = floorY - 14;
        const counter = this.add.rectangle(kitchenX, kitchenY, 60, 22, 0x8a6a44).setDepth(3);
        this.add.rectangle(kitchenX, kitchenY - 8, 60, 6, 0xb5895a).setDepth(3.1);
        // Stove
        this.add.rectangle(kitchenX - 16, kitchenY - 4, 18, 14, 0x2a2a2a).setDepth(3.2);
        this.add.rectangle(kitchenX - 16, kitchenY - 9, 14, 2, 0x6a6a6a).setDepth(3.3);
        this.add.circle(kitchenX - 20, kitchenY - 4, 1.5, 0xff5a1c).setDepth(3.4);
        this.add.circle(kitchenX - 12, kitchenY - 4, 1.5, 0xff5a1c).setDepth(3.4);
        // Sink
        this.add.rectangle(kitchenX + 16, kitchenY - 4, 16, 12, 0x6a8a99).setDepth(3.2);
        this.add.rectangle(kitchenX + 16, kitchenY - 8, 4, 6, 0xc0d0d8).setDepth(3.3);
        const kitchenLabel = this.add.text(kitchenX, kitchenY - 22, 'Kitchen', {font: '10px monospace', color: '#fff1c4'}).setOrigin(0.5).setDepth(3.4);
        this.furniture.push({
            kind: 'kitchen',
            x: kitchenX,
            y: kitchenY,
            range: 36,
            label: 'Cook',
            interact: () => this.openKitchen(),
        });

        // TV — left of bed, mounted-style on its own console
        const tvX = frameX + Math.round(frameW * 0.36);
        const tvY = floorY - 26;
        this.add.rectangle(tvX, tvY + 14, 40, 12, 0x4a3a26).setDepth(3); // console
        this.add.rectangle(tvX, tvY, 36, 22, 0x111111).setDepth(3.1);   // bezel
        this.tvScreen = this.add.rectangle(tvX, tvY, 30, 16, 0x2a4a8a).setDepth(3.2);
        // Static lines
        this.tvStatic = this.add.graphics().setDepth(3.3);
        this.tvStatic.fillStyle(0xffffff, 0.18);
        for (let y = -7; y < 7; y += 2) this.tvStatic.fillRect(tvX - 14, tvY + y, 28, 1);
        this.add.rectangle(tvX - 4, tvY + 14, 8, 2, 0x222222).setDepth(3.4);
        this.add.rectangle(tvX + 4, tvY + 14, 8, 2, 0x222222).setDepth(3.4);
        const tvLabel = this.add.text(tvX, tvY - 16, 'TV', {font: '10px monospace', color: '#fff1c4'}).setOrigin(0.5).setDepth(3.4);
        this.furniture.push({
            kind: 'tv',
            x: tvX,
            y: tvY,
            range: 32,
            label: 'Watch TV',
            interact: () => this.openTv(),
        });

        // Subtle TV flicker
        this.tweens.add({
            targets: this.tvScreen,
            alpha: {from: 0.85, to: 1},
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    buildPlayer() {
        const {frameX, frameW, floorY} = this.layout;
        // Drop the player just inside the door so the very first thing
        // they see is themselves having walked in. Use the existing
        // player_walk spritesheet for visual consistency with the world.
        const startX = frameX + Math.round(frameW * 0.20);
        const startY = floorY - 16;
        this.player = this.physics.add.sprite(startX, startY, 'player_stationary');
        this.player.setDisplaySize(20, 28);
        this.player.setDepth(4);
        this.player.body.setAllowGravity(false);
        this.player.body.setSize(14, 28);
        // Reuse the global animations registered by PlayerManager.
        if (this.anims.exists('walk')) this.player.play('stationary');

        this.playerHead = this.add.sprite(startX, startY - 8, 'player_head');
        this.playerHead.setDisplaySize(20, 20);
        this.playerHead.setDepth(4.1);

        this.shadow = this.add.ellipse(startX, floorY - 1, 24, 6, 0x000000, 0.4).setDepth(3.5);
    }

    buildPrompts() {
        // Floating prompt that follows the player when they're in range
        // of an interactable.
        this.prompt = this.add.text(0, 0, '', {
            font: '12px monospace',
            color: '#fff1c4',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: {left: 6, right: 6, top: 3, bottom: 3},
        }).setOrigin(0.5, 1).setDepth(50).setVisible(false);

        this.title = this.add.text(this.layout.frameX + this.layout.frameW / 2, this.layout.frameY + 24,
            this.hut.isPlayerHouse ? 'HOME' : 'ABANDONED HUT', {
                font: '14px monospace',
                color: '#fff1c4',
                stroke: '#000000',
                strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);
    }

    buildExitButton() {
        const {frameX, frameY} = this.layout;
        const exit = document.createElement('button');
        exit.id = 'house_exit_btn';
        exit.className = 'hud-btn';
        exit.dataset.variant = 'accent';
        exit.innerHTML = '<span>Leave House (Esc)</span>';
        Object.assign(exit.style, {
            position: 'absolute',
            top: (frameY - 8) + 'px',
            right: (this.cameras.main.width - frameX - this.layout.frameW + 4) + 'px',
            zIndex: '1001',
        });
        document.body.appendChild(exit);
        exit.addEventListener('click', () => this.exitHouse());
        this._exitBtn = exit;

        this.input.keyboard.on('keydown-ESC', () => this.exitHouse());
    }

    buildDecorButton() {
        const {frameX, frameY, frameW} = this.layout;
        const btn = document.createElement('button');
        btn.id = 'house_decor_btn';
        btn.className = 'hud-btn';
        btn.dataset.variant = 'primary';
        btn.innerHTML = '<span>Decorate</span>';
        Object.assign(btn.style, {
            position: 'absolute',
            top: (frameY - 8) + 'px',
            left: (frameX + 4) + 'px',
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
    }

    update() {
        if (!this.player) return;
        const speed = 90;
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

        // Clamp player to the room walls
        const minX = this.layout.frameX + 14;
        const maxX = this.layout.frameX + this.layout.frameW - 14;
        if (this.player.x < minX) this.player.x = minX;
        if (this.player.x > maxX) this.player.x = maxX;
        // Pin Y so they walk along the floor (no gravity in the house)
        this.player.y = this.layout.floorY - 16;

        this.playerHead.x = this.player.x;
        this.playerHead.y = this.player.y - 10;
        this.shadow.x = this.player.x;

        // Find the nearest interactable in range
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
            const key = isDoor ? '↑' : 'E';
            this.prompt.setText(`${key} to ${nearest.label}`);
            this.prompt.setPosition(nearest.x, nearest.y - 30);
            this.prompt.setVisible(true);
        } else {
            this.prompt.setVisible(false);
        }

        if (nearest) {
            if (nearest.kind === 'door') {
                if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
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

    exitHouse() {
        if (this._exiting) return;
        this._exiting = true;
        this.cameras.main.fadeOut(220, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.stop();
            this.gameScene?.scene.resume();
        });
    }

    sleepInBed() {
        const player = this.gameScene?.player;
        if (!player) return;
        // Quick rest: top energy + breath, dim the screen for a beat.
        const overlay = this.add.rectangle(
            this.layout.w / 2, this.layout.h / 2,
            this.layout.w, this.layout.h,
            0x000000, 0
        ).setDepth(80);
        this.prompt.setVisible(false);
        this.tweens.add({
            targets: overlay,
            alpha: 0.85,
            duration: 600,
            yoyo: true,
            hold: 600,
            onComplete: () => {
                player.energy = player.maxEnergy;
                player.breath = player.maxBreath;
                player.health = Math.min(player.maxHealth, player.health + 25);
                overlay.destroy();
                this.flashToast('Rested. Energy restored.');
            },
        });
    }

    openKitchen() {
        this.flashToast('Kitchen — recipes coming soon.');
    }

    openTv() {
        // Cycle the screen through a few channel colours as a teaser.
        const channels = [0x2a4a8a, 0x8a3a3a, 0x3a8a4a, 0x6a2a8a, 0xc0a040];
        this._tvIdx = ((this._tvIdx ?? 0) + 1) % channels.length;
        this.tvScreen.setFillStyle(channels[this._tvIdx]);
        this.flashToast(`Channel ${this._tvIdx + 1} — programming coming soon.`);
    }

    flashToast(text) {
        if (this._toast) this._toast.destroy();
        this._toast = this.add.text(this.layout.w / 2, this.layout.h - 80, text, {
            font: '12px monospace',
            color: '#fff1c4',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: {left: 8, right: 8, top: 4, bottom: 4},
        }).setOrigin(0.5).setDepth(80);
        this.tweens.add({
            targets: this._toast,
            alpha: {from: 1, to: 0},
            delay: 1400,
            duration: 600,
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
            top: (this.layout.frameY + 30) + 'px',
            left: (this.layout.frameX + 8) + 'px',
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
        // Persist on the world tile for the player house so reloads keep
        // the same look. Find the hut tile from the returnDoor coords.
        if (this.hut.isPlayerHouse && this.returnDoor && this.gameScene?.grid) {
            const grid = this.gameScene.grid;
            const {chunkKey, cellX, cellY} = this.returnDoor;
            const cell = grid?.[chunkKey]?.[cellY]?.[cellX];
            if (cell) {
                cell.decor = {...(cell.decor || {}), [group]: key};
            }
        }

        // Re-render the affected layer
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

        // Refresh decorate panel so the active highlight follows
        if (this._decorPanel) {
            this._decorPanel.remove();
            this._decorPanel = null;
            this.openDecorPanel();
        }
    }
}
