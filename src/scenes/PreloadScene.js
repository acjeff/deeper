export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super("PreloadScene");
    }

    preload() {
        this.load.image("player", "src/images/player.png"); // ✅ Update with the correct path
        this.load.image("energy", "src/images/energy.png"); // ✅ Ensure the file exists
        this.load.image("door", "src/images/door.png"); // ✅ Ensure the file exists
        this.load.image("wall", "src/images/door.png");

    }

    create() {
        this.scene.start("GameScene");
    }
}
