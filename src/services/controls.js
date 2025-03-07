export default class ControlsManager {
    constructor(scene) {
        this.scene = scene;

        this.scene.keys = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });


        window.addEventListener("keydown", (e) => {
            if (e.key === "r") {
                this.scene.drilling = true;
            }
        });

        window.addEventListener("wheel", (e) => {
            const zoomSpeed = 0.1;
            this.scene.zoomAmount = Phaser.Math.Clamp(this.scene.cameras.main.zoom + (e.deltaY * -zoomSpeed * 0.01), 0.5, 5);
            this.scene.cameras.main.setZoom(this.scene.zoomAmount);
        });

        window.addEventListener("keypress", (e) => {
            if (e.key === "c") {
                this.scene.glowStickCol = (this.scene.glowStickCol + 1) % this.scene.glowStickCols.length;
            }
            if (e.key === "l") {
                this.scene.lightingManager.addLight(this.scene.player.x, this.scene.player.y, this.scene.playerSize * 10, 0.8, this.scene.glowStickCols[this.scene.glowStickCol], false, true); // Orange torch light
            }
            if (e.key === "t") {
                this.scene.playerLight.off = !this.scene.playerLight.off;
            }
            if (e.key === "p") {
                this.scene.player.x = this.scene.startPoint.x;
                this.scene.player.y = this.scene.startPoint.y;
            }
        });
        window.addEventListener("keyup", (e) => {
            this.scene.digging = false;
            this.scene.drilling = false;
        });
    }

    handlePlayerMovement() {
        const speed = 100;
        if (this.scene.keys.left.isDown) {
            this.scene.player.setVelocityX(-speed);
        } else if (this.scene.keys.right.isDown) {
            this.scene.player.setVelocityX(speed);
        } else {
            this.scene.player.setVelocityX(0);
        }

        if (this.scene.keys.up.isDown && this.scene.player.blocked.down) {
            this.scene.player.setVelocityY(-150);
        }

        this.scene.playerRect.x = this.scene.player.x;
        this.scene.playerRect.y = this.scene.player.y;
        this.scene.mapService.loadChunks(this.scene.player.x, this.scene.player.y);
    }

}