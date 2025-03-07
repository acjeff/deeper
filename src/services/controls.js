export default class ControlsManager {
    constructor(scene) {
        this.scene = scene;
        this.scene.mousePos = { x: 0, y: 0 };

        this.scene.keys = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });


        window.addEventListener("keydown", (e) => {
            if (e.key === "r") {
                this.scene.drilling = true;
            }
            if (e.key === "g") {
                const blocks = this.scene.mapService.getEntitiesAround(this.scene.player.x + this.scene.playerSize, this.scene.player.y + this.scene.playerSize, 50);
                blocks.forEach(block => {
                    this.scene.mapService.setTile(block.x, block.y, {
                        ...window._tileTypes.empty
                    }, block);
                })
            }
        });

        window.addEventListener("click", (e) => {
            if (this.closestBlock) {
                this.scene.mapService.setTile(this.closestBlock.x, this.closestBlock.y, {
                    ...window._tileTypes.empty
                }, this.closestBlock);
            }
        });

        window.addEventListener("mousemove", (event) => {
            this.scene.mousePos.x = event.clientX;
            this.scene.mousePos.y = event.clientY
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

    getInteractableBlock() {
        const player = this.scene.player;

        // Get mouse position relative to the center of the screen
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const mouseX = this.scene.mousePos.x;
        const mouseY = this.scene.mousePos.y;

        // Compute direction vector
        let dx = mouseX - centerX;
        let dy = mouseY - centerY;
        let length = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction vector
        if (length > 0) {
            dx /= length;
            dy /= length;
        }

        // Get all blocks around the player
        const nearbyBlocks = this.scene.mapService.getEntitiesAround(player.x + this.scene.playerSize / 2, player.y + this.scene.playerSize / 2, 20);

        // Get the closest block in the direction of the mouse
        const closestBlock = this.scene.mapService.getClosestBlockInDirection(player.x + this.scene.playerSize / 2, player.y + this.scene.playerSize / 2, dx, dy, nearbyBlocks);

        if (closestBlock) {
            // Remove stroke from the previous block
            if (this.closestBlock && this.closestBlock.setStrokeStyle) {
                this.closestBlock.setStrokeStyle(0, 0); // Remove stroke
                this.closestBlock.setDepth(1); // Thickness 3, color red
            }

            // Store the new closest block
            this.closestBlock = closestBlock;

            // Apply a red stroke to highlight it
            if (this.closestBlock.setStrokeStyle) {
                this.closestBlock.setStrokeStyle(1, 0xFFA500); // Thickness 3, color red
                this.closestBlock.setDepth(999); // Thickness 3, color red
            }
        } else {
            if (this.closestBlock && this.closestBlock.setStrokeStyle) {
                this.closestBlock.setStrokeStyle(0, 0); // Remove stroke
                this.closestBlock.setDepth(1); // Thickness 3, color red
            }
            this.closestBlock = null;
        }
    }

}