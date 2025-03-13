export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super("PreloadScene");
    }

    preload() {
        this.load.image("player", "images/player.png");
        this.load.image("energy", "images/energy.png");
        this.load.image("door", "images/door.png");
        this.load.image("wall", "images/door.png");
        this.load.image('dust', 'images/particles/dust.png');
        this.load.image('crack', 'images/cracked.png');
        this.load.image('lamp', 'images/lamp.png');
        this.load.image('coal', 'images/coal.png');
        this.load.image('wood', 'images/wood.png');
    }

    create() {
        this.scene.start("MenuScene");
    }
}