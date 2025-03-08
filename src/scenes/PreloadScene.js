export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super("PreloadScene");
    }

    preload() {
        this.load.image("player", "images/player.png"); // ✅ Update with the correct path
        this.load.image("energy", "images/energy.png"); // ✅ Ensure the file exists
        this.load.image("door", "images/door.png"); // ✅ Ensure the file exists
        this.load.image("wall", "images/door.png");
        this.load.image('dust', 'images/particles/dust.png');
        this.load.image('crack', 'images/cracked.png');
        this.load.image('lamp', 'images/lamp.png');
        this.load.image('coal', 'images/coal.png');
    }

    create() {
        this.scene.start("MenuScene");
    }
}