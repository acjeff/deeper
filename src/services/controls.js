import {GlowStick} from "../classes/glowstick";

export default class ControlsManager {
    constructor(scene) {
        this.game = scene;
        this.game.mousePos = {x: 0, y: 0};
        this.hoveredBlock = null;
        this.swingRadius = 45;

        this.game.keys = this.game.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            down: Phaser.Input.Keyboard.KeyCodes.S
        });


        window.addEventListener("keydown", (e) => {
            if (e.key === "e") {
                if (this.game.showInteractionPrompt) this.game.showInteractionPrompt.tileRef.callCrane();
            }
        });

        window.addEventListener("mousedown", (e) => {
            if (this.hoveredBlock) {
                this.hoveredBlock.tileRef.onClick(e);
            }
            const selectedTool = this.game.selectedTool;
            if (
                selectedTool &&
                selectedTool.metadata &&
                selectedTool.metadata.throwable &&
                selectedTool.id === 'glowstick' &&
                selectedTool.metadata.number
            ) {
                // Create and throw a new glow stick from the player's position.
                const glowStick = GlowStick.throwFromPlayer(this.game, this.game.player);
                selectedTool.metadata.number = selectedTool.metadata.number - 1;
                this.game.glowSticks.push(glowStick);
                this.game.toolBarManager.render();
            }

            this.game.player.flipX = this.game.playerHead.flipX;

            if (this.game.toolSprite) {
                this.interacting = true;
                this.game.tweens.add({
                    targets: this.game.toolSprite,
                    rotation: Phaser.Math.DegToRad(this.game.toolSprite.flipX ? -this.swingRadius : this.swingRadius),
                    duration: 100, // Duration in ms; adjust as needed
                    ease: 'ease-in',
                    onComplete: () => {
                        this.game.tweens.add({
                            targets: this.game.toolSprite,
                            rotation: Phaser.Math.DegToRad(this.game.toolSprite.flipX ? this.swingRadius : -this.swingRadius),
                            duration: 100, // Duration in ms; adjust as needed
                            ease: 'ease-out',
                            onComplete: () => {
                                this.interacting = false;
                            }
                        });
                    }
                });
            }


            this.game.controlsManager.getInteractableBlock(15);
        });

        window.addEventListener("mousemove", (event) => {
            // Update the scene's mouse position.
            this.game.mousePos = {x: event.clientX, y: event.clientY};

            if (this.game.playerHead) {
                this.playerLooking();
            }
        });

        // window.addEventListener("wheel", (e) => {
        //     const zoomSpeed = 0.1;
        //     this.game.zoomAmount = Phaser.Math.Clamp(this.game.cameras.main.zoom + (e.deltaY * -zoomSpeed * 0.01), 0.5, 5);
        //     this.game.cameras.main.setZoom(this.game.zoomAmount);
        // });

        window.addEventListener('wheel', (event) => {
            // Prevent the default scroll behavior (optional)
            event.preventDefault();
            let currentNumber = this.game.selectedIndex;

            // Scroll up (deltaY negative) increases the number; scroll down decreases it
            if (event.deltaY < 0) {
                currentNumber--;
            } else {
                currentNumber++;
            }

            this.game.toolBarManager.setSelected(currentNumber);

        }, {passive: false});


        window.addEventListener("keypress", (e) => {
            if (e.key === "c") {
                this.game.glowStickCol = (this.game.glowStickCol + 1) % this.game.glowStickCols.length;
            }
            if (e.key === "t") {
                this.game.playerLight.off = !this.game.playerLight.off;
            }
            if (e.key === "p") {
                this.game.playerManager.teleportTo()
            }
        });
        window.addEventListener("keyup", (e) => {
            this.game.digging = false;
            this.game.drilling = false;
        });

    }

    playerLooking() {
        const pointer = this.game.input.activePointer;
        if (!this.game.cameras.main) return;
        const worldPoint = this.game.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const worldMouseX = worldPoint.x;

        let angle = Phaser.Math.Angle.Between(
            this.game.playerHead.x,
            this.game.playerHead.y,
            pointer.worldX,
            pointer.worldY
        );
        let angleDeg = Phaser.Math.RadToDeg(angle);
        if (angleDeg > -145 && angleDeg < -this.swingRadius) {
            // UP
            this.game.playerHead.setFrame(1);
        } else if (angleDeg < 145 && angleDeg > this.swingRadius) {
            // DOWN
            this.game.playerHead.setFrame(2);
        } else {
            // STRAIGHT AHEAD
            this.game.playerHead.setFrame(0);
        }
        this.game.playerHead.flipX = worldMouseX < this.game.player.x;
    }

    handlePlayerMovement() {
        this.game.isFloating = false;
        this.game.playerHead.x = this.game.player.body.x + 3;
        this.game.playerHead.y = this.game.player.body.y + 2.5;

        if (this.game.toolSprite) {
            this.game.toolSprite.x = this.game.player.body.x + (this.game.toolSprite.flipX ? 4 : 2);
            this.game.toolSprite.y = this.game.player.body.y + 7;
        }

        if (!this.game.player.body) return;
        if (this.game.player?.body?.velocity?.y > 5) {
            this.game.lastFallSpeed = this.game.player.body.velocity.y;
        } else {
            this.game.lastFallSpeed = 0;
        }
        this.game.physics.overlap(this.game.player, this.game.liquidGroup, () => {
            this.game.isFloating = true;
        });
        this.game.showInteractionPrompt = false;
        this.game.physics.overlap(this.game.player, this.game.interactableGroup, (obj1, obj2) => {
            // console.log(obj2, ' : obj2');
            this.game.showInteractionPrompt = obj2;
        });

        if (this.game.freezePlayer) {
            this.game.player.body.setVelocity(0, 0);
            this.game.player.body.setGravityY(0);
            return;
        }
        if (this.game.isFloating) {
            this.game.player.body.setGravityY(-100);
            this.game.player.body.setDrag(500);
            this.game.player.breath -= 0.1;
        } else {
            this.game.player.body.setDrag(0);
            this.game.player.body.setGravityY(this.game.defaultGravityY);
            if (this.game.player.breath < 100) {
                this.game.player.breath += 0.8;
            }
        }
        if (this.game.player.breath <= 0) {
            this.game.player.health -= 0.1;
        }

        let moveSpeed;
        this.stationary = false;
        this.game.toolSprite.setOrigin(0.5, 1);
        this.game.toolSprite.setDepth(3);
        if (this.game.keys.left.isDown) {
            moveSpeed = this.game.isFloating ? -26 : -50;
            this.game.player.setVelocityX(moveSpeed);
            this.game.player.anims.play('walk', true);
            this.game.player.flipX = true;
            this.game.playerHead.flipX = true;
        } else if (this.game.keys.right.isDown) {
            moveSpeed = this.game.isFloating ? 26 : 50;
            this.game.player.flipX = false;
            this.game.playerHead.flipX = false;
            this.game.toolSprite.setDepth(3);
            this.game.player.setVelocityX(moveSpeed);
            this.game.player.anims.play('walk', true);
        } else {
            this.game.player.setVelocityX(0);
            this.game.player.anims.play('stationary', true);
            // this.stationary = true;
        }

        this.game.toolSprite.flipX = this.game.player.flipX;
        if (!this.interacting) {
            this.game.toolSprite.rotation = Phaser.Math.DegToRad(this.game.toolSprite.flipX ? this.swingRadius : -this.swingRadius);
        }

        // Vertical movement
        if (this.game.keys.up.isDown) {
            if (this.game.isFloating) {
                this.game.player.anims.play('jump', true);
                this.game.player.setVelocityY(-30);
            } else if (this.game.player.body.blocked.down) {
                this.game.player.setVelocityY(-100);
            }
        }
        if (this.game.keys.down.isDown) {
            if (this.game.isFloating) {
                this.game.player.anims.play('jump', true);
                this.game.player.setVelocityY(30);
            }
        }
        if (this.game.isFloating && !this.game.keys.down.isDown && !this.game.keys.up.isDown) {
            this.game.player.anims.play('jump', true);
            this.game.player.setVelocityY(20);
        }

        const playerOffset = 3;
        const playerX = this.game.player.x + playerOffset;
        const playerY = this.game.player.y + playerOffset;

        this.game.mapService.loadChunks(playerX, playerY);
        if (moveSpeed) {
            this.game.controlsManager.getInteractableBlock(15);
        }

        const isFalling = !this.game.player.body.blocked.down;
        if (isFalling) {
            this.game.player.anims.play('jump', true);
        }

        if (this.game.showInteractionPrompt) {
            const playerX = this.game.player.body.x - 10;
            const playerY = this.game.player.body.y - 5;

            const textX = playerX;
            const textY = playerY - 5;

            const style = {
                font: '3px',
                fill: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: {left: 3, right: 3, top: 2, bottom: 1}
            };

            if (!this.interactionText) {
                this.interactionText = this.game.add.text(textX, textY, 'E to Interact', style);
                // this.interactionText.setOrigin(0.5);
            } else {
                this.interactionText.setText('E to Interact');
                this.interactionText.setPosition(textX, textY);
                this.interactionText.setDepth(999999);
            }
            // this.interactionText.setOrigin(0.5);
            this.interactionText.setResolution(10);
        } else {
            if (

                this
                    .interactionText
            ) {
                this
                    .interactionText
                    .destroy();

                this
                    .interactionText = null;
            }
        }

        this.game.controlsManager.getInteractableBlock(15);

    }

    getInteractableBlock(interactionRange) {
        if (this.gettingBlock) return;

        const player = this.game.player;
        if (this.game.player && this.game.cameras.main && this.game.input && this.game.input.activePointer) {
            this.gettingBlock = true
            requestAnimationFrame(() => {
                const pointer = this.game.input.activePointer; // Get current mouse pointer

                const worldPoint = this.game.cameras.main.getWorldPoint(pointer.x, pointer.y);
                const worldMouseX = worldPoint.x;
                const worldMouseY = worldPoint.y;

                const nearbyBlocks = this.game.mapService.getEntitiesAround(
                    player.x,
                    player.y,
                    interactionRange
                );

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
            });
            this.gettingBlock = false
        }
    }

    isMouseOverEntity(entity, mouseX, mouseY) {
        if (entity.getBounds) {
            return entity.getBounds().contains(mouseX, mouseY);
        }
        return false;
    }

}