export class GlowStick {
    constructor(scene, x, y, textureKey = 'glowstick', options = {}) {
        this.game = scene;
        this.fadeTime = options.fadeTime || 100000;
        this.throwSpeed = options.throwSpeed || 200;
        this.sprite = this.game.physics.add.sprite(x, y, 'glowstick');
        const newSizeW = this.sprite.width / 5;
        const newSizeH = this.sprite.height / 5;
        this.game.glowStickGroup.add(this.sprite);
        this.sprite.body.setAllowRotation(true);
        this.sprite.setDepth(999);
        this.sprite.setAlpha(1);
        this.sprite.body.setSize(newSizeW, newSizeH);
        this.sprite.setDisplaySize(newSizeW, newSizeH);
        this.sprite.setBounce(0.5);
        this.sprite.setDrag(200);
        this.sprite.body.setGravityY(options.gravityY || 300);
        this.intensity = options.intensity || 0.8;
        this.color = this.game.lightColors[0];
        this.radius = options.radius || 50;
        this.neon = options.neon !== undefined ? options.neon : true;

        this.glowLight = null;
        if (scene.lightingManager) {
            this.glowLight = scene.lightingManager.addLight(
                x,
                y,
                this.radius,
                this.intensity,
                this.color,
                false,
                this.neon
            );
        }

        this.sprite.dummyTween = 1;

        scene.tweens.add({
            targets: this.sprite,
            dummyTween: 0, // Tween this value from 1 to 0
            duration: this.fadeTime, // Duration of the effect
            onUpdate: (tween, target) => {
                const progress = target.dummyTween; // Progress from 1 to 0

                // Lower the light radius
                if (this.glowLight) {
                    if (this.glowLight.radius > 0) {
                        this.glowLight.radius = this.radius * progress; // Reduce radius over time
                    }
                }
            },
            onComplete: () => {
                // this.destroy();
            }
        });
    }

    static throwFromPlayer(scene, player, textureKey = 'glowStick', options = {}) {
        // Get the pointer's world coordinates.
        const pointer = scene.input.activePointer;
        const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

        // Create the glow stick at the player's position.
        const glowStick = new GlowStick(scene, player.x, player.y, textureKey, options);

        // Calculate the direction vector from the player to the pointer.
        let dx = worldPoint.x - player.x;
        let dy = worldPoint.y - player.y;
        let magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude === 0) {
            // Avoid division by zero. Default to upward throw.
            dx = 0;
            dy = -1;
        } else {
            dx /= magnitude;
            dy /= magnitude;
        }

        // Apply the throw velocity.
        glowStick.sprite.setVelocity(dx * glowStick.throwSpeed, dy * glowStick.throwSpeed);
        return glowStick;
    }

    update() {
        this.isFloating = false;
        if (this.sprite.body) {
            this.sprite.rotation = this.sprite.body.angle;

            this.sprite.body.setGravityY(300);
            this.sprite.body.setDrag(200);
            if (this.glowLight) {
                this.glowLight.x = this.sprite.x;
                this.glowLight.y = this.sprite.y;
            }
            this.game.physics.overlap(this.sprite, this.game.liquidGroup, () => {
                this.isFloating = true;
                this.sprite.body.setVelocity(0, 10);
            });
            if (this.isFloating) {
                this.sprite.body.setGravityY(50);
                this.sprite.body.setDrag(300);
            }
        }
    }

    /**
     * Clean up by removing the dynamic light and destroying the sprite.
     */
    destroy() {
        if (this.glowLight && this.game.lightingManager) {
            this.glowLight.destroy();
        }
        this.sprite.destroy();
    }
}
