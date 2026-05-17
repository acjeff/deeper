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
        this.generateOreTexture('copper', '#a86038', '#d68a52', '#5a2e10', '#f0b070');
        this.generateOreTexture('iron',   '#9aa0a8', '#cdd2d9', '#3a4048', '#eef0f4');
        this.generateBedrockTexture();
        this.generateBedrollTexture();
        this.generateTentTexture();
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

    // Ore overlay sprites that sit on top of the dark dirt tile texture.
    // Same authoring shape as the existing coal art (dark base, flecks of
    // ore colour clustered into a vein) so all three ores read as the same
    // family at different richness/colour.
    generateOreTexture(key, base, light, shadow, sparkle) {
        if (this.textures.exists(key)) return;
        const w = 16, h = 16;
        const tex = this.textures.createCanvas(key, w, h);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);

        const veins = [
            [3, 4], [4, 4], [5, 5], [6, 5], [6, 6], [7, 6],
            [8, 7], [9, 7], [10, 8], [11, 8], [12, 9],
            [4, 9], [5, 10], [6, 10], [7, 11], [8, 11],
            [9, 12], [10, 12], [3, 12], [11, 5], [12, 6],
        ];
        ctx.fillStyle = shadow;
        for (const [x, y] of veins) ctx.fillRect(x, y + 1, 1, 1);
        ctx.fillStyle = base;
        for (const [x, y] of veins) ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = light;
        const highlights = [[5, 4], [7, 5], [9, 6], [11, 8], [6, 9], [8, 10]];
        for (const [x, y] of highlights) ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = sparkle;
        const sparkles = [[5, 5], [9, 8], [11, 9]];
        for (const [x, y] of sparkles) ctx.fillRect(x, y, 1, 1);

        tex.refresh();
    }

    // Bedrock layer-cap tile. Reads as solid stone — uniform mid-grey
    // body with a few darker pits and lighter chips so it doesn't tile
    // into a flat stripe across the chasm. Players see it as the floor
    // they need to drill through to descend further.
    generateBedrockTexture() {
        if (this.textures.exists('bedrock')) return;
        const w = 16, h = 16;
        const tex = this.textures.createCanvas('bedrock', w, h);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#5e5e5e';
        for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
        ctx.fillStyle = '#3a3a3a';
        const pits = [[2,3],[5,1],[8,4],[12,2],[3,7],[10,8],[14,10],[6,11],[1,13],[11,14]];
        for (const [x, y] of pits) ctx.fillRect(x, y, 2, 2);
        ctx.fillStyle = '#777';
        const chips = [[4,6],[9,3],[13,7],[7,9],[2,11],[12,12]];
        for (const [x, y] of chips) ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = '#222';
        for (let i = 0; i < 14; i++) {
            const x = (i * 5 + 3) % w;
            const y = (i * 7 + 2) % h;
            ctx.fillRect(x, y, 1, 1);
        }
        tex.refresh();
    }

    // Tier-0 home: a rolled sleeping bag on the platform deck. Tiny
    // sprite, drawn pixel-perfect at 1× and scaled up by setDisplaySize
    // when the rig mounts it. Brown pad + red blanket + a small pillow.
    generateBedrollTexture() {
        if (this.textures.exists('bedroll')) return;
        const w = 18, h = 8;
        const tex = this.textures.createCanvas('bedroll', w, h);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        // Mat
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(0, 4, w, 4);
        ctx.fillStyle = '#7a4a28';
        ctx.fillRect(0, 4, w, 1);
        ctx.fillStyle = '#2a1808';
        ctx.fillRect(0, h - 1, w, 1);
        // Blanket
        ctx.fillStyle = '#a8443a';
        ctx.fillRect(2, 2, w - 4, 4);
        ctx.fillStyle = '#c46044';
        ctx.fillRect(2, 2, w - 4, 1);
        ctx.fillStyle = '#5a1a10';
        ctx.fillRect(2, 5, w - 4, 1);
        // Stitching seams
        ctx.fillStyle = '#3a1008';
        for (let x = 4; x < w - 2; x += 3) ctx.fillRect(x, 3, 1, 2);
        // Pillow at the head
        ctx.fillStyle = '#f4e7c6';
        ctx.fillRect(1, 1, 5, 3);
        ctx.fillStyle = '#c9b58a';
        ctx.fillRect(1, 3, 5, 1);
    }

    // Tier-1 home: a small canvas tent pitched on the platform. Low
    // triangular silhouette with a darker open flap and a couple of guy
    // ropes. Sits a bit taller than the bedroll without yet hitting full
    // hut size — same width footprint as the bedroll so the upgrade reads.
    generateTentTexture() {
        if (this.textures.exists('tent')) return;
        const w = 28, h = 22;
        const tex = this.textures.createCanvas('tent', w, h);
        const ctx = tex.context;
        ctx.imageSmoothingEnabled = false;
        // Triangular tent body — two coloured slopes for depth.
        const apex = w / 2;
        const baseY = h - 3;
        for (let y = 2; y <= baseY; y++) {
            const half = Math.round(((y - 2) / (baseY - 2)) * (w / 2 - 2));
            const x0 = apex - half;
            const x1 = apex + half;
            ctx.fillStyle = (y - 2) < 5 ? '#b89a5e' : '#a08240';
            ctx.fillRect(x0, y, x1 - x0, 1);
        }
        // Right slope shading
        for (let y = 4; y <= baseY; y++) {
            const half = Math.round(((y - 2) / (baseY - 2)) * (w / 2 - 2));
            ctx.fillStyle = '#7a5a28';
            ctx.fillRect(apex + half - 2, y, 2, 1);
        }
        // Ridge line
        ctx.fillStyle = '#3a2a10';
        ctx.fillRect(apex - 1, 2, 2, baseY - 1);
        // Flap doorway
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(apex - 3, baseY - 7, 6, 7);
        ctx.fillStyle = '#1a0e06';
        ctx.fillRect(apex - 1, baseY - 6, 2, 6);
        ctx.fillStyle = '#5a4222';
        ctx.fillRect(apex - 3, baseY - 7, 1, 7);
        ctx.fillRect(apex + 2, baseY - 7, 1, 7);
        // Ground line
        ctx.fillStyle = '#2a1808';
        ctx.fillRect(0, baseY, w, 1);
        // Guy ropes
        ctx.fillStyle = '#cdb89a';
        ctx.fillRect(2, baseY - 2, 1, 1);
        ctx.fillRect(3, baseY - 1, 1, 1);
        ctx.fillRect(w - 3, baseY - 2, 1, 1);
        ctx.fillRect(w - 4, baseY - 1, 1, 1);
        // Apex finial
        ctx.fillStyle = '#1a0e06';
        ctx.fillRect(apex - 1, 1, 2, 2);
    }

}