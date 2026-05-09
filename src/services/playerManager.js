export default class PlayerManager {
    constructor(scene) {
        this.game = scene;
        this.game.startPoint = {x: 1500, y: 180};
        let x = this.game.playerX || this.game.startPoint.x;
        let y = this.game.playerY || this.game.startPoint.y;
        this.game.anims.create({
            key: 'walk',
            frames: this.game.anims.generateFrameNumbers('player_walk', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });

        this.game.anims.create({
            key: 'jump',
            frames: this.game.anims.generateFrameNumbers('player_jump', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });

        this.game.anims.create({
            key: 'stationary',
            frames: this.game.anims.generateFrameNumbers('player_stationary', { start: 0, end: 0 }),
            frameRate: 10,
            repeat: -1
        });

        this.game.playerShadow = this.game.add.ellipse(x, y + 4, 7, 2.2, 0x000000, 0.35);
        this.game.playerShadow.setDepth(0.5);
        this.game.player = this.game.physics.add.sprite(x, y, 'player_stationary');
        this.game.playerHead = this.game.add.sprite(x, y, 'player_head');
        this.game.player.setDisplaySize(6, 8);
        this.game.playerHead.setDisplaySize(6, 6);
        this.game.playerHead.setDepth(1);
        this.game.player.setDepth(2);
        this.game.player.setBounce(0.2);
        this.headBaseY = 0;
        this.bobPhase = 0;
        this.wasGrounded = true;
        // Capture the scale that setDisplaySize produced — tweens must work
        // relative to this, not absolute 1.0 which would blow the sprite up
        // to its raw texture size.
        this.playerBaseScaleX = this.game.player.scaleX;
        this.playerBaseScaleY = this.game.player.scaleY;
        this.headBaseScaleX = this.game.playerHead.scaleX;
        this.headBaseScaleY = this.game.playerHead.scaleY;

        this.game.player.maxHealth = 100;
        this.game.player.maxEnergy = 100;
        this.game.player.maxBreath = 100;
        this.game.player.maxHitPower = 100;
        this.game.player.health = this.game.player.maxHealth;
        this.game.player.energy = this.game.player.maxEnergy;
        this.game.player.breath = this.game.player.maxBreath;
        this.game.player.hitPower = this.game.player.maxHitPower;
        this.game.playerLight = this.game.lightingManager.addLight(this.game.player.x, this.game.player.y, 30, 1, this.game.lightColors[1], false);
        // this.game.playerLight.off = true;
        this.game.playerLightFaux = this.game.lightingManager.addLight(this.game.player.x, this.game.player.y, 0, 1, this.game.lightColors[1], false);
        this.game.physics.add.collider(this.game.player, this.game.soilGroup, () => {
            const fallSpeed = this.game.lastFallSpeed || 0;
            const safeSpeed = 180;

            if (fallSpeed > safeSpeed) {
                const damageFactor = 0.8;
                const damage = (fallSpeed - safeSpeed) * damageFactor;
                this.game.player.health -= damage;
            }
        });
        this.dialogueLayer = document.createElement("canvas");
        this.dialogueLayer.id = "dialogue_canvas";
        this.dialogueLayer.width = this.game.cameras.main.width;
        this.dialogueLayer.height = this.game.cameras.main.height;
        this.dialogueLayer.style.position = "absolute";
        this.dialogueLayer.style.top = "0";
        this.dialogueLayer.style.left = "0";
        this.dialogueLayer.style.zIndex = "9999";
        this.dialogueLayer.style.pointerEvents = "none";
        document.body.appendChild(this.dialogueLayer);
        this.viewMaskCtx = this.dialogueLayer.getContext("2d");
        this.viewMaskCtx.font = "30px Arial";
        this.viewMaskCtx.fillStyle = "white";
        this.viewMaskCtx.textAlign = "center";
        window.setTimeout(() => {
        this.teleportTo(x, y)
        }, 100);
    }

    die(reason) {
        if (this.alreadyDead) return;
        this.alreadyDead = true;

        this.createDialogueLayer();
        this.game.player.health = this.game.player.maxHealth;
        this.game.player.energy = this.game.player.maxEnergy;
        this.game.player.breath = this.game.player.maxBreath;

        // Determine the message based on the reason.
        let message;
        switch (reason) {
            case 'crushed':
                message = "Great job, you crushed it!"
                break;
            case 'fall':
                message = "Aim for the bushes!"
                break;
            case 'sleep':
                message = "You sleepy bear!"
                break;
            case 'suffocate':
                message = "That's no way to go!"
                break;
            default:
                message = 'You died!'
        }

        // Draw the dialogue (a black translucent rectangle with text)
        this.drawDialogue(message);

        // Fade the dialogue layer in
        this.fadeInDialogue();

        // Example additional game logic

        this.game.freezePlayer = true;

        // After 2 seconds, fade out and remove the dialogue layer then return to base camp
        this.game.time.delayedCall(2000, () => {
            this.game.player.energy = 100;
            this.game.player.health = 100;
            this.game.player.breath = 100;
            this.alreadyDead = false;
            this.fadeOutAndRemoveDialogue();
            this.teleportTo();
        })
    }

    createDialogueLayer() {
        this.dialogueLayer = document.createElement("canvas");
        this.dialogueLayer.id = "dialogue_canvas";
        this.dialogueLayer.width = this.game.cameras.main.width;
        this.dialogueLayer.height = this.game.cameras.main.height;
        this.dialogueLayer.style.position = "absolute";
        this.dialogueLayer.style.top = "0";
        this.dialogueLayer.style.left = "0";
        this.dialogueLayer.style.zIndex = "9999";
        this.dialogueLayer.style.pointerEvents = "none";
        // Start with 0 opacity so we can fade in.
        this.dialogueLayer.style.opacity = "0";
        // CSS transition for opacity changes (fade in/out).
        this.dialogueLayer.style.transition = "opacity 0.5s ease";
        document.body.appendChild(this.dialogueLayer);
        this.viewMaskCtx = this.dialogueLayer.getContext("2d");
    }

    drawDialogue(message) {
        const _x = this.dialogueLayer.width / 2;
        const _y = this.dialogueLayer.height / 2;

        this.viewMaskCtx.clearRect(0, 0, this.dialogueLayer.width, this.dialogueLayer.height);

        this.viewMaskCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.viewMaskCtx.fillRect(0, _y - 60, this.dialogueLayer.width, 100);

        this.viewMaskCtx.font = "30px Arial";
        this.viewMaskCtx.fillStyle = "white";
        this.viewMaskCtx.textAlign = "center";
        this.viewMaskCtx.fillText(message, _x, _y);
    }

    fadeInDialogue() {
        setTimeout(() => {
            this.dialogueLayer.style.opacity = "1";
        }, 100);
    }

    fadeOutAndRemoveDialogue() {
        this.dialogueLayer.style.opacity = "0";
        // Remove the element once the fade-out transition ends.
        this.dialogueLayer.addEventListener("transitionend", () => {
            if (this.dialogueLayer && this.dialogueLayer.parentNode) {
                this.dialogueLayer.parentNode.removeChild(this.dialogueLayer);
            }
        }, {once: true}); // Use { once: true } so the listener is removed automatically.
    }

    updateVisuals(time, delta) {
        const player = this.game.player;
        if (!player || !player.body) return;

        const grounded = player.body.blocked.down;
        const vy = player.body.velocity.y;
        const vx = player.body.velocity.x;
        const moving = Math.abs(vx) > 1;

        // Squash on landing — only when transitioning from airborne to grounded
        // and arriving with a noticeable downward velocity.
        if (grounded && !this.wasGrounded && this.lastAirVy > 60) {
            const intensity = Math.min(1, this.lastAirVy / 220);
            const head = this.game.playerHead;
            // Stop only our own scale tweens — using killTweensOf on the
            // sprite would also kill the spawn-in alpha fade from teleportTo.
            if (this.squashTween) this.squashTween.stop();
            if (this.headSquashTween) this.headSquashTween.stop();
            const stretch = 1 + 0.18 * intensity;
            const squash = 1 - 0.22 * intensity;
            this.squashTween = this.game.tweens.add({
                targets: player,
                scaleX: this.playerBaseScaleX * stretch,
                scaleY: this.playerBaseScaleY * squash,
                duration: 90,
                ease: 'Quad.easeOut',
                yoyo: true,
                onComplete: () => {
                    player.scaleX = this.playerBaseScaleX;
                    player.scaleY = this.playerBaseScaleY;
                }
            });
            this.headSquashTween = this.game.tweens.add({
                targets: head,
                scaleX: this.headBaseScaleX * stretch,
                scaleY: this.headBaseScaleY * squash,
                duration: 90,
                ease: 'Quad.easeOut',
                yoyo: true,
                onComplete: () => {
                    head.scaleX = this.headBaseScaleX;
                    head.scaleY = this.headBaseScaleY;
                }
            });
        }

        // Track peak downward velocity while airborne for landing intensity.
        if (!grounded) {
            this.lastAirVy = Math.max(this.lastAirVy || 0, vy);
        } else {
            this.lastAirVy = 0;
        }
        this.wasGrounded = grounded;

        // Idle head bob — gentle 1px sine when stationary on the ground.
        if (grounded && !moving) {
            this.bobPhase += (delta || 16) * 0.0042;
            const bob = Math.sin(this.bobPhase) * 0.5;
            this.game.playerHead.y = player.body.y + 2.5 + bob;
        } else {
            this.bobPhase = 0;
        }

        // Soft drop shadow — anchored to the last ground position so it
        // stays on the floor while the player jumps, then shrinks and
        // fades as they rise.
        if (this.game.playerShadow) {
            const shadow = this.game.playerShadow;
            if (grounded) {
                this.lastGroundY = player.body.bottom;
            }
            const groundY = this.lastGroundY ?? player.body.bottom;
            shadow.x = player.x;
            shadow.y = groundY + 0.2;
            const airHeight = Math.max(0, groundY - player.body.bottom);
            const t = 1 - Math.min(1, airHeight / 24);
            shadow.scaleX = 0.55 + 0.45 * t;
            shadow.scaleY = 0.55 + 0.45 * t;
            shadow.alpha = 0.08 + 0.27 * t;
        }
    }

    teleportTo(x, y) {
        this.game.player.setAlpha(0);
        this.game.playerHead.setAlpha(0);
        const relativePos = {x: x || this.game.startPoint.x, y: y || this.game.startPoint.y};
        this.game.player.x = relativePos.x;
        this.game.player.y = relativePos.y;
        this.game.playerLight.setPosition(this.game.player.x + this.game.playerSize / 2, this.game.player.y + this.game.playerSize / 2);
        this.game.playerLightFaux.setPosition(this.game.player.x + this.game.playerSize / 2, this.game.player.y + this.game.playerSize / 2);
        this.game.freezePlayer = true;
        this.game.cameras.main.stopFollow();
        this.game.cameras.main.setScroll(relativePos.x, relativePos.y);
        this.game.cameras.main.startFollow(this.game.player);
        this.game.freezePlayer = false;
        window.setTimeout(() => {
            this.game.tweens.add({
                targets: [this.game.player, this.game.playerHead],
                alpha: 1,
                duration: 1000,
                ease: 'ease-out'
            });
        }, 100);
    }
}