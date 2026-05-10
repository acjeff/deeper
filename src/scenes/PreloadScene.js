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

}