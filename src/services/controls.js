export default class ControlsManager {
    constructor(scene) {
        this.scene = scene;
        this.scene.mousePos = {x: 0, y: 0};
        this.hoveredBlock = null;

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
                const blocks = this.scene.mapService.getEntitiesAround(this.scene.player.x + this.scene.playerSize, this.scene.player.y + this.scene.playerSize, 5);
                blocks.forEach(block => {
                    this.scene.mapService.setTile(block.x, block.y, {
                        ...window._tileTypes.empty
                    }, block);
                })
            }
        });

        window.addEventListener("mousedown", (e) => {
            if (this.hoveredBlock) {
                this.hoveredBlock.tileRef.onClick(e);
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
            if (e.key === "t") {
                this.scene.playerLight.off = !this.scene.playerLight.off;
            }
            if (e.key === "p") {
                this.scene.playerManager.returnToBaseCamp()
            }
        });
        window.addEventListener("keyup", (e) => {
            this.scene.digging = false;
            this.scene.drilling = false;
        });
    }

    handlePlayerMovement() {
        let isFloating = false;
        this.scene.physics.overlap(this.scene.player, this.scene.liquidGroup, () => {
            isFloating = true;
        });
        if (this.scene.freezePlayer){
            this.scene.player.body.setVelocity(0, 0);
            this.scene.player.body.setGravityY(0);
            return;
        }
        if (isFloating) {
            this.scene.player.body.setGravityY(0);
            this.scene.player.body.setDrag(250);
        } else {
            this.scene.player.body.setGravityY(this.scene.defaultGravityY);
        }
        const speed = 50;
        let moveSpeed;
        if (this.scene.keys.left.isDown) {
            moveSpeed = isFloating ? -26 : -50;
            this.scene.player.setVelocityX(moveSpeed);
        } else if (this.scene.keys.right.isDown) {
            moveSpeed = isFloating ? 26 : 50;
            this.scene.player.setVelocityX(moveSpeed);
        } else {
            this.scene.player.setVelocityX(0);
        }

        if (this.scene.keys.up.isDown) {
            if (isFloating) {
                this.scene.player.setVelocityY(-30);
            } else if (this.scene.player.body.blocked.down) {
                this.scene.player.setVelocityY(-100);
            }
        }
        const playerOffset = this.scene.playerSize / 2;
        const playerX = this.scene.player.x + playerOffset;
        const playerY = this.scene.player.y + playerOffset;

        this.scene.playerRect.x = this.scene.player.x;
        this.scene.playerRect.y = this.scene.player.y;

        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                // Render low-priority blocks here
                this.scene.mapService.loadChunks(playerX, playerY);
            });
        } else {
            // Fallback to requestAnimationFrame
            requestAnimationFrame(() => this.scene.mapService.loadChunks(playerX, playerY));
        }

        this.scene.playerLight.setPosition(playerX, playerY);
    }

    getInteractableBlock(interactionRange) {
        const player = this.scene.player;
        const pointer = this.scene.input.activePointer; // Get current mouse pointer

        // Convert mouse screen coordinates to world coordinates
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const worldMouseX = worldPoint.x;
        const worldMouseY = worldPoint.y;

        // Get all entities around the player
        const nearbyBlocks = this.scene.mapService.getEntitiesAround(
            player.x + this.scene.playerSize / 2,
            player.y + this.scene.playerSize / 2,
            interactionRange
        );

        // Find the first block that the mouse is over
        let hoveredBlock = nearbyBlocks.find(block => this.isMouseOverEntity(block, worldMouseX, worldMouseY));

        if (!hoveredBlock) {
            if (this.hoveredBlock && this.hoveredBlock.setStrokeStyle) {
                this.hoveredBlock.tileRef.onMouseLeave();
            }
            this.hoveredBlock = null;
            return;
        }

        // Highlight the hovered block
        if (hoveredBlock !== this.hoveredBlock) {
            if (this.hoveredBlock && this.hoveredBlock.setStrokeStyle) {
                this.hoveredBlock.tileRef.onMouseLeave();
            }

            this.hoveredBlock = hoveredBlock;
            this.hoveredBlock.tileRef.onMouseEnter();
        }
    }

    isMouseOverEntity(entity, mouseX, mouseY) {
        if (entity.getBounds) {
            return entity.getBounds().contains(mouseX, mouseY);
        }
        return false;
    }

}