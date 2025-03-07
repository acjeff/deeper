export default class PlayerManager {
    constructor(scene) {
        this.scene = scene;

        this.scene.startPoint = {x: 300, y: 197};
        let x = this.scene.playerX || this.scene.startPoint.x;
        let y = this.scene.playerY || this.scene.startPoint.y;

        this.scene.player = this.scene.physics.add.body(x, y, this.scene.playerSize, this.scene.playerSize);
        this.scene.player.setBounce(0.2);
        this.scene.playerRect = this.scene.add.rectangle(x, y, this.scene.playerSize, this.scene.playerSize, 0xffb2fd);
        this.scene.playerRect.setOrigin(0, 0);
        this.scene.player.hitPower = 100;
        this.scene.playerLight = this.scene.lightingManager.addLight(this.scene.player.x, this.scene.player.y, this.scene.playerSize * 10, 0.6, '253,196,124', true);
        this.scene.physics.add.collider(this.scene.player, this.scene.soilGroup);
    }

    returnToBaseCamp() {
        const relativePos = {x: this.scene.startPoint.x, y: this.scene.startPoint.y};
        this.scene.player.x = relativePos.x;
        this.scene.player.y = relativePos.y;
        this.scene.playerLight.setPosition(this.scene.player.x, this.scene.player.y);
    }
}