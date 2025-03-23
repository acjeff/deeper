export class MineCart {
    constructor(scene, x, y) {
        this.game = scene;
        this.sprite = this.game.physics.add.sprite(x, y, 'minecart');
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
            // this.glowLight.radius = 0;
            // this.glowLight.fadeIn();
        }

        this.sprite.dummyTween = 1;

        // window.setTimeout(() => {
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
        // }, 200)
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

    destroy() {
        if (this.glowLight && this.game.lightingManager) {
            this.glowLight.destroy();
        }
        this.sprite.destroy();
    }
}
