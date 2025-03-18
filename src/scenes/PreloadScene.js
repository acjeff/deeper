export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super("PreloadScene");
    }

    preload() {
        this.load.spritesheet('player', 'images/player.png', {
            frameWidth: 55,
            frameHeight: 70
        });
        this.load.image("energy", "images/energy.png");
        this.load.image("door", "images/door.png");
        this.load.image("wall", "images/door.png");
        this.load.image('dust', 'images/particles/dust.png');
        this.load.image('crack', 'images/cracked.png');
        this.load.image('lamp', 'images/lamp.png');
        this.load.image('coal', 'images/coal.png');
        this.load.image('wood', 'images/wood.png');
        this.load.image('buttress', 'images/buttress.png');
        this.load.image('glowstick', 'images/glow-stick.png');
        this.load.image('rail', 'images/rail.png');
    }
    // flat
    // diagonal_left
    // diagonal_right

    create() {
        this.scene.start("MenuScene");
    }
}