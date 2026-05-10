export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super("PreloadScene");
    }

    preload() {
        this.load.spritesheet('player_walk', 'images/player_walking.png', {
            frameWidth: 55,
            frameHeight: 70
        });
        this.load.spritesheet('player_stationary', 'images/player_stationary.png', {
            frameWidth: 55,
            frameHeight: 70
        });
        this.load.spritesheet('player_jump', 'images/player_jumping.png', {
            frameWidth: 55,
            frameHeight: 70
        });
        this.load.spritesheet('player_head', 'images/player_head.png', {
            frameWidth: 55,
            frameHeight: 49
        });

        this.load.spritesheet('lift-control', 'images/lift-control.png', {
            frameWidth: 100,
            frameHeight: 100
        });
        this.load.image("energy", "images/energy.png");
        this.load.image("door", "images/door.png");
        this.load.image("wall", "images/door.png");
        this.load.image('dust', 'images/particles/dust.png');
        this.load.image('crack', 'images/cracked.png');
        this.load.image('lamp', 'images/lamp.png');
        this.load.image('coal', 'images/coal.png');
        this.load.image('pickaxe', 'images/pickaxe.png');
        this.load.image('wood', 'images/wood.png');
        this.load.image('buttress', 'images/buttress.png');
        this.load.image('glowstick', 'images/glow-stick.png');
        this.load.image('rail', 'images/rail.png');
        this.load.image('minecart', 'images/mine-cart.png');
        this.load.image('clouds', 'images/clouds-transparent.png');
    }
    // flat
    // diagonal_left
    // diagonal_right

    create() {
        this.generateAxeTexture();
        this.generateTreeTextures();
        this.scene.start("MenuScene");
    }

    generateAxeTexture() {
        if (this.textures.exists('axe')) return;
        const w = 24, h = 24;
        const tex = this.textures.createCanvas('axe', w, h);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);

        // Wooden handle running diagonally from bottom-left to upper-right.
        const handleDark = '#4a2a10';
        const handleMid = '#7a4a1f';
        const handleHi = '#a0682c';
        for (let i = 0; i < 16; i++) {
            const x = 3 + i;
            const y = 18 - i;
            ctx.fillStyle = handleDark;
            ctx.fillRect(x, y + 1, 2, 1);
            ctx.fillStyle = handleMid;
            ctx.fillRect(x, y, 2, 1);
            ctx.fillStyle = handleHi;
            ctx.fillRect(x, y - 1, 1, 1);
        }

        // Iron axe head — wedge shape with bright cutting edge.
        const headDark = '#3a3f47';
        const headMid = '#8a9099';
        const headHi = '#cfd4db';
        const edge = '#f4f6fa';
        const headPixels = [
            // [x, y, color]
            [16, 1, headDark], [17, 1, headDark], [18, 1, headDark], [19, 1, headDark],
            [15, 2, headDark], [16, 2, headMid], [17, 2, headMid], [18, 2, headMid], [19, 2, headHi], [20, 2, headDark],
            [14, 3, headDark], [15, 3, headMid], [16, 3, headHi], [17, 3, headHi], [18, 3, headHi], [19, 3, headHi], [20, 3, headHi], [21, 3, edge],
            [13, 4, headDark], [14, 4, headMid], [15, 4, headHi], [16, 4, headHi], [17, 4, headHi], [18, 4, headHi], [19, 4, headHi], [20, 4, headHi], [21, 4, edge],
            [14, 5, headDark], [15, 5, headMid], [16, 5, headMid], [17, 5, headHi], [18, 5, headHi], [19, 5, headHi], [20, 5, headHi], [21, 5, edge],
            [15, 6, headDark], [16, 6, headDark], [17, 6, headMid], [18, 6, headMid], [19, 6, headHi], [20, 6, headDark],
            [17, 7, headDark], [18, 7, headDark], [19, 7, headDark],
        ];
        for (const [x, y, c] of headPixels) {
            ctx.fillStyle = c;
            ctx.fillRect(x, y, 1, 1);
        }

        tex.refresh();
    }

    generateTreeTextures() {
        const variants = 4;
        this.game.registry?.set?.('treeVariantCount', variants);
        for (let i = 0; i < variants; i++) {
            this.generateTreeTexture(`tree_${i}`, i);
        }
        // Generic alias used by the toolbar/inventory previews if needed.
        if (!this.textures.exists('tree')) this.generateTreeTexture('tree', 0);
    }

    generateTreeTexture(key, variantSeed) {
        if (this.textures.exists(key)) return;
        const w = 18, h = 32;
        const tex = this.textures.createCanvas(key, w, h);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);

        // Tiny seeded RNG so each variant looks distinct but deterministic.
        let s = (variantSeed * 73856093) ^ 0x9E3779B9;
        const rand = () => {
            s = (s * 1664525 + 1013904223) | 0;
            return ((s >>> 0) % 100000) / 100000;
        };

        const trunkBaseColors = ['#5e3a1c', '#523218', '#6a4423'];
        const trunkShade = '#2f1c0b';
        const trunkHi = '#7d5530';
        const trunkColor = trunkBaseColors[variantSeed % trunkBaseColors.length];

        // Trunk: 2px wide for most of its height, base at the bottom row.
        const trunkX = Math.floor(w / 2) - 1;
        const trunkTop = 18;
        const trunkBottom = h;
        ctx.fillStyle = trunkColor;
        ctx.fillRect(trunkX, trunkTop, 2, trunkBottom - trunkTop);
        ctx.fillStyle = trunkShade;
        ctx.fillRect(trunkX + 1, trunkTop, 1, trunkBottom - trunkTop);
        ctx.fillStyle = trunkHi;
        ctx.fillRect(trunkX, trunkTop, 1, 2);

        // Bark grain marks
        const grainCount = 2 + Math.floor(rand() * 2);
        for (let i = 0; i < grainCount; i++) {
            const gy = trunkTop + 2 + Math.floor(rand() * (trunkBottom - trunkTop - 4));
            ctx.fillStyle = trunkShade;
            ctx.fillRect(trunkX, gy, 1, 1);
        }

        // Canopy — overlapping ellipse "blobs" of green at decreasing radii
        // climbing the trunk. A darker outline ring, a mid fill, and lighter
        // highlights catching the upper-left edge.
        const canopyDark = '#28522a';
        const canopyMid = '#3e7a3a';
        const canopyHi = '#69a44d';
        const canopyTop = '#86c560';

        const fillCircle = (cx, cy, r, color) => {
            ctx.fillStyle = color;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const d2 = dx * dx + dy * dy;
                    if (d2 <= r * r) {
                        const px = cx + dx;
                        const py = cy + dy;
                        if (px >= 0 && px < w && py >= 0 && py < h) {
                            ctx.fillRect(px, py, 1, 1);
                        }
                    }
                }
            }
        };

        // Per-variant geometry tweaks: lean, height of the lowest blob.
        const baseY = 18 - Math.floor(rand() * 2);
        const lean = Math.floor((rand() - 0.5) * 3);

        // Outline pass — slightly larger dark blobs to give a darker ring.
        const blobs = [
            {cx: w / 2 + lean,     cy: baseY,       r: 6},
            {cx: w / 2 - 3 + lean, cy: baseY - 4,   r: 5},
            {cx: w / 2 + 3 + lean, cy: baseY - 4,   r: 5},
            {cx: w / 2 - 1 + lean, cy: baseY - 8,   r: 4},
            {cx: w / 2 + 2 + lean, cy: baseY - 11,  r: 3},
        ];

        for (const b of blobs) fillCircle(Math.round(b.cx), Math.round(b.cy), b.r + 1, canopyDark);
        for (const b of blobs) fillCircle(Math.round(b.cx), Math.round(b.cy), b.r, canopyMid);

        // Speckle highlights — random light pixels in the top-left portion
        // of each blob, simulating directional light.
        for (const b of blobs) {
            const count = 2 + Math.floor(rand() * 3);
            for (let i = 0; i < count; i++) {
                const angle = Math.PI + rand() * Math.PI / 1.6;
                const rr = rand() * (b.r - 1);
                const px = Math.round(b.cx + Math.cos(angle) * rr);
                const py = Math.round(b.cy + Math.sin(angle) * rr);
                if (px >= 0 && px < w && py >= 0 && py < h) {
                    ctx.fillStyle = rand() > 0.6 ? canopyTop : canopyHi;
                    ctx.fillRect(px, py, 1, 1);
                }
            }
        }

        tex.refresh();
    }
}