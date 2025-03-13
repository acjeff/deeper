export class GlowStick {
    /**
     * @param {Phaser.Scene} scene - The current game scene.
     * @param {number} x - The initial x-coordinate for the sprite.
     * @param {number} y - The initial y-coordinate for the sprite.
     * @param {string} textureKey - The key for the glowstick image.
     * @param {Object} options - Optional settings for physics, lighting, fade, and throw speed.
     */
    constructor(scene, x, y, textureKey = 'glowstick', options = {}) {
        this.scene = scene;
        this.fadeTime = options.fadeTime || 3000; // Fade duration in ms
        this.throwSpeed = options.throwSpeed || 400;

        // Create the physics-enabled sprite (composition, not inheritance)
        this.sprite = this.scene.glowStickGroup.create(x, y, textureKey);
        this.sprite.setTint(0xff0000);
        this.sprite.setDepth(1);
        // this.sprite.setOrigin(0.5, 0.5);
        // this.sprite.body.setSize(this.sprite.width, this.sprite.height);
        // this.sprite.body.setOffset(0, 0);
        // this.sprite.setCollideWorldBounds(true);
        // this.sprite.setBounce(0.6);
        // this.sprite.body.setGravityY(options.gravityY || 300);

        // Light properties
        this.intensity = options.intensity || 1;
        this.color = window.lightColors[0];
        this.radius = options.radius || 30;
        this.neon = options.neon !== undefined ? options.neon : true;

        // Create a dynamic light if a lighting manager exists.
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

        // Start the fade-out tween on the sprite's alpha.
        scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: this.fadeTime,
            onUpdate: () => {
                // Optionally update the light's intensity based on the sprite's alpha.
                if (this.glowLight) {
                    this.glowLight.intensity = this.intensity * this.sprite.alpha;
                }
            },
            onComplete: () => {
                this.destroy();
            }
        });
    }

    /**
     * Creates a new GlowStick at the player's position and throws it in the direction
     * from the player to the current mouse pointer world coordinates.
     *
     * @param {Phaser.Scene} scene - The current game scene.
     * @param {Phaser.GameObjects.Sprite} player - The player object (must have x and y properties).
     * @param {string} textureKey - The key for the glowstick image.
     * @param {Object} options - Optional settings for physics, lighting, fade, and throw speed.
     * @returns {GlowStick} - The created GlowStick instance.
     */
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

    /**
     * Updates the glow light's position to match the sprite.
     * Call this method from the scene's update loop if needed.
     */
    update() {
        if (this.glowLight) {
            this.glowLight.x = this.sprite.x;
            this.glowLight.y = this.sprite.y;
        }
    }

    /**
     * Clean up by removing the dynamic light and destroying the sprite.
     */
    destroy() {
        if (this.glowLight && this.scene.lightingManager) {
            this.glowLight.destroy();
        }
        this.sprite.destroy();
    }
}
