export default class PlayerManager {
    constructor(scene) {
        this.game = scene;
        this.game.startPoint = {x: 1500, y: 180};
        let x = this.game.playerX || this.game.startPoint.x;

        let y = this.game.playerY || this.game.startPoint.y;
        this.game.anims.create({
            key: 'walk',
            frames: this.game.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1  // Loop indefinitely
        });

        // Create the player sprite
        this.game.player = this.game.physics.add.sprite(x, y, 'player');

        this.game.player.setBounce(0.2);
        this.game.player.setOrigin(0, 0);
        this.game.player.maxHealth = 100;
        this.game.player.maxEnergy = 100;
        this.game.player.maxBreath = 100;
        this.game.player.maxHitPower = 100;
        this.game.player.health = this.game.player.maxHealth;
        this.game.player.energy = this.game.player.maxEnergy;
        this.game.player.breath = this.game.player.maxBreath;
        this.game.player.hitPower = this.game.player.maxHitPower;
        this.game.player.setDisplaySize(this.game.playerSize, this.game.playerSize);
        this.game.playerLight = this.game.lightingManager.addLight(this.game.player.x, this.game.player.y, this.game.playerSize * 8, 1, this.game.lightColors[1], false);
        this.game.playerLight.off = true;
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
            this.returnToBaseCamp();
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

    returnToBaseCamp() {
        this.game.player.setAlpha(0);
        const relativePos = {x: this.game.startPoint.x, y: this.game.startPoint.y};
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
                targets: [this.game.player],
                alpha: 1,
                duration: 1000,
                ease: 'ease-out'
            });
        }, 100);
    }
}